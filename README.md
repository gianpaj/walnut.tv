# walnut.tv [![Netlify Status](https://api.netlify.com/api/v1/badges/1fa27190-a5c1-4017-b984-052a0ca3b04e/deploy-status)](https://app.netlify.com/sites/walnut/deploys) [![Depfu](https://badges.depfu.com/badges/f36f8f88cedc8a59f152898cbdaf3ccf/overview.svg)](https://depfu.com/github/gianpaj/walnut.tv?project_id=24383)

[![walnut.tv](https://raw.githubusercontent.com/gianpaj/walnut.tv/master/public/walnut.tv-og-image.png)](https://walnut.tv)

[![Stand With Ukraine](https://raw.githubusercontent.com/vshymanskyy/StandWithUkraine/main/banner2-direct.svg)](https://vshymanskyy.github.io/StandWithUkraine)

<a href="https://www.producthunt.com/posts/walnut-2?utm_source=badge-featured&utm_medium=badge&utm_souce=badge-walnut-2" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=151473&theme=dark" alt="Walnut - The hottest videos from Reddit in the last 24 hours 📺🔥 | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>

Your dose of daily videos on AI, Crypto, Entrepreneurship, Reddit, Documentaries.

Each channel pulls from one of two sources — the hottest video posts in a set
of subreddits, or the latest uploads from a curated list of YouTube channels —
and plays them in a list-plus-player layout at <https://walnut.tv>.

> **This branch is the Next.js rewrite.** walnut.tv currently serves the
> original Vue 1 app from `master`. See [MIGRATION-PLAN.md](./MIGRATION-PLAN.md)
> for what still stands between this branch and feature parity, and
> [AGENTS.md](./AGENTS.md) for how the codebase is put together.

## Getting Started

### Prerequisites

- Node.js 24 (see `.tool-versions`)
- pnpm 10
- A [YouTube Data API v3](https://developers.google.com/youtube/v3/getting-started) key

See [Environment](./AGENTS.md#environment) for the server-side variable names.

### Run it

```bash
cp .env.example .env.local   # then fill in server-side API credentials
pnpm install
pnpm dev
```

Open the URL printed by Portless, normally <https://walnut.localhost>.
The homepage redirects to `/hustle`. Saved proxy settings can add a port, such as
`https://walnut.localhost:1355`.

Portless 0.15.6 is a dev dependency; no global installation is required. The dev
script selects `.localhost` and loopback-only mode. `.local` is reserved for
Bonjour/mDNS and is not used for this local-only setup. The first HTTPS proxy
startup can request permission to bind port 443, trust its local CA, or sync hosts.
If an existing proxy uses incompatible TLD/LAN settings, Portless reports the
conflict; do not stop another project's proxy without checking it first.

Use `pnpm dev:direct` for plain Next.js at <http://localhost:3000> without Portless.
These are different browser origins, so their cookies and watched-history storage
are separate.

### Scripts

| Command               | What it does                                        |
| --------------------- | --------------------------------------------------- |
| `pnpm dev`            | Portless development server at `walnut.localhost`   |
| `pnpm dev:direct`     | Plain Next.js development server                    |
| `pnpm build`          | Validate channels, then build for production        |
| `pnpm start`          | Serve the production build                          |
| `pnpm lint`           | Type-aware Oxlint checks                            |
| `pnpm lint:fix`       | Apply lint fixes explicitly                         |
| `pnpm format`         | Format code/config and Markdown                     |
| `pnpm format:check`   | Check formatting without changes                    |
| `pnpm typecheck`      | `tsc --noEmit`                                      |
| `pnpm test`           | Node's built-in test runner over `src/**/*.test.ts` |
| `pnpm check-channels` | Check every YouTube channel ID in `channels.js`     |

CI runs channel validation, typecheck, tests, and the production build on every
pull request. Formatting and linting run locally and in the pre-commit hook, not CI.

### Browser acceptance

After `pnpm build`, run `python3 scripts/browser-acceptance/fixtures.py` with
Python 3 and the `agent-browser` CLI/Chrome installed. The bounded suite uses
synthetic feeds and an instrumented player; it does not verify real API access,
playback, or deployment caching. See [the harness guide](./scripts/browser-acceptance/README.md)
for prerequisites, output, and known browser-runner limits. Real-feed and
screenshot-parity requirements remain in [MIGRATION-PLAN.md](./MIGRATION-PLAN.md).

### Development tooling

- **TypeScript 7:** `tsc --noEmit` checks types. Next.js uses
  `experimental.useTypeScriptCli` for build-time checking.
- **Oxlint:** `.oxlintrc.jsonc` configures native React, Next.js, accessibility,
  and type-aware rules. ESLint is not required.
- **Oxfmt:** `.oxfmtrc.json` configures 100-column code/config formatting,
  import grouping, and Tailwind 3 class sorting. Generated shadcn components,
  script-managed `channels.js`, and vendored/local tooling are excluded.
- **Prettier:** formats Markdown/MDX, including plans and agent notes, without
  code-formatting plugins. Oxfmt excludes these files.

`pnpm install` installs Husky's pre-commit hook. lint-staged formats staged
code/config files, then runs whole-project lint without autofixes. Markdown-only
commits run Prettier. Default backup and partial-staging protection remain enabled.
Whole-project lint can fail on unrelated unstaged edits. CI checks types, tests,
and the build from a clean checkout; it does not repeat formatting or linting.

Configure your editor to use Oxfmt for supported code/config languages, Oxlint
for diagnostics, and Prettier for Markdown/MDX. Disable competing ESLint/Biome
format-on-save for this workspace. GUI Git clients need Node and pnpm on their
PATH; use Husky's user-level initialization if needed, not machine-specific paths
in the repository hook.

## Channels

The channel list is `channels.js` at the repo root. Adding a YouTube channel:

```bash
export YOUTUBE_API_KEY="your-api-key"
node scripts/add-youtube-channel.js "Lex Fridman" ai
pnpm check-channels
```

Pass `--justSearch` to preview the search results without editing the file.
The configured categories are `hustle`, `ai`, and `crypto`, all YouTube-sourced.
Reddit browsing is disabled pending API approval; `/r/{subreddit}` and its video
links display an unavailable message without contacting Reddit. Credentials are
not needed while disabled. See [Reddit access](./AGENTS.md#reddit-access) for the
switch and re-enabling requirements.

## Built With

- [Next.js 16](https://nextjs.org/) — App Router, Turbopack
- [React 19](https://react.dev/)
- [TypeScript 7](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/) on [Radix](https://www.radix-ui.com/)
- [zustand](https://zustand.docs.pmnd.rs/) for watched-video state
- [Framer Motion](https://motion.dev/)
- YouTube Data API v3 with server-side Next Data Cache; Reddit OAuth integration
  retained but disabled pending approval

## Deployment

Automatically on Netlify. Vercel is under consideration for the cutover.

## License

[MIT](./LICENSE.md) — Gianfranco Palumbo and Alexander Kostinskyi.
