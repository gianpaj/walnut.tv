# Migration fixes and local verification

## Scope and decisions

Code revision: `aaf651d75933b16532150a3478835762185a1b58`.
Release status remains **blocked**; local verification is not host acceptance.

- R2 uses a root-only Next proxy to decode the legacy SPA query before the
  default redirect. Raw escapes are preserved; unsafe destinations go to Hustle.
  A root config redirect would run too early. Retired categories still go home.
- D1 returns allowlisted issue codes alongside successful videos. Empty results
  are not quota failures; partial feeds retain playable results. Raw upstream
  errors and request URLs are not exposed. Cache durations are unchanged.
- D2 accepts optional duration components and rejects malformed strings. Videos
  of 120 seconds or less remain excluded; four candidates are fetched per source.
- Navigation uses a client transition, not route-level Suspense. It names the
  destination and pauses the old player, preserving HTTP 404 responses.
- Selection is local state initialized/restored from the actual history URL.
  Cached page props must not overwrite a selection on Back. URL updates preserve
  query/fragment data and avoid redundant or departing-route writes.
- Desktop scrolling targets only the list viewport; its height accounts for the
  header. Mobile selection does not scroll the document. The menu has a name.
- The player waits for `onReady`, then cues the latest selection. Its replaceable
  target sits inside a stable React host. API-load failure has a visible message.
- Route metadata inherits social defaults. Reddit pages allow crawling but set
  `noindex, follow`; the sitemap contains configured categories, not the redirecting root.

Source ordering, Reddit vote semantics and resizable-layout/position-continuity
policy remain undecided. No new cache service, runtime fixture switch or streaming
boundary was introduced. Reddit remains disabled.

## Verification

Environment: macOS, Node 24.9.0, Next 16.2.12, Chrome 147,
`agent-browser` 0.38.1; isolated production server at `http://127.0.0.1:3100`.

- Frozen-lockfile install, channel validation, typecheck, Oxlint, **137 tests**
  and production build passed. The UI detector reported no findings.
- Real feeds loaded: Hustle 74, AI 112, Crypto 81. AI showed a partial-fetch
  notice. Counts are time-dependent, not assertions of complete source coverage.
- Real YouTube Play advanced beyond two seconds; pause and fullscreen worked.
  This does not verify every removed/private video or a full video's end.
- Initial fixture batch: 40/42 checks passed. It exposed Back selection reset
  and a desktop row clipped below the viewport; both received targeted fixes.
  The batch covered player readiness/error/end callbacks, all four storage seeds,
  feed states, duration boundaries, redirects/404s, and rendered metadata/assets.
- Confirmation build `Qu_F7W-9l2ePfgG9TMiTN`, source SHA-256
  `a167ebea3d06de513fb17add4f66133ec5a9c5fc1990df7c459fdd4477d9f784`:
  **11 headed checks passed**, including Back/Forward selection, watched-store
  restoration, paused pending navigation and desktop/mobile scroll containment.
  [Results](./2026-09-27-parity-verification/confirmation-results.json) record the
  incomplete batch, not a passing suite.
- Headless runs stopped advancing animation frames after resizing, despite a
  visible/focused document and successful network/evaluation calls. Headed mode
  progressed further, then timed out waiting for menu-close/focus restoration.
  The full suite, short-viewport/theme matrix and final visual confirmation remain open.

The repeatable [fixture harness](../../../../scripts/browser-acceptance/README.md)
uses synthetic server responses and a labelled player double. It cannot measure
real quotas, caches or playback. It closes its own server and browser session.

## Screenshot evidence and differences

Evidence is in [this directory](./2026-09-27-parity-verification/).
Screenshots use initial build `H8wuVktzSug_RF8Lifjsh` (base `ea2d246` plus the
migration edits), **before** the final Back and desktop-height fixes.

| State                     | Local file                              | Live `https://walnut.tv` file     | Viewport |
| ------------------------- | --------------------------------------- | --------------------------------- | -------- |
| Same Hustle video, loaded | `local-real-hustle-desktop-settled.png` | `live-hustle-desktop-settled.png` | 1440×900 |
| Same Hustle video, loaded | `local-real-hustle-mobile-settled.png`  | `live-hustle-mobile-settled.png`  | 390×844  |

The images were inspected. Next has heavier type, a narrower resizable desktop
list, explicit prev/next buttons, and a mobile list below the player. The legacy
mobile player has different sizing and did not show its thumbnail in the paired
capture. These are review differences, not accepted product decisions.

`fixture-pending-ai-desktop.png`, `fixture-feed-empty.png` and
`fixture-feed-quota.png` demonstrate synthetic states, not live parity.
`local-real-mobile-menu.png` captures an unfinished opening animation; it is
**blocked evidence**, not an acceptable menu screenshot. Active-highlight and
watched-row visual parity also need a stable-browser confirmation. No B0 sign-off.

## Deployment and release blockers

PR head inspected: `2e48f0e4e0ee33ef22a9b8fcedcb2acfaddd6d0b`.

- Netlify preview `/`, `/hustle`, `/ai`, `/crypto`: generic HTTP 404 despite a
  successful status. Deployment `6ab937c43b22e30008df9326` reports no generated pages.
  Build/publish/runtime settings need inspection; exact cause is unconfirmed.
- Vercel deployment `AJs1XvHeA7SXN11CQgjEEmBLEtP4`: canceled by its Ignored Build
  Step. The dev alias points to a February 2024 deployment and requires login.
- Choose the preview host before changing shared hosting settings. Deployment-host
  credentials, cache sharing/quota, analytics property selection and exclusion of
  preview traffic, cutover and rollback remain unverified.
- Local analytics requests reached both configured properties during diagnostic
  visits. Fixture entry-point runs block analytics scripts. This is not GA4
  realtime verification; filtering nonproduction traffic remains an L5 gate.

No deployment settings, shared Portless state or public origin were changed.
No push or cutover was performed; the requested completion/verification gate is unmet.
