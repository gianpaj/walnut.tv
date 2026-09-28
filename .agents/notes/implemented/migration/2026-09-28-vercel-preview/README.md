# Vercel preview verification

Vercel is the selected Next.js host. Production cutover remains blocked.

- Source: `4a33f66873edbf44752ce827d21e108562058e68`.
- Protected preview: <https://walnut-kaw6e7opr-gianpaj.vercel.app>.
- Deployment: `dpl_7ePFC96t6sAQw8n6A83Q6ADhYB1Z`, target Preview, status Ready.
- Browser: agent-browser 0.38.1, HeadlessChrome 147 on macOS.
- Access used origin-scoped OIDC headers; protection remains enabled. No token
  or authenticated browser state is included in this evidence.

## Deployment and blockers

`vercel.json` selects Next.js, frozen pnpm installation and `pnpm build`.
`package.json` requires Node 24. This deployment used the build-only variable
`ENABLE_EXPERIMENTAL_COREPACK=1` to select pinned pnpm 10.27.0. Source came from
committed files, excluding local environment files, agent notes and plans.
Shared settings and credentials were not changed.

The Preview `YOUTUBE_API_KEY` is configured, but all three categories show
“YouTube denied access to the requested videos.” The specific upstream denial
reason is unconfirmed. Check YouTube Data API enablement and key restrictions
in Google Cloud, or replace the Preview key through Vercel, then redeploy.
Loaded-feed, real-player and cache/quota acceptance remain blocked on this host.

Git deployment safety is documented in [README](../../../../../README.md#deployment).
No push, promotion or public-domain change was performed.

## Legacy links

Vercel normalizes query strings before Next Proxy, losing distinctions between
literal encoded values and the legacy shim's separators. Decoding or repeatedly
unescaping the server URL cannot reliably recover the original input.

The proxy passes root requests containing `p` to `LegacyRedirect`, which parses
`window.location.search` and uses `location.replace`, retaining the fragment.
This requires JavaScript, matching the legacy SPA; a Hustle link is the fallback.
Ordinary homepage requests retain their HTTP 307, and retired routes their 308.
Server decoding and guessed raw-URL headers are rejected because they cannot
preserve the raw input reliably.

All nine deployed [legacy-link checks](./legacy-links.json) passed: escaped
ampersands, plus signs, fragments, literal versus separator `~and~`, encoded
equals, unsafe/malformed destinations, retired categories and unknown routes.

## Verification and screenshots

Frozen installation, channel validation, typecheck, Oxlint, 137 tests and the
local production build passed for the source revision. Both Vercel builds passed.

The first preview (`walnut-b50kxomsi-gianpaj.vercel.app`, `e6d8f77`) verified
home-to-Hustle navigation, all three denial states, Reddit unavailable/noindex,
unknown category/video HTTP 404s, manifest/sitemap/robots HTTP 200s and rendered
social images. The latest preview verifies the legacy-link fix above.

The following latest-preview screenshots were visually inspected. They are not
paired legacy comparisons and do not establish loaded-feed parity.

| File                                 | Viewport | Route and state                    |
| ------------------------------------ | -------- | ---------------------------------- |
| [desktop.png](./desktop.png)         | 1440×900 | `/hustle`, denied feed, dark theme |
| [mobile.png](./mobile.png)           | 390×844  | `/hustle`, denied feed, dark theme |
| [mobile-menu.png](./mobile-menu.png) | 390×844  | `/hustle`, settled open menu       |

The error message fits both viewports. The mobile menu displays all categories
and a close control, with substantial vertical spacing between links.

Keyboard opening, Escape dismissal and focus return passed before the settled
menu capture was reviewed. A repeat run stalled the opening animation offscreen;
Tab/Enter still selected AI. The URL became `/ai` and the trigger collapsed,
but the closed dialog remained mounted with its exit animation unfinished.
Full U3 confirmation remains open; do not treat an accessibility snapshot or
successful URL change as proof that the overlay is visibly dismissed. The owned
browser session was closed.

Final screenshot parity, player lifecycle, short viewports/themes, upstream
access, cache evidence, analytics and cutover/rollback gates remain open in
[MIGRATION-PLAN.md](../../../../../MIGRATION-PLAN.md).
