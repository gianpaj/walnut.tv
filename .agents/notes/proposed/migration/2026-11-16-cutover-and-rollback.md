# Agent Note: Cutover and rollback

Status: proposed — the steps depend on open release gates L1–L6

## Problem

`walnut.tv` and `www.walnut.tv` resolve through Cloudflare, which proxies
them to the Netlify site `walnut`. Netlify publishes `master` as static files
with no build step, and `www` redirects to the apex. The Vercel project
`walnut-tv` is linked to the repository but builds nothing: its production
branch is `dev` and its Ignored Build Step cancels every Git deployment.

Merging `dev` into `master` while this is in place breaks the site. Netlify
would publish the Next.js source tree, which has no `index.html`; the deploy
preview for PR #325 already returns 404 for that reason.

## Proposal

Freeze the legacy site, make Vercel build `master`, then move DNS.

1. **Before merging.** Close release gates L1–L6, or record in
   `MIGRATION-PLAN.md` which open items are accepted for launch. The Preview
   must serve real feeds; set `YOUTUBE_API_KEY` for Vercel Production as well.
   Confirm the legacy key embedded in `js/all.js` is restricted to the YouTube
   Data API and `walnut.tv` referrers, since the rollback target still uses it.
2. **Freeze Netlify.** Use "Lock to stop auto publishing" on the current
   production deploy. walnut.tv keeps serving the legacy app, and that locked
   deploy is the rollback target.
3. **Configure Vercel.** Set the production branch to `master`, remove the
   Ignored Build Step, and set the project Node version to 24.x to match
   `package.json`.
4. **Merge PR #325.** Vercel builds production. Verify real feeds, deep links
   and `?p=` links on the Vercel production URL before any DNS change.
5. **Add the domains.** Add `walnut.tv` and `www.walnut.tv` to the Vercel
   project, with `www` redirecting to the apex, as it does today.
6. **Move DNS.** In Cloudflare, first record the current type, target and
   proxy status of the `walnut.tv` and `www` records. Then replace both records with the values Vercel
   shows and set them to DNS only. The origin stays `walnut.tv`, so watched
   history in `localStorage` survives.
7. **Check production.** Run the L7 checks: home and deep links, legacy links,
   feeds and playback, Reddit's unavailable state, analytics and quota usage.
8. **After the rollback window.** Delete the legacy key embedded in
   `js/all.js` (L2), stop Netlify builds or delete the site, and remove the
   unused Bunnyshell webhook.

**Rollback** before step 8: restore the Cloudflare records recorded in step 6.
The locked deploy is still published on Netlify. While it stays locked, the merge
does not need reverting.

## Alternatives considered

- **Stay on Netlify with its Next.js runtime.** Nothing is configured for it,
  the plan selected Vercel, and only the Vercel build has been verified.
- **Keep Cloudflare's proxy on.** Vercel already runs a CDN and discourages a
  second proxy in front of it. Cloudflare's Email Obfuscation also rewrites the
  server HTML, which risks hydration mismatches on the `mailto:` links. If the
  proxy stays, use SSL "Full (strict)" and turn Email Obfuscation off.
- **Merge first, then move DNS.** Netlify would publish the 404 tree to
  walnut.tv between the merge and the DNS change.

## Acceptance criteria

- walnut.tv serves the Next.js app from Vercel, and `www` redirects to the apex.
- Netlify still serves the locked legacy deploy at `walnut.netlify.app`.
- The stale 2024 production deployment at `walnut-tv.vercel.app` is replaced
  by the `master` build.
- The L7 production checks pass.

## Risks

- Deleting the legacy key before the rollback window ends breaks the rollback
  target. Until step 8 it stays public, as it is today; its API and referrer
  restrictions are what limit abuse.
- The cause of the Preview's YouTube denial is unconfirmed. A
  referrer-restricted key would explain it; `YOUTUBE_API_REFERER` exists for
  that case.
- These steps rely on DNS, response headers and deployment data. Netlify and
  Cloudflare dashboard settings have not been inspected.
