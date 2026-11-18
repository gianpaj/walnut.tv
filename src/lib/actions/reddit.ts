import "server-only";
import { getSubreddits, type Channel } from "@/lib/data";
import { REDDIT_ENABLED } from "@/lib/features";
import {
  dedupeByYouTubeId,
  interleaveArrays,
  isVideoObject,
  redditPostToVideo,
} from "@/lib/videoService";

const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const API = "https://oauth.reddit.com";

const LISTING_LIMIT = 50;
const DEFAULT_MIN_VOTES = 3;

/** Hot listings turn over quickly, so a shorter window than YouTube's. */
const REVALIDATE_SECONDS = 60 * 10;

/** Reddit asks for platform:app-id:version (by /u/username). */
function userAgent() {
  return process.env.REDDIT_USER_AGENT ?? "web:walnut.tv:2.0.0 (by /u/gianpaj)";
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

// Per server instance. client_credentials tokens last an hour, so this saves a
// round trip on nearly every request without needing shared storage.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET are required to fetch Reddit");
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent(),
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Reddit token request failed with ${response.status} ${response.statusText}`);
  }

  const token = (await response.json()) as TokenResponse;
  cachedToken = {
    value: token.access_token,
    // A minute of slack so a token never expires mid-flight.
    expiresAt: Date.now() + (token.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

/** Fetch listings through server-side OAuth only when approved access is enabled. */
export async function fetchSubredditVideos(
  subreddit: string,
  minVotes: number,
): Promise<VideoData[]> {
  if (!REDDIT_ENABLED) return [];

  const token = await getAccessToken();

  const response = await fetch(`${API}/r/${subreddit}/hot?limit=${LISTING_LIMIT}&raw_json=1`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": userAgent(),
    },
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`Reddit /r/${subreddit} failed with ${response.status} ${response.statusText}`);
  }

  const listing = (await response.json()) as RedditResponseData;

  return listing.data.children
    .filter(isVideoObject)
    .filter((post) => post.data.score >= minVotes)
    .map(redditPostToVideo)
    .filter((video): video is VideoData => video !== null);
}

/** Fetches every subreddit of a channel and interleaves the results. */
export async function fetchRedditVideos(channel: Channel): Promise<VideoData[]> {
  if (!REDDIT_ENABLED) return [];

  const subreddits = getSubreddits(channel);
  if (subreddits.length === 0) return [];

  const minVotes = channel.minNumOfVotes ?? DEFAULT_MIN_VOTES;
  const perSubreddit = await Promise.all(
    subreddits.map((subreddit) => fetchSubredditVideos(subreddit, minVotes)),
  );

  return dedupeByYouTubeId(interleaveArrays(perSubreddit));
}
