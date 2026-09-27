# Reddit access disabled pending approval

## Decision

Keep the OAuth implementation and caches, but disable both exported fetchers
with `REDDIT_ENABLED = false` in `src/lib/features.ts`. A code-level switch makes
re-enabling an explicit reviewable change; credentials alone cannot enable it.
Commenting out or deleting the integration was rejected as harder to maintain.
See [Reddit access](../../../../AGENTS.md#reddit-access) for re-enabling requirements.

`ChannelView` displays an unavailable message for Reddit-only channels before
fetching. Mixed-source channels retain their YouTube path. Reddit parity checks
are paused, not passed; YouTube fetching and error handling are unchanged.

## Verification

- Regression test: both Reddit exports return empty results with zero fetch calls,
  with and without credentials. Node test-only resolution hooks load the real
  server module without changing application imports or the server-only boundary.
- Passed: 19 tests, typecheck, Oxlint, format check, channel validation, and build.
- Local production build at `http://127.0.0.1:3100`: `/r/videos`, its video path,
  `?v=` link, and an invalid subreddit name all returned 200 with the unavailable
  message, without YouTube quota wording. Hustle, AI, and Crypto returned 200
  without that message. API keys were blank for this smoke test; live playback
  was not verified.
- `agent-browser` Chromium: inspected body screenshots at 1440×900 and 390×844
  viewports. The message is visible and wraps on mobile. This intentional disabled
  state is not legacy Reddit UI parity. Test server and browser were stopped.

[Desktop screenshot](./2026-09-27-reddit-disabled/desktop.png) ·
[Mobile screenshot](./2026-09-27-reddit-disabled/mobile.png)

The editor's private-file rule blocked `.env.example`; it and `.env.local` were
not edited. Existing user package/lockfile changes remain outside this commit.
