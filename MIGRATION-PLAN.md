# walnut.tv — Next.js migration plan (`dev` branch)

Status as of 2026-07-28. Baseline = the live site on `master` (Vue 1 + jQuery + gapi, `index.html` / `js/all.js` / `channels.js`).

---

## 1. State of the `dev` branch

**Provenance.** Branched off `master` around Feb 2024 (PR #232, "feat: Migration to Next.js 14"), last commit `12c5edd navbar` on **2025-11-12**. It is **16 commits ahead / 155 commits behind** `master`. `master` is still actively receiving channel additions and dependency bumps, so the gap grows.

**Stack.** Next 14.2.2 (App Router) · React 18 · TypeScript (strict, `noUncheckedIndexedAccess`) · Tailwind 3 · shadcn/ui + Radix · framer-motion · zustand (persisted) · pnpm · Node pinned to 24.9.0 via `.tool-versions`.

**Does it work?** Yes, mostly.

- `pnpm install --frozen-lockfile` — clean.
- `next build` — **compiles successfully**, then fails the lint gate on exactly one error:
  `src/lib/actions/youtube.ts:79` — `@typescript-eslint/no-unnecessary-type-assertion`, plus 2 unused-import warnings in `MobileNav.tsx`. Minutes to fix.
- `pnpm dev` — serves. `/` redirects to `/reddit`, navbar and spinner render.
- `/nonexistentchannel` returns **200 with a blank page** instead of 404.

**Shape of the code.**

```
src/app/[channel]/page.tsx   "use client" — fetches reddit OR youtube, renders VideoDisplay
src/app/page.tsx             redirect("/reddit")
src/app/layout.tsx           fonts, ThemeProvider (dark default), ToastProvider, Header
src/components/VideoDisplay  resizable 2-pane list + player (separate desktop/mobile trees)
src/components/VideoPlayer   plain YouTube <iframe> embed
src/hooks/use-video          zustand: watchedVideos / clickedVideos / currentVideoWatching
src/lib/actions/youtube.ts   axios → YouTube Data API v3, key is NEXT_PUBLIC_
src/lib/actions/reddit.ts    dead code (comment: "won't work because reddit denies server requests")
src/lib/data.ts              a *copy* of channels.js
```

---

## 2. Two findings that should shape the plan

### A. Reddit blocks server-side requests

Verified from this machine: `GET https://www.reddit.com/r/videos/hot.json?limit=5` → **403**, with and without a browser `User-Agent` (it returns an HTML block page, not JSON). The live site works because `reddit.js` runs **in the visitor's browser** from a residential IP.

`src/lib/actions/reddit.ts` already carries the comment *"This function won't work because reddit denies requests from the server"* — which is why `[channel]/page.tsx` is a client component doing its own `axios.get`.

Consequences:
- Server-rendering the Reddit channels on Vercel/Netlify will 403 out of the box.
- The proper fix is a Reddit OAuth **script app** (`client_credentials` → `oauth.reddit.com`), which *is* allowed from datacenter IPs and unlocks server-side caching. Needs a Reddit app registration.
- Until then, Reddit stays client-side.

### B. YouTube quota is the real bottleneck, and the migration is the fix

The live site has a hardcoded error string: *"Come back tomorrow, today's YouTube quota was used for /{channel}"* — this is a recurring production failure, not a hypothetical.

Per channel the code does 3 API calls (`channels.list` → `playlistItems.list` → `videos.list`). `hustle` has **65** YouTube channel IDs, so one visitor loading `/hustle` fires ~195 requests against a 10,000 unit/day quota. The key is public (`js/all.js` on master, `NEXT_PUBLIC_YOUTUBE_API_KEY` on dev), so it can also be scraped and burned by anyone.

`dev` "solves" this with `.splice(0, 3)` in `fetchYouTubeVideos` — it only ever queries the first 3 channels of a category. That's a parity regression standing in for the real fix.

**Moving fetching server-side with `revalidate` collapses N visitors × 195 requests into 195 requests per revalidation window.** This is the single biggest argument for finishing the migration, and it's what makes removing `.splice(0, 3)` affordable.

---

## 3. Feature-parity gap list

Ordered roughly by user impact.

| # | Live (`master`) | `dev` today | Notes |
|---|---|---|---|
| 1 | **YouTube IFrame Player API** with `onStateChange` / `onError` | plain `<iframe>` | Loses autoplay-next-on-end, auto-skip on unplayable video, and all player events |
| 2 | Keyboard ← / → prev-next; mobile prev/next SVG buttons | none | |
| 3 | URLs `/{channel}/{id}` via `replaceState` | `?v={id}` query param | **Breaks every shared/indexed link.** Also `404.html` + the `?p=` SPA shim must keep resolving |
| 4 | `/r/{subreddit}` — browse any subreddit ad hoc | missing | |
| 5 | All YouTube channel IDs queried | `.splice(0, 3)` — first 3 only | Quota hack; fix properly in Phase 2 |
| 6 | Shorts filter ≤ **120s** | ≤ **60s** | |
| 7 | `sortBy: 'new'` → sort by `publishedAt` desc | ignored | Affects hustle / ai / crypto |
| 8 | Reddit + YouTube results interleaved (`mixElementsFromArraysOfArrays`) | interleave exists for subreddits only, never for reddit×youtube | |
| 9 | Thumbnail = `img.youtube.com/vi/{id}/mqdefault.jpg` | `snippet.thumbnails.maxres.url` | `maxres` is frequently absent → falls through to `/img/notfound.jpg` |
| 10 | `localStorage['videosWatched']` | zustand `localStorage['video-storage']` | Existing users silently lose their watched history — migrate on first read |
| 11 | WATCHED badge over the thumbnail + dimmed title | `<Badge>` below the title, no dimming | Already in `TODO.md` items 2–4 |
| 12 | Loading message, empty state, quota-exhausted message, error message | none — blank screen | `setIsLoading(false)` fires immediately in the effect, so the spinner never covers the fetch |
| 13 | — | unknown channel → 200 blank | should call `notFound()`; `not-found.tsx` already exists and is unused |
| 14 | GA4 (`G-LJ7B0PVNZL`) + Firebase Analytics | none | |
| 15 | og:image, twitter card, canonical, `site.webmanifest`, full favicon set, `theme-color`, tippy tooltip on logo | `favicon.ico` + title/description only | |
| 16 | `?debug` console dump | none | nice-to-have |
| 17 | share modal + copy-to-clipboard | none | `share()` exists on master but has no UI trigger — arguably dead; `TODO.md` lists "share modal" |

**Not a regression:** both versions filter out Reddit-native (`v.redd.it`) videos. Rendering those is a `TODO.md` enhancement, not parity.

### The channels data problem (fix this first)

- `master` maintains `channels.js` at the repo root, and it is written by `scripts/add-youtube-channel.js`, validated by `scripts/check-channels.js` (`npm run prebuild`), and driven by the `.claude/skills/add-youtube-channel.md` skill.
- `dev` has a **fork** of it at `src/lib/data.ts`, which has already drifted:

| channel | master IDs | dev IDs | missing in dev | stale in dev |
|---|---|---|---|---|
| hustle | 65 | 65 | 4 | 4 |
| ai | 33 | 31 | 2 | 0 |
| crypto | 27 | 23 | 4 | 0 |

- On top of that, the channel list is **hardcoded a third time** in `components/navbar/Navbar.tsx` and `MobileNav.tsx`.

Three copies of the same list, one of which is the target of an automated workflow. This must collapse to one source before anything else, or every subsequent PR re-introduces drift.

### Not carried over from `master`

`CLAUDE.md` · `.claude/skills/` · `scripts/` (check-channels, add-youtube-channel, extract-youtube-channel-id) · `eslint.config.mjs` (dev is on the old `.eslintrc.cjs` + eslint 8) · `renovate.json` · `LICENSE.md` · `.github/workflows/claude.yml` · `img/`, `public/walnut.tv-og-image.png`, `site.webmanifest`, `browserconfig.xml`, `safari-pinned-tab.svg`, `404.html`.

---

## 4. The plan

### Phase 0 — Unblock (½ day)

1. **Merge `master` into `dev`** (merge, not rebase — 155 commits). Resolve by keeping `dev`'s app code and `master`'s `channels.js`, scripts, `.claude/`, `CLAUDE.md`, `LICENSE.md`, assets.
2. Fix the one lint error + two warnings → `pnpm build` green.
3. **Single source of truth for channels.** Recommendation: keep `channels.js` at the repo root (so `scripts/` and the skill keep working unchanged), convert it to `channels.mjs` with a named `channels` export, import it from `src/lib/data.ts` (which becomes types + helpers only), and update the two scripts to `import` instead of `require`. Delete the inline copies in `Navbar.tsx` / `MobileNav.tsx` and render the nav from the list.
4. **Do the Next.js upgrade now** (14.2 → current, React 18 → 19, eslint 8 → 9 flat config to match `master`) while the codebase is ~35 files. It only gets more expensive after Phase 1 and 2.
5. **CI**: a workflow running `pnpm build`, `tsc --noEmit`, `next lint`, and `node scripts/check-channels.js` on every PR. `master`'s `prebuild` check currently has no CI at all.

*Exit criteria:* green build on a merged branch, one channels list, CI enforcing it.

### Phase 1 — Behavioural parity (2–4 days)

6. **Restore `/{channel}/{id}` URLs.** Keep `?v={id}` as an accepted alias so nothing breaks twice. Verify the legacy `?p=/...` SPA-shim URLs from `404.html` still land correctly, or add explicit redirects.
7. **Real YouTube player.** Replace the raw `<iframe>` with the IFrame Player API (`react-youtube` or a small `useYouTubePlayer` hook) and restore `playerVars` parity (`rel: 0`, `iv_load_policy: 3`, `controls: 1`, `origin`), `onStateChange` → next-on-ENDED, `onError` → skip.
8. **Navigation:** ← / → keyboard handlers, mobile prev/next buttons, and re-add the sidebar auto-scroll that keeps the active item in view.
9. **Watched state:** read-and-migrate the legacy `videosWatched` key into the zustand store on first load; move the WATCHED badge on top of the thumbnail and dim the title (`TODO.md` 2–4).
10. **Fetching parity:** interleave reddit × youtube, honour `sortBy: 'new'`, shorts threshold back to 120s, thumbnails from the YouTube ID, remove `.splice(0, 3)` (Phase 2 makes this safe — until then it can stay behind a constant).
11. **States:** working loading spinner, empty state, quota-exhausted message, error message. `notFound()` for unknown channels.
12. **`/r/[subreddit]` route.**
13. **SEO / analytics / assets:** og:image, twitter card, canonical, manifest, full icon set, GA4 + Firebase, `robots.txt`, `sitemap.ts`.

*Exit criteria:* a checklist walk-through of the live site vs a deploy preview, feature by feature, on desktop and mobile.

### Phase 2 — Server-side fetching + caching (2–3 days) — the payoff

14. Move YouTube fetching into server components / route handlers with `revalidate` (suggest 30–60 min; the source data is "last 4 uploads"). Key becomes server-only — drop `NEXT_PUBLIC_`.
15. Register a **Reddit OAuth script app**, fetch via `client_credentials` → `oauth.reddit.com` server-side with `revalidate` ~10 min. Keep the existing client-side path as a fallback if the server call 403s.
16. Add a durable cache (Vercel KV / Netlify Blobs / Upstash) in front of both so cold starts and redeploys don't re-burn quota.
17. With caching in place, drop `.splice(0, 3)` and query all channel IDs.

*Exit criteria:* `/hustle` loads all 65 channels; the YouTube quota dashboard shows requests proportional to revalidations, not to traffic.

### Phase 3 — Cutover (1 day)

18. Deploy preview side-by-side with walnut.tv; verify the redirect map and that GA4 is still receiving events (`TODO.md` already flags this).
19. Point Netlify at `dev` (or move to Vercel — `master`'s README lists Vercel as the plan; the Vercel MCP tools are available in this session if you want to go that way).
20. Merge `dev` → `master`, delete the Vue app, update `CLAUDE.md` and `README.md`.

### Phase 4 — Auth + personalization

**Three things must be true before Phase 4 is cheap. Build them into Phases 1–2, not after:**

- **Channels resolve at runtime, not at import time.** Replace every `channels.find(c => c.title === slug)` with a single `getChannel(slug, user?)` that reads the built-in list first, then the signed-in user's saved channels. If Phase 1 hardcodes the import everywhere, Phase 4 becomes a rewrite.
- **Watched state sits behind an interface.** `useWatched()` with a localStorage adapter now, a Postgres adapter later, plus a merge-on-first-login path. Same for the URL/router state.
- **Decide the route shape once.** `/[channel]` for built-ins and `/my/[channel]` (or `/u/[user]/[channel]`) for custom ones — pick it in Phase 1 so links don't break a second time.

**Stack recommendation**

- **Auth: Auth.js (NextAuth) v5** with Google + **Reddit** providers. Free, self-hosted, and the Reddit provider doubles as a path to per-user Reddit data (saved posts, subscribed subreddits) later. Alternatives: Clerk (faster to ship, paid past the free tier), Supabase Auth (one vendor for auth + DB).
- **DB: Supabase Postgres** or **Neon**, with **Drizzle ORM** either way. Both have usable free tiers.
- **Schema sketch**

  ```
  users(id, email, image, created_at)
  user_channels(id, user_id, slug, title, position,
                subreddits[], youtube_channel_ids[], min_votes, sort_by)
  watched_videos(user_id, youtube_id, watched_at)   -- PK (user_id, youtube_id)
  ```

- **Feature backlog** (this is `TODO.md`'s "custom channels" section, made concrete):
  add a YouTube channel by URL · reorder channels (`position`) · guard against deleting the last channel or the last source in a channel · channel scroller on the homepage · login/logout UI · later: in-app YouTube channel search — `scripts/add-youtube-channel.js` already implements that search and can be lifted into a route handler.
- Everything stays usable signed-out; auth is purely additive.

---

## 5. Risks

| Risk | Mitigation |
|---|---|
| YouTube quota exhaustion (already happening in prod) | Phase 2 server caching; consider a quota-aware fallback that serves the last good cached payload |
| Reddit 403s / API policy changes | OAuth script app; keep the client-side path as fallback; the `is_video` path is already avoided |
| SEO regression from URL change + client rendering | Keep `/{channel}/{id}`, add redirects, server-render in Phase 2, add sitemap |
| `dev` keeps drifting from `master` | Merge in Phase 0 and keep merging weekly, or freeze channel edits on `master` during the migration |
| Public API keys | Phase 2 moves the YouTube key server-side; rotate it at cutover, since the current one has been in a public repo for years |

---

## 6. Suggested PR sequence

1. `chore: merge master into dev, fix build, add CI`
2. `refactor: single channels source of truth + data-driven navbar`
3. `chore: upgrade next / react / eslint`
4. `feat: youtube iframe player api, keyboard + prev/next nav`
5. `feat: restore /{channel}/{id} urls (+ ?v alias)`
6. `feat: loading / empty / error / 404 states`
7. `feat: fetching parity (interleave, sortBy, 120s, thumbnails)`
8. `feat: seo, icons, manifest, analytics`
9. `feat: server-side fetching + caching, drop splice(0,3)`
10. `chore: cutover`
