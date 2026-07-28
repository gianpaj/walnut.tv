# AGENTS.md

Guidance for coding agents working in this repository.

## What this is

**walnut.tv** curates videos by topic — Reddit's hottest video posts and recent
uploads from curated YouTube channels — and plays them in a list-plus-player
layout. Live at <https://walnut.tv>.

The repo is mid-migration. `master` still runs the original Vue 1 + jQuery
single-page app and is what walnut.tv serves today. `dev` is the Next.js
rewrite that will replace it. **Read `MIGRATION-PLAN.md` before starting
anything substantial** — it records the current parity gaps, the phase
ordering, and two constraints that shape most decisions here (Reddit blocks
server-side requests; YouTube API quota is the binding limit).

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript in strict mode with
`noUncheckedIndexedAccess` · Tailwind 3 · shadcn/ui on Radix · zustand ·
framer-motion · pnpm · Node 24 (pinned in `.tool-versions`).

## Commands

```bash
pnpm install
pnpm dev              # http://localhost:3000
pnpm build            # runs check-channels, then next build
pnpm start            # serve the production build
pnpm lint             # eslint . (next lint was removed in Next 16)
pnpm typecheck        # tsc --noEmit
pnpm check-channels   # validate the YouTube channel IDs in channels.js
```

CI (`.github/workflows/ci.yml`) runs install, check-channels, typecheck, lint
and build on every PR. All four must pass.

## Layout

```
channels.js               the channel list — see below, this one is special
src/app/                  App Router. Server components resolve the slug and
                          call notFound(); fetching happens below them, in a
                          client component. robots.ts, sitemap.ts.
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
scripts/                  standalone CommonJS Node utilities, excluded from
                          tsconfig and eslint
public/                   icons, manifest, logo, og-image
```

### Do not add a route-level `loading.tsx`

A `loading.tsx` wraps its segment in Suspense, which makes every response
stream. Next cannot change an HTTP status once streaming has begun, so
`notFound()` silently degrades to a 200 with the 404 page rendered inside it.
The app had exactly that bug. The loading spinner lives in
`src/components/LoadingPage.tsx` and is rendered as component state instead.

## channels.js is the single source of truth

The channel list lives at the repo root as **CommonJS**, not in `src/`, because
three things read or write it:

- `scripts/check-channels.js` validates every YouTube channel ID is exactly 24
  characters
- `scripts/add-youtube-channel.js` rewrites the file by regex
- the `add-youtube-channel` skill in `.claude/skills/` drives that script

The app reads it only through `src/lib/data.ts`, which adds the `Channel` type
and the `getChannel` / `getSubreddits` / `getYouTubeChannelIds` /
`channelLabel` accessors. **Do not copy the list into `src/`** — it was
duplicated there once before and silently drifted by ten channel IDs. Do not
hardcode channel names in components either; the navbar renders from the list.

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

Categories that take YouTube channels: `hustle`, `ai`, `crypto`. The others
(`reddit`, `curious`, `docus`) are Reddit-sourced.

## Environment

Copy `.env.example` to `.env.local`.

- `NEXT_PUBLIC_YOUTUBE_API_KEY` — used by the browser today, because fetching
  is still client-side. Phase 2 makes this a server-only `YOUTUBE_API_KEY`.
- `YOUTUBE_API_KEY` — used by the scripts in `scripts/`.

## Two constraints worth knowing before you change data fetching

**Reddit answers 403 to server-side requests.** Verified from a datacenter IP,
with and without a browser User-Agent. That is why `src/app/[channel]/page.tsx`
is a client component fetching `reddit.com/r/*/hot.json` from the browser, and
why `src/lib/actions/reddit.ts` is dead code carrying a comment saying so.
Moving this server-side requires a Reddit OAuth script app against
`oauth.reddit.com`.

**YouTube quota is the binding limit.** Each channel costs 3 API calls and
`hustle` alone has 65 channel IDs, against a 10,000 unit/day quota. That is why
`fetchYouTubeVideos` caps itself at `MAX_CHANNELS_PER_CATEGORY = 3` — a
deliberate parity regression that phase 2 removes once fetching is server-side
and cached. Do not raise that cap without the cache.

## Conventions

- Prettier with `@ianvs/prettier-plugin-sort-imports` and
  `prettier-plugin-tailwindcss` — let it decide import order and class order.
- Import from `@/*` (mapped to `src/*`), except `channels.js`, which
  `src/lib/data.ts` reaches by relative path.
- Derive values during render; the lint config rejects `setState` inside an
  effect (`react-hooks/set-state-in-effect`).
- `src/components/ui/*` comes from shadcn/ui (`components.json`, base colour
  slate). Prefer regenerating over hand-editing.
- Deliberate version pins, with reasons, in the Next 16 upgrade commit:
  react-resizable-panels stays on v3 (v4 renamed its exports), Tailwind stays
  on 3 (v4 is a CSS-first rewrite), tailwind-merge stays on 2 (v3 targets
  Tailwind 4).

## Deployment

Netlify today, from `master`. Vercel is under consideration for the cutover —
see phase 3 of `MIGRATION-PLAN.md`.
