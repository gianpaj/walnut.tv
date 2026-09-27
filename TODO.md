# Product backlog

Feature parity, migration bugs and release verification belong in
[MIGRATION-PLAN.md](./MIGRATION-PLAN.md). Keep this file for optional work that
does not block replacing the legacy app.

## Playback and sharing

- [ ] Native Reddit video playback, including audio and thumbnail handling.
      Both implementations filter listings to YouTube videos.
- [ ] Share action and copy-to-clipboard UI. Legacy has a modal and handler but
      no wired UI trigger; a usable share action is an enhancement.
- [ ] Decide whether to expose autoplay-next. It is disabled in both apps.
- [ ] Decide whether a video absent from the current feed should still play
      from a shared link. Both apps fall back to the first listed video.
- [ ] Optional `?debug` diagnostics comparable to the legacy console dump.

## Auth and custom channels

Keep built-in channels usable while signed out. These features do not require
up-front changes to the migration's routing or watched-store architecture.

- [ ] Google sign-in and logout; consider Reddit sign-in only for user-specific
      Reddit data. The design direction is Better Auth with Drizzle; choose between
      Supabase Postgres and Turso when implementing personalization.
- [ ] Add YouTube sources by URL and subreddit sources to a saved custom channel.
- [ ] Reorder channels and sources; prevent deleting the last channel or source.
- [ ] Choose a custom-channel URL namespace without changing built-in links.
- [ ] Sync watched history and merge local history on first login. Candidate
      records: ordered `user_channels` and `(user_id, youtube_id, watched_at)` history.
- [ ] Homepage channel scroller.
- [ ] In-app YouTube channel search; reuse the channel-management script's
      search behavior where appropriate and protect server credentials/quota.
