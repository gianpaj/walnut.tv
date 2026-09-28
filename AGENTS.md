# AGENTS.md

Guidance for coding agents working in this repository.

## What this is

**walnut.tv** curates videos by topic — Reddit's hottest video posts and recent
uploads from curated YouTube channels — and plays them in a list-plus-player
layout. Live at <https://walnut.tv>.

The repo is mid-migration. `master` still runs the original Vue 1 + jQuery
single-page app and is what walnut.tv serves today. `dev` is the Next.js
rewrite that will replace it. **Read `MIGRATION-PLAN.md` before starting
anything substantial** — it records the parity checklist and release gates.
Reddit requires server-side OAuth; YouTube API quota limits fetching frequency.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 7 in strict mode with
`noUncheckedIndexedAccess` · Tailwind 3 · shadcn/ui on Radix · zustand ·
framer-motion · pnpm · Node 24 (pinned in `.tool-versions`).

## Commands

```bash
pnpm install
pnpm dev              # Portless: https://walnut.localhost (use printed URL)
pnpm dev:direct       # plain Next.js: http://localhost:3000
pnpm build            # runs check-channels, then next build
pnpm start            # serve the production build
pnpm lint             # type-aware Oxlint
pnpm lint:fix         # apply lint fixes explicitly
pnpm format           # Oxfmt for code/config, Prettier for Markdown
pnpm format:check     # read-only formatting checks
pnpm typecheck        # tsc --noEmit
pnpm test             # node --test over src/**/*.test.ts
pnpm check-channels   # validate the YouTube channel IDs in channels.js
```

Tests use Node's built-in runner with native type stripping — no jest, vitest
or transform step. That means test files import with an explicit `.ts`
extension and can only use relative imports, not the `@/` alias.

CI (`.github/workflows/ci.yml`) runs install, check-channels, typecheck, test and
build on every PR. Formatting and linting run locally and in the pre-commit hook,
not CI.

