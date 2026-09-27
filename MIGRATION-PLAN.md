# Next.js migration: parity and release checklist

This is the canonical checklist for replacing the Vue/jQuery app on `master`
with the Next.js app on `dev`. Optional product work belongs in [TODO.md](./TODO.md).
Runtime conventions and environment variables belong in [AGENTS.md](./AGENTS.md).

**Status:** core migration implemented; not ready for cutover. Code inspection
is not browser verification. Check off an open item only after its acceptance
criteria pass, or record an explicit decision to accept the difference.

## Baseline

The 2026-09-27 audit compares local `dev` (`b7281fa`) with `master` (`561d929`).
PR #325 has head `962fbcb`; its `src/` tree matches the local branch, but its
channel configuration differs. See the [audit note](./.agents/notes/implemented/migration/2026-09-27-parity-audit.md)
for evidence, validation results, and preview availability.

`channels.js` contains three YouTube categories: `hustle`, `ai`, and `crypto`.
Their source counts are 30, 36, and 27 entries respectively, with 91 unique
YouTube channel IDs overall. Ad-hoc Reddit browsing uses `/r/{subreddit}`.
The channel data matches current `master`; do not restore retired categories
just to satisfy an outdated checklist.

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
| Server-side Reddit OAuth, hot listings, vote filtering                                            | `src/lib/actions/reddit.ts`                                          |
| Cross-source interleaving, deduplication and Reddit/YouTube failure isolation                     | `src/lib/actions/videos.ts`, `src/lib/videoService.ts`               |
| GA4/Firebase scripts, metadata, icons, manifest, sitemap and robots                               | `src/components/Analytics.tsx`, `src/app/layout.tsx`, `public/`      |

Both fetchers use Next's Data Cache. YouTube playlist-ID lookups revalidate
at 30 days; playlist items and video details at two hours. Reddit listings
revalidate at ten minutes, with OAuth tokens reused per server instance.
There is no Reddit browser fallback and no three-channel YouTube cap.

## Confirmed gaps

### P0 — Landing route and link compatibility

- [x] **R1: Choose a working default destination.** The homepage redirects to
      `/hustle` (307). `/reddit`, `/curious`, `/docus` and their video links
      redirect permanently to `/` (308), without preserving the video destination.
      Unknown categories still return 404. Rules live in `next.config.mjs`.
      HTTP and browser routing checks passed; loaded-feed and logo-interaction
      acceptance remain part of B0/B1/B3. See the [routing verification note](./.agents/notes/implemented/migration/2026-09-27-home-and-retired-routes.md).
- [ ] **R2: Handle legacy SPA-shim links.** `master:404.html` and
      `master:index.html` encode/decode `/?p=/path&q=...` with `~and~` escaping.
      The Next root ignores these parameters. Preserve supported channel/video
      and `/r/{subreddit}/{id}` destinations, query and fragment semantics; reject
      external redirect destinations. Test ordinary deep links, `?v=`, `?p=`,
      malformed input and a removed category.

### P1 — User-visible behavior and correctness

- [ ] **U1: Restore pending-navigation feedback.** Server-side `ChannelView`
      awaits all fetching, while navbar links expose no explicit pending state.
      Under throttled fetching, make the requested navigation apparent and decide
      whether the old video stops immediately, as in the legacy app. Preserve real
      404 responses; follow the streaming constraint in `AGENTS.md`.
- [ ] **U2: Constrain automatic list scrolling.** `VideoList` calls
      `scrollIntoView` on every selection even with mobile `scroll={false}`.
      Keep desktop selection visible without dragging the mobile document away
      from the player. Test initial deep links and next/previous past the fold.
- [ ] **U3: Name the mobile menu control.** The `MobileNav` trigger is icon-only
      without an accessible name. Give it a meaningful name and verify opening,
      closing, focus return and category selection using the keyboard.
- [ ] **D1: Distinguish empty, failed, quota-exhausted and partial feeds.**
      `fetchChannelUploads` catches every error and returns `[]`; `ChannelView`
      calls any non-failing empty result a YouTube quota failure, even for Reddit.
      Preserve successful sources and enough failure information to show the
      correct state. Test missing credentials, API denial, quota exhaustion,
      network failure, one failed source, and a successful zero-video response.
      The misleading empty/quota message also exists in legacy code; do not carry
      it forward as a parity requirement.
- [ ] **D2: Parse valid durations without a seconds field.** The regex in
      `src/lib/utils.ts` treats `PT3M` and `PT1H` as zero, dropping long videos.
      Cover optional components, malformed/missing duration, and the 120-second
      boundary. The legacy parser also mishandles these inputs; preserve the
      intended filter, not its bug.

## Differences requiring a decision

- [ ] **P1: Source ordering.** For `[[1,2,3,4],[5],[6,7,8]]`, legacy interleaving
      produces `[1,5,6,2,3,4,7,8]`; `interleaveArrays` produces
      `[1,5,6,2,7,3,8,4]`. Restore the legacy rule or accept round-robin and update
      the helper's parity claim and tests. Newest-first sorting masks most of this
      difference in the configured YouTube categories.
- [ ] **P2: Reddit vote semantics.** Legacy filters `ups` only for a truthy
      threshold; the rewrite always checks `score >= minVotes`. At zero, negative
      scores are excluded rather than disabling the filter. Choose the rule and
      cover it with fixtures.
