// The channel list lives at the repo root in `channels.js` (CommonJS) because it
// is also read and written by `scripts/check-channels.js`,
// `scripts/add-youtube-channel.js` and the `add-youtube-channel` Claude skill.
// This module is the only place the app should read it from.
import { channels as rawChannels } from "../../channels.js";

export interface Channel {
  /** URL slug and display name, e.g. "ai" -> /ai */
  title: string;
  /** One or more subreddits, semicolon separated */
  subreddit?: string;
  /** One or more 24-character YouTube channel IDs, semicolon separated */
  youtubeChannels?: string;
  /** Minimum Reddit score for a post to be included */
  minNumOfVotes?: number;
  /** "new" sorts YouTube results by publishedAt descending */
  sortBy?: string;
}

export const channels = rawChannels as Channel[];

export function getChannel(slug: string): Channel | undefined {
  return channels.find((channel) => channel.title === slug);
}

export function getSubreddits(channel: Channel): string[] {
  return channel.subreddit?.split(";").filter(Boolean) ?? [];
}

export function getYouTubeChannelIds(channel: Channel): string[] {
  return channel.youtubeChannels?.split(";").filter(Boolean) ?? [];
}

/** Titles are lowercase slugs; these render differently in the nav. */
const LABEL_OVERRIDES: Record<string, string> = { ai: "AI" };

export function channelLabel(channel: Channel): string {
  return (
    LABEL_OVERRIDES[channel.title] ??
    channel.title.charAt(0).toUpperCase() + channel.title.slice(1)
  );
}
