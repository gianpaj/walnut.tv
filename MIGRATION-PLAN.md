# Next.js migration: parity and release checklist

This is the canonical checklist for replacing the Vue/jQuery app on `master`
with the Next.js app on `dev`. Optional product work belongs in [TODO.md](./TODO.md).
Runtime conventions and environment variables belong in [AGENTS.md](./AGENTS.md).

**Status:** migration implemented and verified; ready for cutover. Code inspection
is not browser verification. Check off an open item only after its acceptance
criteria pass, or record an explicit decision to accept the difference.

The [September 27 verification note](./.agents/notes/implemented/migration/2026-09-27-parity-verification.md)
records local production-feed/playback checks, fixture coverage and paired screenshots.
The [Vercel preview note](./.agents/notes/implemented/migration/2026-09-28-vercel-preview/README.md)
records a protected deployment of `4a33f66`, deployed legacy-link checks and
mobile-menu evidence. The [hosted checks note](./.agents/notes/implemented/migration/2026-11-17-hosted-checks.md) records the `d599ab2`
deployment loading real feeds in every category, playing a hustle video
through resizes and rotation, and its secret scan and timings. The
[hosted parity recheck](./.agents/notes/implemented/migration/2026-11-18-hosted-parity-recheck/README.md) records the legacy look against walnut.tv and the
release-revision validation. Only the cutover and the analytics check after it
remain; Reddit work is paused.

## Remaining work at a glance

**Completed:** homepage/retired-route policy (R1), legacy links (R2), pending
navigation (U1), feed error handling (D1), duration parsing (D2), watched-history
fixtures (B4), local metadata/assets acceptance (L4), hosted playback (L1),
upstream access (L2), cache/quota evidence (L3), hosted browser checks for
U2, U3, B0, B1, B2, B3 and B5, and release-revision validation (L6) on
`b12bdd8`.

| Remaining work | Checklist | What is needed                                                           |
| -------------- | --------- | ------------------------------------------------------------------------ |
| Release        | L7        | The cutover and rollback in the cutover note                             |
| Analytics      | L5        | Verify initial loads and navigation events in GA4 realtime after cutover |

**Paused, not failed:** Reddit vote/filter/feed parity (P2 and Reddit portions of
B6/B7) and live OAuth checks require approved API access. Keep Reddit disabled.
Disabled-route behavior and absence of Reddit requests remain release requirements.

## Baseline

The 2026-09-27 audit baseline is local `dev` (`b7281fa`), `master` (`561d929`)
and PR #325 head `962fbcb`. The audit records matching local/PR `src/` trees
and differing channel configurations; these are baseline revisions, not current heads. See the [audit note](./.agents/notes/implemented/migration/2026-09-27-parity-audit.md)
for evidence, validation results, and preview availability.

