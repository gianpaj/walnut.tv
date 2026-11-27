# Agent Note: Hosted parity recheck on b12bdd8

Status: implemented — B0 and B5 pass on the legacy look; L6 passes on `b12bdd8` and `23e8bae`

## Problem

The [legacy visual parity change](../2026-11-17-legacy-visual-parity.md)
replaced the layout that the
[first hosted run](../2026-11-17-hosted-browser-acceptance/README.md) had
captured. B0 needed fresh pairs against walnut.tv, B5 needed its layout checks
on the new layout, and L6 needed a rerun on the release revision.

## Decision

Tested on 2026-11-18.

- **Tested revision:** `dev` at `b12bdd8`, the merge of the parity change.
- **New app:** <https://walnut-ntrl6f6po-gianpaj.vercel.app>.
  - Preview deployment `dpl_4kCJdRWYaf5RrxHSs3kWhQvFT6cY`, built from `3d1b376`.
  - `3d1b376` and `b12bdd8` differ only in docs and screenshots.
  - The Production build of `b12bdd8` failed on Vercel: Turbopack could not
    resolve the Open Sans `next/font/google` module. The next `dev` build,
    `ceb562f`, restored the same cache and succeeded, so the cache was not the
    cause. A failed font download from Google during the build fits the
    error. It builds locally, both from a clean clone and on top of
    `82022fb`'s build output.
- **Legacy:** <https://walnut.tv>. Analytics requests (Tag Manager, Google
  Analytics, Firebase Analytics) were aborted in the browser.
- **Browser:** agent-browser 0.38.1, HeadlessChrome 154 on Linux, resized with
  `set viewport`.

All measurements are in [results.json](./results.json).

### B0 paired screenshots: pass

| State                          | Legacy                                              | New                                           |
| ------------------------------ | --------------------------------------------------- | --------------------------------------------- |
| Loaded, 1440×900               | [legacy](./b0-legacy-1440x900-loaded.png)           | [new](./b0-new-1440x900-loaded.png)           |
| Selected + watched, 1440×900   | [legacy](./b0-legacy-1440x900-selected-watched.png) | [new](./b0-new-1440x900-selected-watched.png) |
| Selected + watched, 390×844    | [legacy](./b0-legacy-390x844-selected-watched.png)  | [new](./b0-new-390x844-selected-watched.png)  |
| Menu open, 390×844             | [legacy](./b0-legacy-390x844-menu-open.png)         | [new](./b0-new-390x844-menu-open.png)         |
| Loaded, landscape 844×390      | [legacy](./b0-legacy-844x390-loaded.png)            | [new](./b0-new-844x390-loaded.png)            |
| Loaded, short portrait 390×568 | [legacy](./b0-legacy-390x568-loaded.png)            | [new](./b0-new-390x568-loaded.png)            |

The selected states watch `KTgRt6VQN9g` and then select `iA2gdwTWJ_E` on both
sites. The rects of the player, title, arrows, logo, menu and footer were
compared on the same video.

