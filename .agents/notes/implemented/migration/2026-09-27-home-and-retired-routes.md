# Homepage and retired category routes

## Decision

The user chose Hustle as the homepage and redirects home for retired categories.
`next.config.mjs` owns these redirects; no root page component is needed.
The homepage uses 307 so its default can change without a permanent cached redirect.
Retired category and single-video paths use 308 to `/`; their video destination
is not preserved. Unknown categories retain 404 responses.
Restoring retired feeds and returning 404 for known retired links were rejected.

## Verification

Tested the R1 working tree based on `65687e9`, using a local production build at
`http://127.0.0.1:3100` and the `agent-browser` CLI's Chromium session `walnut-r1`.

- HTTP: `/` returned 307 to `/hustle`; all three retired category paths and
  their `/test-video` variants returned 308 to `/`. Unknown category and video
  paths returned 404.
- Browser: opening `/` and `/curious/test-video` reached `/hustle`.
- Paired captures: local `/hustle` and `http://walnut.tv` (resolved to HTTPS),
  at 1440×900 and 390×844. Local showed the quota/empty-feed message;
  live showed loading. These are not matching loaded-content states and do not
  establish player, feed or UI parity. The local message does not prove quota
  exhaustion; see D1 in `MIGRATION-PLAN.md`.
- Screenshots: `.next/parity-r1/{next,live}-{desktop,mobile}.png` (local,
  disposable build artifacts). The editor's file-scan exclusions blocked image
  reads, so visual inspection remains incomplete. Browser snapshots were read.
- Passed: 18 tests, typecheck, application/config ESLint, production build with
  channel validation, and Prettier for the changed code. Full repository lint
  has the existing untracked skill-file limitation recorded in the audit note.

Loaded-feed, logo interaction and screenshot parity checks remain open in the
canonical migration checklist. The temporary server and browser were closed.