`channels.js` contains three YouTube categories: `hustle`, `ai`, and `crypto`.
Their source counts are 29, 33, and 26 entries respectively, with 88 unique
YouTube channel IDs overall. Ad-hoc Reddit routes use `/r/{subreddit}` but show
an unavailable message: Reddit access is intentionally disabled pending approval.
Reddit-only parity checks are paused, not passed. See [Reddit access](./AGENTS.md#reddit-access)
for the switch and re-enabling requirements.
The channel data matches current `master` except for three channels removed on
purpose: two with no public videos and one that no longer exists. Do not
restore them or retired categories just to satisfy an outdated checklist.

## Implemented in code

These are present, not claims of end-to-end verification:

| Capability                                                                                        | Implementation                                                       |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Next.js 16 / React 19, strict TypeScript, pnpm and CI                                             | `package.json`, `.github/workflows/ci.yml`                           |
| One channel configuration for app, scripts and navigation                                         | `channels.js`, `src/lib/data.ts`, `src/components/navbar/`           |
| Channel and video paths; `?v=` compatibility; unknown-channel validation                          | `src/app/[channel]/page.tsx`, `src/app/[channel]/[videoId]/page.tsx` |
| Ad-hoc subreddit and video paths                                                                  | `src/app/r/[subreddit]/`                                             |
| YouTube IFrame API, error-to-next, prev/next controls, arrow keys                                 | `src/components/VideoPlayer.tsx`, `src/components/VideoDisplay.tsx`  |
| One responsive layout/player at a time                                                            | `src/hooks/use-media-query.tsx`, `src/components/VideoDisplay.tsx`   |
| Legacy watched-ID import, persisted union, thumbnail badges and dimmed rows                       | `src/hooks/use-video.tsx`, `src/components/VideoDisplay.tsx`         |
| Source-title links and predictable YouTube thumbnails                                             | `src/components/VideoDisplay.tsx`, `src/lib/videoService.ts`         |
| All configured YouTube sources, four candidates each, duration filtering and newest-first sorting | `src/lib/actions/youtube.ts`, `src/lib/utils.ts`                     |
| Server-side Reddit OAuth, hot listings, vote filtering (retained, disabled)                       | `src/lib/actions/reddit.ts`                                          |
| Cross-source interleaving, deduplication and Reddit/YouTube failure isolation                     | `src/lib/actions/videos.ts`, `src/lib/videoService.ts`               |
| GA4 script, metadata, icons, manifest, sitemap and robots                                         | `src/components/Analytics.tsx`, `src/app/layout.tsx`, `public/`      |

YouTube uses Next's Data Cache: playlist-ID lookups revalidate at 30 days;
playlist items and video details at two hours. The disabled Reddit implementation
retains ten-minute listing revalidation and per-instance OAuth token reuse.
There is no Reddit browser fallback and no three-channel YouTube cap.

## Implementation and targeted acceptance

### P0 — Landing route and link compatibility

- [x] **R1: Choose a working default destination.** The homepage redirects to
      `/hustle` (307). `/reddit`, `/curious`, `/docus` and their video links
      redirect permanently to `/` (308), without preserving the video destination.
      Unknown categories still return 404. The root rule lives in `src/proxy.ts`;
      retired-category rules live in `next.config.mjs`.
      HTTP and browser routing checks passed; loaded-feed and logo-interaction
      acceptance remain part of B0/B1/B3. See the [routing verification note](./.agents/notes/implemented/migration/2026-09-27-home-and-retired-routes.md).
- [x] **R2: Handle legacy SPA-shim links.** The root proxy passes `?p=` requests
      to `LegacyRedirect`, which decodes the raw browser query before navigating.
      This preserves `/?p=/path&q=...`, `~and~`, escapes and fragments despite
      Vercel's lossy server-query normalization. JavaScript is required, matching
      the legacy SPA. Unsafe/malformed destinations fall back to Hustle;
      retired-category and unknown-route policies remain intact. Unit and local
      browser checks plus nine deployed legacy-link checks pass. Ordinary root
      and retired-category redirects retain their HTTP behavior.

### P1 — User-visible behavior and correctness

- [x] **U1: Restore pending-navigation feedback.** `NavigationProvider` names
      the requested category and pauses the old player while the client transition
      waits for server data. Slow-fetch fixtures verified feedback, pause and
      completed navigation. No route-level Suspense was added; HTTP 404s pass.
- [x] **U2: Constrain automatic list scrolling.** Desktop selection scrolls
      only the list viewport, sized below the header; mobile does not auto-scroll.
      On real feeds, Previous past the fold changed only the list's scroll
      position and mobile Prev/Next/arrows never moved the page; the fixture
      suite covers the short-viewport/orientation matrix. See the
      [hosted browser acceptance note](./.agents/notes/implemented/migration/2026-11-17-hosted-browser-acceptance/README.md).
- [x] **U3: Name the mobile menu control.** The trigger is named
      “Open navigation menu.” On the hosted app at 390×844, keyboard opening,
      choosing a category by keyboard (dialog gone within 300 ms, focus back on
      the trigger) and Escape with focus return pass. See the
      [hosted browser acceptance note](./.agents/notes/implemented/migration/2026-11-17-hosted-browser-acceptance/README.md).
- [x] **D1: Distinguish empty, failed, quota-exhausted and partial feeds.**
      Fetchers return successful videos plus allowlisted issue codes. Only explicit
      quota reasons produce quota messages; no raw upstream errors reach the UI.
      Actual-fetcher unit tests and browser fixtures cover missing configuration,
      denial, quota, network failure, partial results and successful empty feeds.
      A real partially available AI feed also retained playable videos.
- [x] **D2: Parse valid durations without a seconds field.** The parser accepts
      optional hours/minutes/seconds and rejects malformed or missing durations.
      Unit tests cover optional components and 119/120/121 seconds; browser
      fixtures retain `PT3M`/`PT1H` and exclude durations of 120 seconds or less.

## Differences requiring a decision

- [x] **P1: Source ordering.** `interleaveArrays` keeps rotating between
      sources until all are empty: `[[1,2,3,4],[5],[6,7,8]]` gives
      `[1,5,6,2,7,3,8,4]`, where legacy gave `[1,5,6,2,3,4,7,8]`. Accepted so a
      prolific source cannot fill the list. The rules differ only with three or
      more sources. Newest-first categories re-sort the result, so the configured
      YouTube categories differ only among videos with equal or missing publish
      times. Unsorted multi-subreddit Reddit feeds will follow the rotation.
- [ ] **P2: Reddit vote semantics.** Legacy filters `ups` only for a truthy
      threshold; the rewrite always checks `score >= minVotes`. At zero, negative
      scores are excluded rather than disabling the filter. Choose the rule and
      cover it with fixtures. Paused while Reddit is disabled.
- [x] **P3: Responsive layout.** The desktop sidebar is a fixed 400px, as on
      legacy, from the legacy 993px breakpoint; narrower screens, including
      phones in landscape, use the stacked layout. Both layouts share one
      element tree, so the player keeps playing when a resize or rotation
      crosses the breakpoint. The fixture resize check fails if the player is
      rebuilt or moved. On desktop the DOM and tab order is player, title and
      footer, then the list, although the list is shown on the left; keyboard users
      reach the player without tabbing through every row.

Deduplicating the final combined feed is a useful difference from legacy, not
an implementation gap. Acceptance should compare source coverage and order,
not demand duplicate videos or four playable videos per source: both versions
fetch four candidates before filtering and do not backfill.

## Browser acceptance checklist

Use the `agent-browser` CLI and its skill to verify migration work. Load the
skill and run `agent-browser skills get core` before browser testing. Run against
a functioning Next.js preview with real API access on desktop and mobile.
Use controlled fixtures for failures and boundary cases; record the tested
revision, browser and result. Unit coverage does not establish browser parity.

- [x] **B0: Screenshot-based UI parity.** Compare the Next.js app with
      `http://walnut.tv` (follow any HTTPS redirect) or a running checkout of
      `master`, this repository's main branch. Use `agent-browser` to capture
      paired screenshots at matching desktop and mobile viewport sizes, routes
      and interaction states. Cover the loaded list/player, selected and watched
      rows, mobile menu, and loading/empty/error states where reproducible.
      Use matching videos or fixtures when possible; distinguish live-feed changes
      from UI regressions. Inspect the images, not just accessibility snapshots.
      Record baseline URL or commit, Next.js revision, viewport, state, screenshot
      paths and unresolved differences in a short `.agents/notes` verification
      note. Note blocked comparisons rather than treating them as passes.
      Pixel-identical styling is not required; explain intentional differences.
      Screenshots complement the interaction checks below; they do not replace them.
      Hosted pairs of the legacy look against walnut.tv at 1440×900, 390×844
      and 390×568 match within 2px apart from the mobile list and the desktop
      footer padding, fixed after the capture. Intentional differences: on
      desktop the new app scrolls only the right column where legacy scrolls
      the whole page 50px, and at 844×390 legacy's layout breaks (a 17px
      player) while the new app keeps a full-width player.
      See the [hosted parity recheck](./.agents/notes/implemented/migration/2026-11-18-hosted-parity-recheck/README.md).

