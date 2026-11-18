# Agent Note: Hosted browser acceptance on d0ff4b7

Status: implemented — U2, U3, B1, B3 and B5 pass on real feeds; B0 pairs captured with differences listed

## Problem

The local fixture suite (66/66 on `631a2f4`) runs on synthetic feeds and a
player double. It cannot show real routing against live feeds, real YouTube
player behavior, or how the new app looks next to the legacy site. U2, U3, B0,
B1, B3 and B5 needed that hosted evidence.

## Decision

Tested on 2026-11-17:

- New app: <https://walnut-tv-git-dev-gianpaj.vercel.app>, `dev` at `d0ff4b7`
  (app code identical to `631a2f4`). Assets carry deployment
  `dpl_DeysBqtRK8Y9Mb7XCieupuTKG7AF`.
- Legacy app: <https://walnut.tv> (Vue 1 production). Google Tag Manager,
  Google Analytics and Firebase requests were aborted in the browser; their
  resource entries show status 0.
- Browser: agent-browser 0.38.1, HeadlessChrome 154 on Linux, viewport resized
  with `set viewport`, not device emulation.

Measurements per check are in [results.json](./results.json). Fixture-only
cases (D1 failure states, delayed IFrame readiness) were not repeated. L1
playback through resizes was already recorded in
[the hosted checks note](../2026-11-17-hosted-checks.md).

### B1 routing: pass

- `/hustle`, `/ai`, `/crypto` load 68, 104 and 83 videos and rewrite to
  `/{category}/{firstId}`. `/` answers 307 to `/hustle`. `/does-not-exist` and
  `/nope/abc` answer 404.
- `/hustle/G7ZGjRebxUU` and `/hustle?v=G7ZGjRebxUU` select row 15. An ID not
  in the feed (`AAAAAAAAAAA`) falls back to the first video in both shapes.
  The `?v=` shape keeps the query: `/hustle/G7ZGjRebxUU?v=G7ZGjRebxUU`.
- Reload after three Next clicks keeps `/hustle/ng7zKKp60Q4`, row 4.
- Navbar AI from hustle row 7, select AI row 3, Back restores hustle row 7 and
  its player video, Forward restores AI row 3.
- The logo navigates client-side to `/hustle/FmvRhxq2oHE`.

### B3 controls with the real player: pass

- Play/pause through the IFrame API and through YouTube's own controls: the
  Play button, then clicks on the video surface toggled state 2 → 1 → 2. The
  Pause and fullscreen buttons are covered by YouTube's overlay until the
  pointer hovers the player.
- Fullscreen works in headless Chrome: after a hover, YouTube's fullscreen
  button made the iframe the fullscreen element at 1440 px. Escape exits.
  See [b3-fullscreen-1440.png](./b3-fullscreen-1440.png).
- Prev is disabled at 1/68 and Next at 68/68; clicks and arrow keys do
  nothing there. Arrow keys move the selection outside inputs and are ignored
  inside an injected `<input>`.
- The title links to `https://www.youtube.com/watch?v=<id>` in a new tab.
- End of video: `/hustle/LPKLhoS4kN8` was muted, played and sought to
  `duration - 2`. It reached state 0 at 1799.12 s; URL and selection were
  unchanged five seconds later.
- A real player error, triggered with `loadVideoById('aaaaaaaaaaa')`, skipped
  to row 2 and cued it. The feed had no real blocked video to test.

### U2 list scrolling: pass

- Desktop 1440×900, `/hustle/G3i2k6DdI0o` (row 33): the list was scrolled so
  the active row sat above the viewport. Previous moved to row 32 and scrolled
  only the list (`scrollTop` 3304 → 3073), aligning the row to the list top.
  `window.scrollY` stayed 0 and no other element scrolled.
  See [u2-desktop-after-previous.png](./u2-desktop-after-previous.png).
- Mobile 390×844: the same deep link, Next, Prev and arrow keys left
  `scrollY` at 0. With the page scrolled to 1500, ArrowLeft left it at 1500.

### U3 mobile menu: pass

At 390×844, one Tab focuses "Open navigation menu" and Enter opens the sheet
with focus on Close. Tab to AI and Enter: the dialog was gone within 300 ms,
the URL was `/ai/8fNfcx25q24` within 1 s, and focus was on the trigger. Space
also opens; Escape closes and returns focus to the trigger.
See [u3-menu-open-390.png](./u3-menu-open-390.png) and
[u3-after-keyboard-select-ai-390.png](./u3-after-keyboard-select-ai-390.png).

### B5 presentation: pass

Deep link `/hustle/wOib5fHqOZQ` (row 3) after selecting rows 1 and 2, dark and
light theme, at four viewports (`b5-new-{theme}-{viewport}.png`). Every case
has one iframe, a 5 px yellow marker on the active row, watched rows at 50 %
image opacity with a WATCHED badge, an undimmed active row and no horizontal
overflow.

