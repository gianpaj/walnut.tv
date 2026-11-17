export function isVideoObject({ data }: RedditPost) {
  // FIXME: allow support reddit videos (rendering)
  // reddit videos
  if (data.is_video === true) return false;

  // debug only - return only reddit videos
  // return false;

  if (data.media !== null) {
    return data.media.type.includes("youtube.com"); // data.media.type.includes("vimeo.com")
  }
  return false;
}

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

/**
 * Pulls the YouTube video id out of a watch, youtu.be, shorts or embed URL.
 * Returns "" for anything else — without the host check this happily returned
 * the last path segment of any URL at all, so a non-YouTube Reddit link
 * produced a bogus id rather than being rejected.
 */
export function youtubeIdFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (!YOUTUBE_HOSTS.has(parsed.hostname)) return "";
    return (
      parsed.searchParams.get("v") ??
      parsed.pathname.split("/").filter(Boolean).pop()?.split("?")[0] ??
      ""
    );
  } catch {
    return "";
  }
}

/** mqdefault is what the live site uses; it exists for every video, unlike
 *  the maxres thumbnail the YouTube API reports. */
export function youtubeThumbnail(youtubeId: string) {
  return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
}

/**
 * A Reddit post linking to a YouTube video. `url` points at the Reddit thread,
 * matching the live site, so the title links to the discussion rather than
 * straight back to YouTube.
 */
export function redditPostToVideo({ data }: RedditPost): VideoData | null {
  const youtubeId = youtubeIdFromUrl(data.url);
  if (!youtubeId) return null;

  return {
    id: data.id,
    youtubeId,
    title: data.title,
    thumbnail: youtubeThumbnail(youtubeId),
    url: `https://www.reddit.com${data.permalink}`,
    author: data.author,
  };
}

/** Keeps the first occurrence of each YouTube video across all sources. */
export function dedupeByYouTubeId(videos: VideoData[]): VideoData[] {
  const seen = new Set<string>();
  return videos.filter((video) => {
    if (seen.has(video.youtubeId)) return false;
    seen.add(video.youtubeId);
    return true;
  });
}

/**
 * Takes one element from each array in rotation until every array is empty,
 * so no single subreddit or YouTube channel monopolises the top of the list.
 *
 * Channel A has 4 videos, B has 1 and C has 3:
 *
 *   input  = [[A1, A2, A3, A4], [B1], [C1, C2, C3]]
 *   output = [A1, B1, C1, A2, C2, A3, C3, A4]
 *
 * The legacy site rotated only until the shortest non-empty array ran out,
 * then appended the rest of each array in turn: [A1, B1, C1, A2, A3, A4, C2,
 * C3]. The two rules can only differ with three or more sources. Categories
 * sorted newest-first re-sort the result, so there the difference shows only
 * among videos with equal or missing publish times. Unsorted feeds, such as a
 * multi-subreddit Reddit category, follow this rotation.
 */
export function interleaveArrays<T>(arrayOfArrays: T[][]): T[] {
  // Copy: the rotation below consumes the arrays it is given.
  let remaining = arrayOfArrays.map((subArray) => [...subArray]);
  const result: T[] = [];
  while (remaining.length > 0) {
    remaining = remaining.filter((subArray) => {
      if (subArray.length > 0) {
        result.push(subArray.shift() as T);
        return true;
      }
      return false;
    });
  }
  return result;
}