- [ ] **P3: Responsive layout.** Decide whether the resizable desktop sidebar
      is wanted. Crossing 768px recreates the player; verify orientation changes
      and decide whether playback-position continuity is required.

Deduplicating the final combined feed is a useful difference from legacy, not
an implementation gap. Acceptance should compare source coverage and order,
not demand duplicate videos or four playable videos per source: both versions
fetch four candidates before filtering and do not backfill.

## Browser acceptance checklist

Use the `agent-browser` CLI and its skill to verify migration work. Load the
skill and run `agent-browser skills get core` before browser testing. Run against
a functioning Next.js preview with real API access on desktop and mobile.
Use controlled fixtures for failures and boundary cases; record the tested
revision, browser and result. The current unit suite only covers helpers.

- [ ] **B0: Screenshot-based UI parity.** Compare the Next.js app with
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

- [ ] **B1: Routing.** Every configured category, both deep-link route shapes,
      `?v=`, reload, navbar changes, Back/Forward, and unknown-channel HTTP 404s.
      Test a requested video still in the feed and one absent from it. Falling
      back to the first video when it leaves the feed matches legacy behavior.
- [ ] **B2: Player lifecycle.** Select before the IFrame API loads and between
      player construction and `onReady`; the latest selection must win without
      throwing. `VideoPlayer` has no `onReady` synchronization and calls
      `cueVideoById` whenever selection changes, so this needs a targeted test.
      Also test rapid selection, route changes, unmount and API-load failure.
- [ ] **B3: Playback and controls.** Play/pause, fullscreen, source links,
      keyboard arrows outside editable fields, prev/next boundaries and skipping
      removed/private/blocked videos. End-of-video must not advance automatically:
      autoplay-next is disabled in both implementations.
- [ ] **B4: Watched history.** Seed legacy `videosWatched` only, new
      `video-storage` only, both keys and malformed legacy JSON. Verify the union
      survives reload, duplicate IDs do not grow, and the legacy key remains
      intact. Marking a video watched on selection, not playback/completion,
      matches legacy. The active row stays distinct from watched rows. Use seeded
      data on preview: localStorage does not cross origins.
- [ ] **B5: Mobile and desktop presentation.** One player, visible title and
      controls, active highlight, thumbnail badge/dimming, independent desktop
      list scrolling, mobile menu and portrait/landscape behavior. Include short
      viewports and both themes; visual styling need not be pixel-identical.
- [ ] **B6: Feed fixtures.** All configured YouTube sources considered,
      newest-first sorting, duration boundary, missing thumbnail variants,
      Reddit hot/vote filters, multiple subreddits, mixed Reddit/YouTube results
      and duplicates. Resolve P1/P2 before asserting exact ordering/filter parity.
- [ ] **B7: Failure states.** Exercise D1 and slow-source navigation. A single
      rejected subreddit currently rejects the whole Reddit source (`Promise.all`);
      verify the consequence and decide whether finer isolation is needed.

## Release gates

- [ ] **L1: Working deployment preview.** Select Netlify or Vercel, configure
      Next.js runtime support and server-only credentials, and produce a preview
      of the revision being reviewed. A successful build is not API verification.
- [ ] **L2: Upstream access and secrets.** Verify YouTube key restrictions and
      Reddit OAuth from the deployment host. Check token renewal and API-denial
      behavior. Use `YOUTUBE_API_KEY`, inspect client output for unintended secret
      exposure, and rotate the key embedded in the legacy app at cutover.
- [ ] **L3: Cache/quota evidence.** Measure repeated and concurrent visits,
      cold starts, redeploys and preview/production isolation against API quota
      usage. With 91 unique populated channels and one effective shared cache,
      list-call estimates are 273 units for a cold fill and about 2,184/day for
      twelve two-hour refreshes, plus playlist-ID refreshes. These are estimates,
      not enforced limits. Add durable storage only if host behavior requires it;
      define failure/stale-data behavior before relying on caching for availability.
- [ ] **L4: Metadata and assets.** Inspect rendered channel and deep-link HTML
      for canonical URLs and Open Graph/Twitter images, not just layout exports.
      Verify favicon/manifest asset URLs, sitemap categories and `/r/` indexing
      policy. Nested page metadata must retain the intended social preview.
- [ ] **L5: Analytics.** Verify initial loads and history-based navigation in
      GA4 realtime/debug reporting. Confirm which of the two configured properties
      is used and whether both integrations are wanted; avoid duplicate counting
      and decide how preview traffic is excluded.
- [ ] **L6: Reproducible validation.** Frozen-lockfile install, channel check,
      typecheck, lint, tests and production build pass on the release revision.
      Add focused regression tests for the fixes above; helper tests alone do not
      prove route, player, storage or fetcher behavior.
- [ ] **L7: Cutover and rollback.** Review current `master` channel changes,
      finish or explicitly accept the open parity items, update the PR summary,
      and record the deployment target, redirect policy and rollback procedure.
      Keep the public origin stable to preserve watched history. After cutover,
      check home/deep links, both APIs, analytics and quota usage in production.

## Suggested restart order

1. Restore a usable preview with working feeds (L1/L2).
2. Fix R2, D1/D2 and U1–U3 in small tested changes; settle P1/P2 explicitly.
3. Run the browser checklist, prioritizing player readiness and watched history.
4. Collect cache, metadata and analytics evidence, then complete cutover gates.

Auth, custom channels, native Reddit playback and sharing UI are not required
to replace the working legacy feature set. Do not build adapters, databases or
additional cache services merely to prepare for those enhancements.
