# Migration parity audit

## Decision

Keep `MIGRATION-PLAN.md` as the canonical parity and release checklist.
Use `TODO.md` for optional product work, not a second migration checklist.
Separate source-level implementation from browser and deployment verification;
reject a blanket “Phase 1 complete” label and speculative infrastructure work.
This audit changes documentation only; application fixes remain open.

## Evidence

- Reviewed PR #325's description, file diff and checks. Its head is `962fbcb`;
  local `dev` is `b7281fa`, with identical `src/` but different channel data.
- Compared against `master` at `561d929`: `index.html`, `js/all.js`, `404.html`
  and `channels.js`. Current channel data matches master apart from exports.
- The PR description's client-side Reddit claim conflicts with the server-only
  OAuth implementation. Both fetchers already use Next's Data Cache.
- Local `/` redirects to absent `/reddit`; `?p=` has no decoder. Error handling
  conflates empty feeds and quota failure. The checklist records other gaps,
  including duration parsing, mobile scrolling and pending navigation.
- Preserved optional auth/custom-channel direction in `TODO.md`; no database,
  adapter or extra cache is a migration prerequisite.
- On 2026-09-27, the PR's linked Netlify preview returned “Site not found.”
  A browser snapshot of walnut.tv showed HUSTLE, AI and CRYPTO navigation plus
  “Loading Videos.” This was not a successful playback or mobile parity test.

## Validation

Node 24.9.0, pnpm 10.27.0:

- Passed: `pnpm check-channels`, `pnpm typecheck`, `pnpm test` (16 tests),
  `pnpm build`, and application-only `pnpm exec eslint src`.
- `pnpm lint` failed with project-service parsing errors for three untracked
  `.agents/skills/remotion-best-practices/rules/assets/*.tsx` examples.
  Existing local skill/editor files were left untouched and out of the commit.
- No live API, player, storage-migration or deployment-cache acceptance passed
  as part of this audit. A working preview and API access are the next gates.
