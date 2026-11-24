"""Check native captions, with an optional smoke test against real YouTube embeds."""

import argparse
import json
import re
import subprocess
import time

from harness import BASE, OUT, ROOT, SCREENSHOTS, browser, js, server, shot

CAPTIONS = 'button[aria-label="Captions"]'
YOUTUBE_EMBEDS = "https://www.youtube.com/*"


def wait_for(expression):
    browser("wait", "--fn", expression)


def seek(seconds):
    js(f"document.querySelector('video').currentTime = {seconds}")
    wait_for(
        f"""(() => {{
          const video = document.querySelector('video');
          return !video.seeking && Math.abs(video.currentTime - {seconds}) < 0.25;
        }})()"""
    )


def expect_caption(line):
    wait_for(
        f"""Array.from(document.querySelector('video').textTracks[0].activeCues ?? [])
          .some(cue => cue.text.includes({json.dumps(line)}))"""
    )


def native_captions():
    browser("set", "viewport", "1280", "800")
    wait_for("""!!document.querySelector('button[aria-label="Play"]')""")
    browser("click", 'button[aria-label="Play"]')
    wait_for("""!!document.querySelector('button[aria-label="Pause"]')""")
    browser("click", 'button[aria-label="Pause"]')
    wait_for("document.querySelector('video').paused")

    assert js(f"document.querySelector({json.dumps(CAPTIONS)}).ariaPressed") == "false"
    browser("click", CAPTIONS)
    wait_for("document.querySelector('track').readyState === 2")

    seek(12.5)
    expect_caption("land of the Gatekeepers")
    seek(39)
    expect_caption("A dangerous quest for a lone hunter.")
    seek(42)
    expect_caption("I've been alone for as long as I can remember.")
    seek(39)
    expect_caption("A dangerous quest for a lone hunter.")
    shot("player-lab-caption-on")

    browser("click", CAPTIONS)
    wait_for("document.querySelector('video').textTracks[0].mode === 'disabled'")
    assert js(f"document.querySelector({json.dumps(CAPTIONS)}).ariaPressed") == "false"
    shot("player-lab-caption-off")
    if SCREENSHOTS:
        compare_caption_pixels()

    browser("click", CAPTIONS)
    expect_caption("A dangerous quest for a lone hunter.")
    print("PASS native captions at 0:12, 0:39 and 0:42, including off/on while paused")


def compare_caption_pixels():
    # Native video cues paint into the frame. They do not appear in the page DOM.
    crop = js("""(() => {
      const box = document.querySelector('video').getBoundingClientRect();
      const scale = devicePixelRatio;
      return {
        left: Math.ceil(box.left * scale),
        top: Math.ceil((box.top + box.height * 2 / 3) * scale),
        width: Math.floor(box.width * scale) - 2,
        height: Math.floor(box.height * scale / 3) - 2,
      };
    })()""")
    subprocess.run(
        [
            "node",
            "-e",
            """
            const assert = require("node:assert/strict");
            const sharp = require("sharp");
            const [on, off, cropJson] = process.argv.slice(1);
            const crop = JSON.parse(cropJson);
            Promise.all([on, off].map(path => sharp(path).extract(crop).raw().toBuffer()))
              .then(([showing, hidden]) => {
                assert.equal(showing.length, hidden.length);
                let changed = 0;
                for (let i = 0; i < showing.length; ++i) {
                  if (Math.abs(showing[i] - hidden[i]) > 32) changed++;
                }
                assert(changed > 200, "The video did not visibly render captions");
              })
              .catch(error => { console.error(error); process.exitCode = 1; });
            """,
            str(OUT / "player-lab-caption-on.png"),
            str(OUT / "player-lab-caption-off.png"),
            json.dumps(crop),
        ],
        cwd=ROOT,
        check=True,
        timeout=15,
    )


def youtube_captions():
    for video_id, title, start, expected in [
        ("HOfdboHvshg", "Durian Open Movie Project", 36, "dangerous quest"),
        ("iCvmsMzlF7o", "The Power of Vulnerability", 16, "an event planner"),
    ]:
        # Use the lab's real iframe and its referrer policy. Select English and
        # start close to dialogue so the check is independent of watch history.
        js(f"""(() => {{
          const iframe = document.querySelector('iframe');
          iframe.src = new URL('/embed/{video_id}?start={start}&hl=en&cc_lang_pref=en&cc_load_policy=1&playsinline=1&rel=0', iframe.src);
          iframe.scrollIntoView({{block: 'center'}});
        }})()""")
        deadline = time.monotonic() + 15
        play = None
        while time.monotonic() < deadline:
            snapshot = browser("snapshot", "-i")
            if title in snapshot["snapshot"]:
                play = next(
                    (
                        ref
                        for ref, node in snapshot["refs"].items()
                        if node.get("name") == "Play video"
                    ),
                    None,
                )
                if play:
                    break
            time.sleep(0.25)
        assert play, f"YouTube play button did not load for {title}"
        browser("click", "@" + play)

        # Cross-origin captions appear as text below the player in the browser's
        # accessibility tree. YouTube may split an automatic cue into words.
        deadline = time.monotonic() + 18
        while time.monotonic() < deadline:
            snapshot = browser("snapshot")["snapshot"]
            cue = re.search(
                r'generic "YouTube Video Player"\n\s+- group\n((?:\s+- StaticText [^\n]+\n)+)',
                snapshot,
            )
            if cue:
                caption = " ".join(re.findall(r'StaticText "([^"]+)"', cue[1]))
                caption = " ".join(caption.lower().split())
                if expected in caption:
                    print(f"PASS real YouTube playback and captions for {title}")
                    break
            time.sleep(0.25)
        else:
            raise AssertionError(f"YouTube did not render '{expected}' for {title}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", action="store_true", help="also check real YouTube embeds")
    args = parser.parse_args()

    with server():
        browser("network", "route", YOUTUBE_EMBEDS, "--abort")
        browser("open", BASE + "/lab/player")
        native_captions()
        if args.live:
            browser("network", "unroute", YOUTUBE_EMBEDS)
            youtube_captions()