Next's `experimental.useTypeScriptCli` enables build-time checking with TS7.
See [development tooling](./README.md#development-tooling) for formatter ownership
and the Husky/lint-staged workflow.

## Layout

```
channels.js               the channel list — see below, this one is special
src/app/                  App Router. Server components resolve the slug and
                          call notFound(); ChannelView fetches on the server.
                          robots.ts, sitemap.ts.
  [channel]/              /{channel} and /{channel}/{videoId}
  r/[subreddit]/          ad-hoc subreddit browsing, same two shapes
src/components/           ChannelView (fetch + states), VideoDisplay (list +
                          player), VideoPlayer (YT.Player), Analytics, navbar/
src/components/ui/        shadcn/ui primitives — regenerate, don't hand-edit
src/hooks/use-video.tsx   zustand store for watched / clicked video ids
src/hooks/use-media-query one layout is rendered at a time, not CSS-hidden
src/lib/data.ts           typed accessors over channels.js
src/lib/actions/          reddit.ts, youtube.ts, videos.ts (combines both)
src/lib/videoService.ts   filtering, interleaving, thumbnail and id helpers
src/lib/youtubeIframeApi  loads the IFrame API once per page
src/types/                global VideoData / RedditPost / Window augmentation
scripts/                  channel utilities and browser-acceptance fixtures,
                          excluded from tsconfig and Oxlint
public/                   icons, manifest, logo, og-image
```

### Do not add a route-level `loading.tsx`

A `loading.tsx` wraps its segment in Suspense, which makes every response
stream. Next cannot change an HTTP status once streaming has begun, so
`notFound()` silently degrades to a 200 with the 404 page rendered inside it.
Validate the route before any streaming boundary. `ChannelView` awaits
server-side fetching; there is no loading component. `NavigationProvider` uses
client transitions to show pending navigation and pause the old player without
starting a streaming response.

## channels.js is the single source of truth

The channel list lives at the repo root as **CommonJS**, not in `src/`, because
three things read or write it:

- `scripts/check-channels.js` validates every YouTube channel ID is exactly 24
  characters
- `scripts/add-youtube-channel.js` rewrites the file by regex
- the `add-youtube-channel` skill in `.claude/skills/` drives that script

The app reads it only through `src/lib/data.ts`, which adds the `Channel` type
and the `getChannel` / `getSubreddits` / `getYouTubeChannelIds` /
`channelLabel` accessors. **Do not copy the list into `src/`**; duplicate lists
can drift. Do not hardcode channel names in components either; the navbar
renders from the list.

Each entry has a `title` (also the URL slug), and then either `subreddit`
(semicolon-separated) with `minNumOfVotes`, or `youtubeChannels`
(semicolon-separated 24-character IDs) with an optional `sortBy: "new"`.

### Adding a YouTube channel

```bash
export YOUTUBE_API_KEY="..."
node scripts/add-youtube-channel.js "Lex Fridman" ai
node scripts/add-youtube-channel.js "Y Combinator" --justSearch   # preview only
pnpm check-channels
```

The configured categories are `hustle`, `ai`, and `crypto`, all YouTube-sourced.
The `/r/{subreddit}` routes display an unavailable message while Reddit access
is disabled. Check `channels.js` for the current category list.

## Environment

Copy `.env.example` to `.env.local`.

- `YOUTUBE_API_KEY` — server-side YouTube fetching and channel-management scripts.
  The fetcher accepts `NEXT_PUBLIC_YOUTUBE_API_KEY` as a compatibility fallback;
  prefer the server-only name.
- `YOUTUBE_API_REFERER` — optional Referer header for a referrer-restricted key.
- `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` — unused while Reddit is disabled;
  required only after approved access is re-enabled.
- `REDDIT_USER_AGENT` — optional override for the enabled integration's User-Agent.

Keep credentials in local or deployment environment configuration, not source.

## Two constraints worth knowing before you change data fetching

### Reddit access

`REDDIT_ENABLED` in `src/lib/features.ts` is `false`. Both exported fetchers in
`src/lib/actions/reddit.ts` return before credentials, tokens, or listings are
accessed. Reddit-only channels show an unavailable message; mixed channels can
still fetch YouTube. Setting credentials does not enable Reddit.

Re-enable only after explicit approval under Reddit's
[Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy).
Configure server-side credentials, update the disabled-mode tests, and verify
OAuth access from the deployment host. The retained implementation uses
`client_credentials` OAuth, per-instance token reuse, and ten-minute listing
revalidation. There is no browser fallback or public-JSON bypass.

### YouTube quota

**YouTube quota is the binding limit.** `src/lib/actions/youtube.ts` fetches all
configured channel IDs. Uploads-playlist lookups use thirty-day revalidation;
playlist items and video details use two-hour revalidation. Four candidate
uploads per channel are filtered by duration, then sorted when configured.
Keep the cache when changing this pipeline. Verify its sharing and persistence
on the deployment host before treating request volume as traffic-independent.

## Conventions

- Oxfmt owns code/config formatting, import order, and Tailwind class order.
  Prettier owns Markdown/MDX. Configs define generated/vendor exclusions.
- Import from `@/*` (mapped to `src/*`), except `channels.js`, which
  `src/lib/data.ts` reaches by relative path.
- Derive values during render; the lint config rejects `setState` inside an
  effect (`react/set-state-in-effect`).
- `src/components/ui/*` comes from shadcn/ui (`components.json`, base colour
  slate). Prefer regenerating over hand-editing.
- Deliberate version pins, with reasons, in the Next 16 upgrade commit:
  react-resizable-panels stays on v3 (v4 renamed its exports), Tailwind stays
  on 3 (v4 is a CSS-first rewrite), tailwind-merge stays on 2 (v3 targets
  Tailwind 4).

## Deployment

Production runs on Netlify from `master`; Vercel is the selected Next.js host.
Use explicit Preview deployments, not production promotion. Read
[deployment configuration](./README.md#deployment) before changing Vercel's
Git-build or branch policy, and follow the release gates in `MIGRATION-PLAN.md`.
