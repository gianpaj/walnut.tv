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

### Run it

```bash
cp .env.example .env.local   # then fill in your YouTube API key
pnpm install
pnpm dev
```

Open <http://localhost:3000>. It redirects to `/reddit`.

### Scripts

| Command               | What it does                                    |
| --------------------- | ----------------------------------------------- |
| `pnpm dev`            | Development server                              |
| `pnpm build`          | Validate channels, then build for production    |
| `pnpm start`          | Serve the production build                      |
| `pnpm lint`           | ESLint (`next lint` was removed in Next 16)     |
| `pnpm typecheck`      | `tsc --noEmit`                                  |
| `pnpm check-channels` | Check every YouTube channel ID in `channels.js` |

CI runs all of these on every pull request.

## Channels

The channel list is `channels.js` at the repo root. Adding a YouTube channel:

```bash
export YOUTUBE_API_KEY="your-api-key"
node scripts/add-youtube-channel.js "Lex Fridman" ai
pnpm check-channels
```

Pass `--justSearch` to preview the search results without editing the file.
Categories that take YouTube channels are `hustle`, `ai` and `crypto`;
`reddit`, `curious` and `docus` are sourced from subreddits.

## Built With

- [Next.js 16](https://nextjs.org/) — App Router, Turbopack
- [React 19](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/) on [Radix](https://www.radix-ui.com/)
- [zustand](https://zustand.docs.pmnd.rs/) for watched-video state
- [Framer Motion](https://motion.dev/)
- YouTube Data API v3 and the public Reddit JSON API

## Deployment

Automatically on Netlify. Vercel is under consideration for the cutover.

## License

[MIT](./LICENSE.md) — Gianfranco Palumbo and Alexander Kostinskyi.
