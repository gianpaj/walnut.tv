import axios from "axios";

import { getSubreddits, type Channel } from "@/lib/data";
import {
  dedupeByYouTubeId,
  interleaveArrays,
  isVideoObject,
  redditPostToVideo,
} from "@/lib/videoService";

const LISTING_LIMIT = 50;
const DEFAULT_MIN_VOTES = 3;

/**
 * Runs in the browser on purpose. reddit.com answers 403 to requests from
 * datacenter IPs, so this cannot move server-side without registering a Reddit
 * OAuth script app and going through oauth.reddit.com. See MIGRATION-PLAN.md
 * phase 2.
 */
export async function fetchSubredditVideos(
  subreddit: string,
  minVotes: number,
): Promise<VideoData[]> {
  const response = await axios.get<RedditResponseData>(
    `https://www.reddit.com/r/${subreddit}/hot.json?limit=${LISTING_LIMIT}`,
  );

  return response.data.data.children
    .filter(isVideoObject)
    .filter((post) => post.data.score >= minVotes)
    .map(redditPostToVideo)
    .filter((video): video is VideoData => video !== null);
}

/** Fetches every subreddit of a channel and interleaves the results. */
export async function fetchRedditVideos(
  channel: Channel,
): Promise<VideoData[]> {
  const subreddits = getSubreddits(channel);
  if (subreddits.length === 0) return [];

  const minVotes = channel.minNumOfVotes ?? DEFAULT_MIN_VOTES;
  const perSubreddit = await Promise.all(
    subreddits.map((subreddit) => fetchSubredditVideos(subreddit, minVotes)),
  );

  return dedupeByYouTubeId(interleaveArrays(perSubreddit));
}
