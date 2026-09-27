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
- Reddit OAuth app credentials for `/r/{subreddit}` browsing

See [Environment](./AGENTS.md#environment) for the server-side variable names.

### Run it

```bash
cp .env.example .env.local   # then fill in server-side API credentials
pnpm install
pnpm dev
```

Open <http://localhost:3000>. The homepage redirects to `/hustle`.

### Scripts

| Command               | What it does                                        |
| --------------------- | --------------------------------------------------- |
| `pnpm dev`            | Development server                                  |
| `pnpm build`          | Validate channels, then build for production        |
| `pnpm start`          | Serve the production build                          |
| `pnpm lint`           | Type-aware Oxlint checks                            |
| `pnpm lint:fix`       | Apply lint fixes explicitly                         |
| `pnpm format`         | Format code/config and Markdown                     |
| `pnpm format:check`   | Check formatting without changes                    |
| `pnpm typecheck`      | `tsc --noEmit`                                      |
| `pnpm test`           | Node's built-in test runner over `src/**/*.test.ts` |
| `pnpm check-channels` | Check every YouTube channel ID in `channels.js`     |

CI runs formatting checks, channel validation, typecheck, lint, tests, and the
production build on every pull request.

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
Whole-project lint can fail on unrelated unstaged edits; CI checks a clean checkout.

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
The configured categories are `hustle`, `ai`, and `crypto`. Browse an arbitrary
subreddit at `/r/{subreddit}`; Reddit OAuth credentials are required.

## Built With

- [Next.js 16](https://nextjs.org/) — App Router, Turbopack
- [React 19](https://react.dev/)
- [TypeScript 7](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/) on [Radix](https://www.radix-ui.com/)
- [zustand](https://zustand.docs.pmnd.rs/) for watched-video state
- [Framer Motion](https://motion.dev/)
- YouTube Data API v3 and Reddit OAuth API, fetched server-side through Next's
  Data Cache

## Deployment

Automatically on Netlify. Vercel is under consideration for the cutover.

## License

[MIT](./LICENSE.md) — Gianfranco Palumbo and Alexander Kostinskyi.
