"""Test that Chrome can play and seek real YouTube MP4s in the direct lab."""

import os

from harness import BASE, browser, js, server

VIDEOS = [("HOfdboHvshg", "Sintel trailer", 39), ("iCvmsMzlF7o", "TED talk", 60)]


def direct_playback(video_id, title, seek_to):
    browser("select", "select", video_id)
    for attempt in range(1, 4):
        browser("click", "main button[type=submit]")
        browser(
            "wait",
            "--fn",
            """!!document.querySelector('main button[type=submit]:enabled') &&
               (document.querySelector('video')?.readyState >= 2 ||
                document.querySelector('video')?.error ||
                !document.querySelector('video'))""",
        )
        if js("document.querySelector('video')?.readyState >= 2"):
            break
        error = js("document.querySelector('main [role=status]').textContent")
        print(f"{title}, attempt {attempt}: {error}", flush=True)
    else:
        raise AssertionError(f"Could not load YouTube media for {title}")

    browser("focus", "video")
    browser("press", "Space")
    browser(
        "wait",
        "--fn",
        """(() => {
          const video = document.querySelector('video');
          return video.currentTime > 0.5 &&
            video.getVideoPlaybackQuality().totalVideoFrames > 0 &&
            video.webkitAudioDecodedByteCount > 0;
        })()""",
    )
    js(f"document.querySelector('video').currentTime = {seek_to}")
    browser(
        "wait",
        "--fn",
        f"""(() => {{
          const video = document.querySelector('video');
          return !video.seeking && video.currentTime > {seek_to} + 0.25;
        }})()""",
    )
    assert js("""(() => {
      const source = new URL(document.querySelector('video').currentSrc);
      return source.hostname.endsWith('.googlevideo.com') &&
        performance.getEntriesByType('resource').some(entry => entry.name === source.href);
    })()"""), "Chrome did not request the YouTube media directly"
    print(f"PASS {title} decoded video and audio and seeked to {seek_to}s", flush=True)


if __name__ == "__main__":
    if not os.environ.get("PLAYER_LAB_YT_DLP"):
        raise SystemExit("Set PLAYER_LAB_YT_DLP to the path to yt-dlp before running.")

    with server():
        browser("open", BASE + "/lab/player/direct")
        for video in VIDEOS:
            direct_playback(*video)