The menu-open pair was retaken on 2026-11-25 against the `dev` Production
deployment of `ceb562f`
([deployment](https://vercel.com/gianpaj/walnut-tv/B1riGpg1ziasQCh43SrRxvdi7irR)).
This was a read-only capture; nothing was promoted. The toggle (178, 8, 69×39)
and the three menu links (y 63, 103 and 143, 40px tall) are at the same
positions on both. `menuOpenRetake` in `results.json` records it; the
`390x844-menu-open` rects under `B0` belong to the replaced 2026-11-18 pair.

Both sites had run out of YouTube quota that day, so the pair is also the
error-state comparison. Legacy replaces the page with "Come back tomorrow,
today's YouTube quota was used for /hustle" and shows no video. The new app
shows a one-line quota notice above its 22 cached videos and loads the first
in the player. Serving cached videos is the intended behaviour; copying
legacy's empty page was not considered.

These match legacy within 2px:

- 390×844, both states.
- 390×568.
- The logo, the menu button, the open menu and the landscape links, at every
  viewport.

The differences:

- **Desktop footer links: 6px higher** (y 915 against 921). Legacy's
  `padding-bottom: 1rem` is 10px under Bootstrap 3's 10px root font size;
  the new app used 16px. Fixed in `VideoDisplay.tsx`. On `ceb562f` the
  links end 10px above the bottom of the right column's content, as on
  legacy.
- **Desktop scrolling:** legacy scrolls the whole page 50px to reach the
  footer, sidebar included. The new app scrolls only the right column, so the
  sidebar stays 850px tall and in place. This keeps U2's independent list
  scrolling.
- **Landscape 844×390:** legacy's layout breaks. Its 387px player is taller
  than the 91vh (355px) column, the flex column wraps, and the player shows as
  a 17px sliver beside the title and arrows. The new app shows a full-width
  player with the title, arrows and footer one scroll below. Copying legacy's
  broken layout was not considered.
- **Phones:** the video list below the footer, as decided.

Feed differences, not UI:

- Legacy hustle has 64 videos and the new app 69. All 64 legacy videos are in
  the new feed.
- The new feed opens on `vKobP6DkC1E`, which legacy lacks. Legacy's first row
  is `KTgRt6VQN9g`.

### B5 presentation: pass

The deep link `/hustle/iA2gdwTWJ_E` (row 3) was opened after selecting rows 1
and 2 ([1440×900](./b5-new-1440x900.png), [390×844](./b5-new-390x844.png),
[844×390](./b5-new-844x390.png), [390×568](./b5-new-390x568.png)).

Every viewport passes the row and overflow checks:

- One iframe.
- The active row has a 4px `#ffec00` border and a white title.
- Rows 1 and 2 show WATCHED with a `#5a5a5a` title.
- No horizontal overflow.

| Viewport | Player, title, arrows in first screen    | Active row in first screen |
| -------- | ---------------------------------------- | -------------------------- |
| 1440×900 | yes (no arrows on desktop)               | yes                        |
| 390×844  | yes                                      | no (y 1011)                |
| 390×568  | yes                                      | no (y 760)                 |
| 844×390  | no: the player ends at 442, title at 462 | no                         |

Other checks:

- **Desktop list scroll.** The list was scrolled to 2000, putting the active
  row out of view. ArrowRight selected row 4 and brought it to the list top
  (`scrollTop` 283) while `window.scrollY` stayed 0.
- **Desktop footer.** The right column scrolls 50px. Terms, Privacy and
  Contact are then visible and clickable.
- **Theme.** A stored `theme=light`, with or without `prefers-color-scheme:
light`, still renders `<html class="dark">` on a black body.
- **`?v=`.** `/hustle?v=FmvRhxq2oHE` becomes `/hustle/FmvRhxq2oHE` with row 14
  active.
- **Portrait menu.** `aria-controls="category-menu"` toggles the list.
  Escape closes it from the toggle or a link and returns focus to the toggle.
  Landscape hides the toggle and shows the links.
- **Real playback across the new layout.** A muted hustle video kept playing
  in the same iframe through 1440×900 → 992×844 → 390×844 → 844×390 →
  1440×900, with `currentTime` 3.2, 6.2, 9.2, 12.3 and 15.3 s.

### L6 validation: pass

Fresh clones of `b12bdd8` and of `23e8bae` (`b12bdd8` plus the footer
padding fix), on Node 24.22.1 with pnpm 10.27.0, pass:

- frozen-lockfile install
- `check-channels`
- typecheck
- lint
- format check
- 140 tests
- production build
- the fixture suite, 66 of 66: builds `VPCpXozHwe0VTFRtFv8Dx` (source digest
  `f51d776f…`) and `vknewY79Xj1tqNlwdcJo_` (`b1413d53…`).

## Alternatives considered

- **Capture on the `dev` Production alias.** On 2026-11-18 it still served
  `82022fb`, the layout before the parity change, because the `b12bdd8` build
  failed. The PR Preview runs the same app code.
- **Device emulation instead of viewport resizing.** Kept to resizing, as in
  the first run and the fixture suite, so the results compare.

## Consequences

- B0 and B5 are closed for the legacy look.
- **A production build can fail if the Google font download fails.**
  Redeploying is enough; the cutover note's merge step says so. Serving
  Open Sans with `next/font/local` would remove the download.
- **Untested:**
  - real wheel and touch scrolling (agent-browser's wheel did not scroll
    headless; the checks used element scrolling)
  - physical phones
  - a real blocked video in a live feed
  - loading and empty pairs against legacy (the 2026-11-25 menu pair covers
    the quota error)