- [x] **B1: Routing.** Every configured category, both deep-link route shapes,
      `?v=`, reload, navbar changes, Back/Forward, the logo and unknown-route
      HTTP 404s pass on real feeds. A requested video absent from the feed falls
      back to the first video, matching legacy. Back/Forward restores the
      selected video from the history URL. See the
      [hosted browser acceptance note](./.agents/notes/implemented/migration/2026-11-17-hosted-browser-acceptance/README.md).
- [x] **B2: Player lifecycle.** Select before the IFrame API loads and between
      player construction and `onReady`; the latest selection must win without
      throwing. `VideoPlayer` gates cueing on readiness and synchronizes the latest
      ID in `onReady`. Initial fixtures passed delayed readiness, rapid selections,
      route changes, unmount and visible API-load failure. The complete fixture
      suite, lifecycle included, passed 66 of 66 on `631a2f4` (L6).
- [x] **B3: Playback and controls.** Play/pause (API and YouTube's buttons),
      fullscreen, the title's YouTube link, arrow keys outside inputs, Prev/Next
      disabled at the list boundaries, and no auto-advance at the end of a video
      pass with the real player. A player error skips to the next video; it was
      triggered with an invalid ID because the live feeds had no blocked video.
      See the [hosted browser acceptance note](./.agents/notes/implemented/migration/2026-11-17-hosted-browser-acceptance/README.md).
- [x] **B4: Watched history.** Local fixtures passed all four seeds, union,
      duplicate suppression, reload and intact legacy storage. Seed legacy `videosWatched` only, new
      `video-storage` only, both keys and malformed legacy JSON. Verify the union
      survives reload, duplicate IDs do not grow, and the legacy key remains
      intact. Marking a video watched on selection, not playback/completion,
      matches legacy. The active row stays distinct from watched rows. Use seeded
      data on preview: localStorage does not cross origins.
- [x] **B5: Mobile and desktop presentation.** At 1440×900, 390×844, 844×390
      and 390×568: one player, active highlight, watched label and grey title,
      independent desktop list scrolling and no horizontal scroll. At 844×390
      the title and arrows sit one scroll below the player, and at 390×844 and
      390×568 the active row is below the fold. The theme is forced dark. See
      the [hosted parity recheck](./.agents/notes/implemented/migration/2026-11-18-hosted-parity-recheck/README.md).
- [ ] **B6: Feed fixtures.** All configured YouTube sources considered,
      newest-first sorting, duration boundary, missing thumbnail variants,
      Reddit hot/vote filters, multiple subreddits, mixed Reddit/YouTube results
      and duplicates. Multi-subreddit fixtures should expect the P1 rotation, not
      legacy order. Resolve P2 before asserting exact filter parity. The YouTube
      cases pass in the fixture suite on `631a2f4`; the Reddit cases are paused
      with Reddit.
- [ ] **B7: Failure states.** D1 feed-state fixtures and U1 slow-source
      navigation checks passed; a deployment with a denied key rendered API-denial
      messages. The D1 cases pass in the fixture suite on `631a2f4`. Reddit
      isolation checks are paused: one rejected subreddit rejects the whole
      Reddit source (`Promise.all`); decide whether finer isolation is needed
      before re-enabling Reddit.

## Release gates

- [x] **L1: Working deployment preview.** Vercel is selected. The deployment of
      `d599ab2` loads real YouTube videos in hustle, ai and crypto. A hustle video
      kept playing in the same iframe through resizes across 993px
      (1440→992→390→1440) and a phone rotation (844×390→390×844). Evidence is in
      the [hosted checks note](./.agents/notes/implemented/migration/2026-11-17-hosted-checks.md); README covers the Git-build policy.
  - [x] Select Vercel and configure Node 24, frozen pnpm installation and Next build.
  - [x] Deploy reviewed source as a protected Preview and verify app responses.
  - [x] Verify successful real feeds from the deployment host.
  - [x] Verify playback from the deployment host.
- [x] **L2: Upstream access and secrets.** Verify YouTube key restrictions and
      API-denial behavior from the deployment host. Confirm disabled Reddit paths
      make no requests. Reddit OAuth and token-renewal verification require API
      approval before re-enabling. The app reads `YOUTUBE_API_KEY`, falling back
      to `NEXT_PUBLIC_YOUTUBE_API_KEY`, in a `server-only` module. On `d599ab2`,
      twelve routes (including `?v=`, Reddit and 404) and all 24 client assets
      they reference contain no `AIza…` key and none of the five secret variable
      names; see the [hosted checks note](./.agents/notes/implemented/migration/2026-11-17-hosted-checks.md). An earlier deployment with a
      denied key showed the API-denial message. The owner confirmed on
      2026-11-17 that the legacy key in `js/all.js` is restricted to the YouTube
      Data API and walnut.tv referrers. On a Preview that logged every outbound
      request, Reddit routes made none ([evidence](./.agents/notes/implemented/migration/2026-11-17-hosted-checks.md#outbound-requests-l2-reddit-l3-quota)).
      Delete the legacy app's embedded key once the
      rollback window in the [cutover note](./.agents/notes/proposed/migration/2026-11-16-cutover-and-rollback.md) ends.
- [x] **L3: Cache/quota evidence.** Measure repeated and concurrent visits,
      cold starts, redeploys and preview/production isolation against API quota
      usage. With 88 unique populated channels and one effective shared cache,
      list-call estimates are 264 units for a cold fill and about 2,112/day for
      twelve two-hour refreshes, plus playlist-ID refreshes. These are estimates,
      not enforced limits, and the daily figure assumes every category is
      requested at least once every two hours. On `d599ab2` category pages
      render per request in about 0.4–0.7 s ([timings](./.agents/notes/implemented/migration/2026-11-17-hosted-checks.md#l3-timing)), which is
      consistent with the Data Cache. Logged outbound requests confirm it: the
      first visit to each category on a new deployment made 257 YouTube calls,
      and later visits made none ([evidence](./.agents/notes/implemented/migration/2026-11-17-hosted-checks.md#outbound-requests-l2-reddit-l3-quota)).
      The owner accepted the daily estimate; confirm it in the Google Cloud
      quota graph during the first week after cutover. Add durable storage only if host behavior requires it;
      define failure/stale-data behavior before relying on caching for availability.
- [x] **L4: Metadata and assets.** Local production HTML/browser checks verify
      channel/deep-link and `?v=` canonicals, inherited Open Graph/Twitter images,
      favicon/manifest/icon URLs and the category-only sitemap. Reddit pages set
      `noindex, follow` while allowing crawling. Sixteen focused tests cover
      metadata inheritance, canonical handling and asset files. Vercel spot checks
      also passed manifest/sitemap/robots responses, social images and Reddit
      noindex. Recheck the full metadata/asset matrix on the host at cutover.
- [ ] **L5: Analytics.** The app reports only to GA4 property 372022725
      (`G-LJ7B0PVNZL`) through the Google tag, and loads it only on
      `walnut.tv` and `www.walnut.tv` so deployments on other hosts are not
      counted. Legacy also sends Firebase Analytics to property 187037157
      (`G-Z6V9TW1R8F`); that property keeps its history but receives no data
      after cutover. After cutover, verify initial loads and history-based
      navigation in GA4 realtime, and check in DebugView that `page_title` on a
      navbar navigation names the new channel, not the previous one.
- [x] **L6: Reproducible validation.** Frozen-lockfile install, channel check,
      typecheck, lint, tests and production build pass on the release revision.
      Add focused regression tests for the fixes above; helper tests alone do not
      prove route, player, storage or fetcher behavior.
  - [x] Pass frozen install, channel validation, typecheck, lint, 137 tests and
        production build for deployed source `4a33f66`; Vercel build also passes.
  - [x] Pass a clean frozen install, channel validation, typecheck, lint,
        format check, 140 tests, production build and the fixture suite (66 of
        66, headless, agent-browser 0.38.1) for `631a2f4`, `dev` with `master`
        merged in.
  - [x] Pass the same validation, fixture suite 66 of 66 included, on
        `b12bdd8` and on `23e8bae`, which adds the desktop footer padding fix.
        B0 and B5 pass on the hosted Preview of the same layout. See the
        [hosted parity recheck](./.agents/notes/implemented/migration/2026-11-18-hosted-parity-recheck/README.md).
- [ ] **L7: Cutover and rollback.** Review current `master` channel changes,
      finish or explicitly accept the open parity items, update the PR summary,
      and record the deployment target, redirect policy and rollback procedure.
      Keep the public origin stable to preserve watched history. After cutover,
      check home/deep links, enabled APIs, Reddit's unavailable state, analytics
      and quota usage in production. The proposed order of Netlify, Vercel and
      DNS changes, and the rollback, are in the [cutover note](./.agents/notes/proposed/migration/2026-11-16-cutover-and-rollback.md).
      Any app-code change that lands on `dev` before the cutover merge, such
      as `master` channel changes, reopens L6 for that revision.

## Suggested restart order

1. Complete the cutover (L7), then check analytics (L5). Keep P2 paused while
   Reddit is disabled.

Auth, custom channels, native Reddit playback and sharing UI are not required
to replace the working legacy feature set. Do not build adapters, databases or
additional cache services merely to prepare for those enhancements.
