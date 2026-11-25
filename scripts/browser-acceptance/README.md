# Browser acceptance fixtures

Run from the repository root with Node, Python 3, pnpm dependencies, and
`agent-browser` with Chrome installed:

```sh
pnpm build
python3 scripts/browser-acceptance/fixtures.py
```

The script starts an isolated production server on `127.0.0.1:3100`, refuses
an occupied port, and uses a PID-named browser session. Each server phase has
an eight-minute limit; browser commands have 40-second limits. Cleanup closes
only its own session and server, including when a check fails or is interrupted.
Exit status is nonzero for failed assertions or an interrupted batch.

Screenshots and `fixture-results.json` go to `.next/browser-acceptance/`, which
is created at runtime. `BROWSER_ACCEPTANCE_OUT` overrides the output directory;
`BROWSER_ACCEPTANCE_PORT` overrides the port. Avoid concurrent runs sharing an
output directory. The script does not build automatically: rebuild after source
changes. Results record the build ID, source digest, Git HEAD and CLI version.
Set `BROWSER_ACCEPTANCE_SCREENSHOTS=0` for a nonvisual diagnostic run if Chrome's
capture command is unavailable; results explicitly record that captures were disabled.
`BROWSER_ACCEPTANCE_HEADED=1` opens an isolated visible browser instead of headless Chrome.

The September 27 run with Chrome 147 / agent-browser 0.38.1 did not complete:
headless rendering stopped delivering animation frames after resizing; the headed
run passed 11 checks, including Back selection and pending navigation, then timed
out waiting for the mobile menu to close and restore focus. Treat an interrupted
batch as incomplete, not a pass. The migration verification note records separate
checks and screenshots from the earlier run.

## Coverage and evidence limits

The suite covers navigation/pending state, player readiness and lifecycle,
Back/Forward selection, watched-history migration, feed errors, duration
boundaries, redirects, HTTP 404s, rendered metadata/assets, light/dark themes,
short portrait/landscape viewports and resizing across the 993px breakpoint.

The preload intercepts server-side YouTube fetches **before Next's cache** and
supplies synthetic feeds. The browser uses an instrumented, visibly labelled
player double. These checks do **not** validate API credentials, quotas, cache
behavior, real playback, fullscreen or playback-position continuity. Missing
configuration runs in a separate server phase with an empty server-only key.
Analytics scripts/collection are blocked in the fixture browser. Thumbnail
requests may still reach YouTube's image CDN; this is not an offline suite.

Screenshots are review evidence, not pixel-diff assertions. Viewport probes use
headless desktop Chrome resizing, not physical phones or touch emulation.
Review the JSON assertions alongside screenshots; keep real-feed/live-baseline
captures separate from fixtures. Build success alone is not browser acceptance.

## Player lab captions

After `pnpm build`, run `python3 -B scripts/browser-acceptance/player_lab.py`
to check captions against the lab's bundled Sintel trailer. The test seeks to
0:12, 0:39 and 0:42, then turns captions off and back on while paused. It
compares the video pixels at 0:39 with captions on and off.

Pass `--live` to also start two real YouTube embeds and verify English caption
text in the browser. The live checks use Blender's Sintel trailer and TED's
The Power of Vulnerability. They require network access to YouTube.

`pnpm test` checks the late dialogue and music cues in the bundled WebVTT file.

## Direct YouTube playback

`/lab/player/direct` resolves an MP4 for either of the two lab videos. Set
`PLAYER_LAB_YT_DLP` to the absolute path of a recent yt-dlp executable with the
[YouTube JavaScript solvers](https://github.com/yt-dlp/yt-dlp/wiki/EJS) on the
Next.js host and restart the server to enable it. The resolver returns a fresh
URL in JSON. Chrome makes the media requests directly to YouTube.

Choose a starting clip, click **Resolve video**, then play it. **Up next**
shows how much of the next clip's opening is buffered. At **5+s buffered**,
click **Next** or let the clip finish. The lab displays the time to the first
frame and the buffer at the time of the switch.

Run the live check after `pnpm build`.

```sh
PLAYER_LAB_YT_DLP="$(command -v yt-dlp)" python3 -B scripts/browser-acceptance/player_direct.py
```

The check requires Chrome and network access to YouTube. It verifies decoded
audio and video, seeking, and a browser request to `googlevideo.com` for both
clips. It checks that **Next** and automatic advance play the exact element
that already buffered five seconds. It also skips before playback to exercise
a cold start. YouTube can reject a URL after resolution. The test reports
failed attempts and tries a fresh URL.

### On-device resolver

Run Docker Compose on the device running Chrome. Set `WALNUT_LAB_ORIGIN` to
the scheme, host, and port of the lab page.

```sh
export WALNUT_LAB_ORIGIN=https://lab.example.com
docker compose -f scripts/player-resolver/compose.yaml up --build -d
```

Open `/lab/player/direct` over HTTPS, check **Use local resolver**, and click
**Resolve video**. Allow **Apps on device** when Chrome asks. The container
publishes its resolver at `127.0.0.1:3219` and accepts requests from the
configured origin. Run the same Compose command with `down` in place of
`up --build -d` to stop it.

To test local mode against the build on the same machine, run these commands.
The test checks that the browser calls the loopback resolver and requests
the media from YouTube.

```sh
WALNUT_LAB_ORIGIN=http://127.0.0.1:3100 docker compose -f scripts/player-resolver/compose.yaml up --build -d
python3 -B scripts/browser-acceptance/player_direct.py --local
```
