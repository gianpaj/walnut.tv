"""Test playback, seeking, and buffered handoffs with real YouTube MP4s."""

import argparse
import os
import re
from contextlib import closing
from http.client import HTTPConnection

from harness import BASE, browser, js, server

VIDEOS = [("HOfdboHvshg", "Sintel trailer", 39), ("iCvmsMzlF7o", "TED talk", 60)]
NEXT = "main form button[type=button]"


def local_boundary(origin):
    def request(headers, method="GET"):
        with closing(HTTPConnection("127.0.0.1", 3219, timeout=3)) as connection:
            connection.request(method, "/resolve?id=unknown", headers=headers)
            response = connection.getresponse()
            return response.status, response.getheader("Access-Control-Allow-Origin")

    assert request({"Origin": origin}) == (400, origin)
    assert request({"Origin": origin}, "POST") == (405, origin)
    assert request({}) == (403, None)
    assert request({"Origin": "https://example.com"}) == (403, None)
    assert request({"Origin": origin, "Host": "example.com:3219"}) == (403, None)


def direct_playback(video_id, title, seek_to, *, local=False):
    browser("select", "select", video_id)
    for attempt in range(1, 4):
        browser("click", "main button[type=submit]")
        browser(
            "wait",
            "--fn",
            """!!document.querySelector('main button[type=submit]:enabled') &&
               (document.querySelector('video[controls]')?.readyState >= 2 ||
                document.querySelector('video[controls]')?.error ||
                !document.querySelector('video[controls]'))""",
        )
        if js("document.querySelector('video[controls]')?.readyState >= 2"):
            break
        error = js("document.querySelector('main [role=status]').textContent")
        print(f"{title}, attempt {attempt}: {error}", flush=True)
    else:
        raise AssertionError(f"Could not load YouTube media for {title}")

    assert js("!document.querySelector('video:not([controls])').hasAttribute('src')")
    browser("focus", "video[controls]")
    browser("press", "Space")
    browser(
        "wait",
        "--fn",
        """(() => {
          const video = document.querySelector('video[controls]');
          return video?.currentTime > 0.5 &&
            video.getVideoPlaybackQuality().totalVideoFrames > 0 &&
            video.webkitAudioDecodedByteCount > 0;
        })()""",
    )
    js(f"document.querySelector('video[controls]').currentTime = {seek_to}")
    browser(
        "wait",
        "--fn",
        f"""(() => {{
          const video = document.querySelector('video[controls]');
          return !video.seeking && video.currentTime > {seek_to} + 0.25;
        }})()""",
    )
    assert js("""(() => {
      const source = new URL(document.querySelector('video[controls]').currentSrc);
      return source.hostname.endsWith('.googlevideo.com') &&
        performance.getEntriesByType('resource').some(entry => entry.name === source.href);
    })()"""), "Chrome did not request the YouTube media directly"
    if local:
        assert js(f"""performance.getEntriesByName(
          'http://127.0.0.1:3219/resolve?id={video_id}'
        ).some(entry => entry.initiatorType === 'fetch') &&
        !performance.getEntriesByType('resource').some(entry =>
          new URL(entry.name).pathname === '/lab/player/direct/resolve'
        )"""), "Chrome must resolve using only the loopback endpoint"
    print(f"PASS {title} decoded video and audio and seeked to {seek_to}s", flush=True)


def buffered_handoff(trigger):
    browser(
        "wait",
        "--fn",
        """(() => {
          const video = document.querySelector('video:not([controls])');
          return video?.paused && video.buffered.length > 0 &&
            video.buffered.start(0) === 0 && video.buffered.end(0) >= 5;
        })()""",
    )
    js("""(() => {
      const active = document.querySelector('video[controls]');
      const warm = document.querySelector('video:not([controls])');
      const handoff = { active, warm, url: warm.currentSrc, ended: false };
      window.handoffTest = handoff;
      active.addEventListener('ended', () => handoff.ended = true, { once: true });
    })()""")

    if trigger == "Next":
        browser("click", NEXT)
    else:
        js("window.handoffTest.active.currentTime = window.handoffTest.active.duration - 0.4")

    browser(
        "wait",
        "--fn",
        """(() => {
          const { active, warm, url } = window.handoffTest;
          return active.paused && warm.controls && !warm.paused && warm.currentSrc === url &&
            warm.currentTime > 0.35 && warm.getVideoPlaybackQuality().totalVideoFrames > 0 &&
            warm.webkitAudioDecodedByteCount > 0;
        })()""",
    )
    assert js("window.handoffTest.ended") == (trigger == "Automatic")
    assert js("new URL(window.handoffTest.warm.currentSrc).hostname.endsWith('.googlevideo.com')")
    status = js("""[...document.querySelectorAll('main p')]
      .map(p => p.textContent).find(text => text.includes('ms to first frame'))""")
    timing = re.fullmatch(r"(Next|Automatic) · (\d+) ms to first frame · (\d+(?:\.\d+)?)s buffered", status or "")
    assert timing and timing[1] == trigger and float(timing[3]) >= 5, status
    print(f"PASS {trigger} used the warmed YouTube element ({timing[2]} ms, {timing[3]}s buffered)", flush=True)
    return int(timing[2])


def cold_skip():
    browser("select", "select", VIDEOS[0][0])
    browser("click", "main button[type=submit]")
    browser("wait", "--fn", f"document.querySelector('{NEXT}').matches(':enabled')")
    assert js("!document.querySelector('video:not([controls])').hasAttribute('src')")
    browser("click", NEXT)
    browser(
        "wait",
        "--fn",
        """[...document.querySelectorAll('main p')].some(
             p => p.textContent.startsWith('Now playing · The Power of Vulnerability')) &&
           (document.querySelector('video[controls]')?.currentTime > 0.35 ||
            document.querySelector('main [role=status]').textContent === 'Press play to continue.')""",
    )
    if js("document.querySelector('main [role=status]').textContent") == "Press play to continue.":
        browser("focus", "video[controls]")
        browser("press", "Space")
    browser(
        "wait",
        "--fn",
        """(() => {
          const video = document.querySelector('video[controls]');
          return video?.currentTime > 0.35 &&
            video.getVideoPlaybackQuality().totalVideoFrames > 0 &&
            video.webkitAudioDecodedByteCount > 0;
        })()""",
    )
    print("PASS Next resolved and played the following video without a preloaded source", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--local", action="store_true", help="Use the running Docker resolver.")
    args = parser.parse_args()
    if args.local:
        local_boundary(BASE)
    elif not os.environ.get("PLAYER_LAB_YT_DLP"):
        raise SystemExit("Set PLAYER_LAB_YT_DLP to the path to yt-dlp before running.")

    with server():
        browser("open", BASE + "/lab/player/direct")
        assert js("document.querySelectorAll('video').length === 2 && !document.querySelector('iframe')")
        if args.local:
            browser("check", "main input[type=checkbox]")
        for video in VIDEOS:
            direct_playback(*video, local=args.local)
        buffered_handoff("Next")
        buffered_handoff("Automatic")
        cold_skip()
