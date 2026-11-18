# Agent Note: Hosted checks on the d599ab2 deployment

Status: implemented — evidence closing release gates L1, L2 and L3

## Problem

Release gates L1–L3 need evidence from the host, not a local build: real
playback, no secrets in client output, and cache behavior against YouTube
quota. The earlier [Vercel preview](./2026-09-28-vercel-preview/README.md) of
`4a33f66` could not provide it because every category was denied by YouTube.

## Decision

L1, L2 and L3 are closed on this evidence, with L3's daily figure to be
confirmed after cutover (see Consequences).

- Source: `d599ab2` (merge of #354 into `dev`).
- Deployment: `dpl_Fch9dyBQ9rYkUaNDpSgQq8ujugpX`, Vercel target Production
  (`dev` is the project's production branch), status Ready, at
  <https://walnut-tv-git-dev-gianpaj.vercel.app>. Not password-protected.
- Server key: the `YOUTUBE_API_KEY` replaced in Vercel on 2026-11-17 with an
  existing key labeled for server use, after the previous one was denied. It
  needs no `YOUTUBE_API_REFERER`: a request without a Referer succeeds.
  Whether it shares a Google Cloud project, and so quota, with the legacy key
  in `js/all.js` is not recorded.
- Browser: agent-browser 0.38.1, HeadlessChrome 154 on Linux.

### L1: playback

On `/hustle`, video `FmvRhxq2oHE` was muted and started with the IFrame API
(`YT.get(iframe.id).playVideo()`); the UI Play button was not used. Player
state stayed 1 (playing) and the same iframe element remained in the page
throughout:

| Step                 | Viewport | `currentTime` (s) |
| -------------------- | -------- | ----------------- |
| Start, after 6 s     | 1440×900 | 5.04              |
| Below the breakpoint | 992×844  | 8.06              |
| Phone portrait       | 390×844  | 11.07             |
| Back to desktop      | 1440×900 | 14.10             |
| Phone landscape      | 844×390  | 25.33             |
| Rotated to portrait  | 390×844  | 27.84             |

Next then moved to `/hustle/LPKLhoS4kN8` and cued that video (state 5), which
matches the no-autoplay behavior in B3. Only hustle was played; ai and crypto
were checked for loaded videos, not playback.

### L2: client output

Fetched with curl from the deployment: `/`, `/hustle`, `/ai`, `/crypto`,
`/hustle/FmvRhxq2oHE`, `/hustle?v=FmvRhxq2oHE`, `/r/videos`,
`/r/videos/abc123`, `/does-not-exist` (404), `/?p=/ai`, `/sitemap.xml` and
`/robots.txt`, then every `/_next/static/` asset those responses reference
(24 files). The source has no `import()` or `next/dynamic`, so these are the
whole client bundle.

- `AIza[0-9A-Za-z_-]{35}` (Google API key shape): no match.
- `YOUTUBE_API_KEY`, `NEXT_PUBLIC_YOUTUBE_API_KEY`, `YOUTUBE_API_REFERER`,
  `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`: no match.

`src/lib/actions/youtube.ts` reads `YOUTUBE_API_KEY` and falls back to
`NEXT_PUBLIC_YOUTUBE_API_KEY`. It imports `server-only`, so neither reaches the
browser. Whether the `NEXT_PUBLIC_` variable is unset in Vercel was not
checked: the Vercel API refused to list environment variables.

### L3: timing

Category pages are rendered per request: `cache-control: private, no-cache,
no-store`, `x-vercel-cache: MISS`.

| Requests                | Times (s)                                      |
| ----------------------- | ---------------------------------------------- |
| `/hustle`, 6 sequential | 1.03, 0.56, 0.62, 0.62, 0.50, 0.56             |
| `/ai`, 6 sequential     | 0.71, 0.61, 0.44, 0.65, 0.55, 0.64             |
| `/crypto`, 6 sequential | 0.52, 0.53, 0.53, 0.41, 0.46, 0.51             |
| `/ai`, 8 concurrent     | 0.54, 0.74, 1.00, 1.21, 1.88, 1.89, 1.93, 2.11 |

This is consistent with Next's Data Cache answering the YouTube calls, but
does not prove it: channels are fetched in parallel, so uncached renders could
take similar time.

### Outbound requests (L2 Reddit, L3 quota)

A temporary build of `c85a79a` plus an `instrumentation.ts` that logged every
outbound HTTP request through undici's `undici:request:create` channel (method,
origin and path; never the query, which carries the key) ran as Preview
`dpl_GN4ovc7JBAHPmFMhg6ABPa6tSseM`. That channel sees only real network
requests; fetches answered from Next's Data Cache appear as lookups to
`iad1.suspense-cache.vercel-infra.com`. The branch was deleted afterwards and
never merged.

| Requests (2026-11-17, UTC)                                          | Requests to `www.googleapis.com`  |
| ------------------------------------------------------------------- | --------------------------------- |
| `/r/videos`, `/r/videos/abc123`, `/r/funny`, `/r/videos` (18:47:31) | 0, and no outbound request at all |
| First `/hustle` on the new deployment (18:47:33)                    | 86                                |
| First `/ai` and first `/crypto`                                     | 93 and 78                         |
| Every later request, including six more at 18:48:15–18:48:20        | 0                                 |

The first visit to each category on a new deployment fetched every channel:
257 calls against the 264-unit cold-fill estimate (88 channels × 3 calls; a
few channel lookups were already cached). Repeat visits within the two-hour
window made no YouTube calls. A new deployment started with a cold cache for
these keys, so each deployment that receives traffic can spend up to about
260 units once.

## Alternatives considered

- **Protected Preview with OIDC access**, as for `4a33f66`. Not needed: the
  `dev` deployment is public and serves the same source.
- **Timing only for L3.** Rejected as proof. Counting outbound requests to
  `www.googleapis.com`, or the quota graph filtered by credential, is required.

## Consequences

- L1 is closed. P3's claim that playback survives the breakpoint now has real
  YouTube evidence, not only the fixture test double.
- L2 is closed: the owner confirmed the legacy key's restrictions, and the
  Reddit routes made no outbound requests on the host.
- L3 has upstream counts: a cold fill matches the estimate and cached visits
  make no calls. The owner accepted the daily estimate, to be confirmed in the
  Google Cloud quota graph during the first week after cutover.
