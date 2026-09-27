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
short portrait/landscape viewports and resizing across 768px.

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