| Viewport | Layout  | Player, title, Prev/Next in first screen | Active row in first screen |
| -------- | ------- | ---------------------------------------- | -------------------------- |
| 1440×900 | sidebar | yes                                      | yes                        |
| 390×844  | stacked | yes                                      | yes                        |
| 390×568  | stacked | yes                                      | no, below the controls     |
| 844×390  | stacked | player only; title and controls scroll   | no                         |

Light theme is reachable only through `localStorage.theme`. The toggle is
commented out, and with `prefers-color-scheme: light` the app still renders
dark (`defaultTheme="dark"`). The legacy site is dark only.

### B0 paired screenshots: captured, differences below

| State                       | Legacy                                                                       | New                                                                                |
| --------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Loaded, 1440×900            | [b0-legacy-1440-loaded-dark.png](./b0-legacy-1440-loaded-dark.png)           | [b0-new-1440-loaded-dark.png](./b0-new-1440-loaded-dark.png)                       |
| Selected + watched 1440×900 | [b0-legacy-1440-selected-watched.png](./b0-legacy-1440-selected-watched.png) | [b0-new-1440-selected-watched.png](./b0-new-1440-selected-watched.png)             |
| Selected + watched 390×844  | [b0-legacy-390-selected-watched.png](./b0-legacy-390-selected-watched.png)   | [b0-new-390-selected-watched-dark.png](./b0-new-390-selected-watched-dark.png)     |
| Menu open, 390×844          | [b0-legacy-390-menu-open.png](./b0-legacy-390-menu-open.png)                 | [dark](./b0-new-390-menu-open-dark.png), [light](./b0-new-390-menu-open-light.png) |

Both selected states show `FmvRhxq2oHE` watched and `ng7zKKp60Q4` active. The
legacy pair has a second watched row, `h_aA1-R70E8`: legacy marks its first
video watched on load, and that video is not in the new feed.

Feed differences, not UI: legacy hustle has 62 videos, new has 68, 61 shared.
Legacy leads with `h_aA1-R70E8` (a16z), which the new feed lacks; the new feed
has seven videos legacy lacks, including `LPKLhoS4kN8` and `wOib5fHqOZQ`.
`dev` deliberately drops three channels that `master` lists: hustle
`UCfRtwc6K_VU9N4OjNnU2P7g` and ai `UCxRU9z5Jm-r11oQpYFtNQ8g` have no public
videos, and crypto `UCdzMx7Zhy5va5End1-XJFbA` no longer exists. Whether the missing a16z video is cache age was not determined.

UI differences, all visible in the pairs:

- Desktop logo renders 32×48 px against legacy's 15×50; category links are
  filled pills, not plain text.
- New adds a bold title, Prev/Next with a counter and a footer under the
  player on desktop. Legacy has no visible controls on desktop.
- Watched rows: dimmed image and yellow badge, against legacy's small grey
  label and dimmed title.
- Mobile shows the list with thumbnails below the player; legacy shows no list,
  only pixel prev/next arrows. Recorded earlier in the
  [parity verification note](../2026-09-27-parity-verification.md).
- Mobile menu: a left sheet whose three links are spread over the full screen
  height (a grid sized to `100svh`), against legacy's compact dropdown.
- Selection writes `/{category}/{id}`; legacy stays at `/`. Opening
  `/hustle?v=X` leaves a redundant `?v=`: `/hustle/X?v=X`.
- Light theme is reachable only through `localStorage.theme`; legacy is dark
  only.

None blocks use. The owner decided on 2026-11-17: keep the app dark only, drop
the redundant `?v=`, keep updating the URL on selection for sharing, and match
legacy visually everywhere else, keeping the mobile list below the player and
removing the desktop Prev/Next, counter and footer.

## Alternatives considered

- **Headed Chrome.** Earlier runs stalled headless animations, so headed was
  the fallback. Headless completed every step here, including the menu close
  and fullscreen, so it was not needed.
- **Mobile device emulation** (`set device`) instead of viewport resizing.
  Resizing matches the fixture suite and the earlier L1 run; touch input and
  real mobile browsers remain untested.

## Consequences

- U2 and U3 have the stable-browser confirmation the plan asked for. B1, B3
  and B5 have hosted real-feed evidence on the reviewed code.
- Open: a real blocked or private video in a live feed (only a synthetic
  player error was tested); touch and physical-device behavior; a legacy
  short-viewport and landscape pair; loading, empty and error pairs against
  legacy.
- B0 stays open until the legacy visual parity change lands and the pairs
  are captured again.
- The light theme has no user entry point, so its screenshots document an
  unreachable state.
