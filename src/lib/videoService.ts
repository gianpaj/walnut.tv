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

/** Pulls the YouTube video id out of a watch, youtu.be or embed URL. */
export function youtubeIdFromUrl(url: string) {
  try {
    const parsed = new URL(url);
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
 * Takes one element from each array in rotation, so no single subreddit or
 * YouTube channel monopolises the top of the list.
 *
 * input = [[1,2,3], [4,5,6,7,8], [9,10]];
 * output = [1, 4, 9, 2, 5, 10, 3, 6, 7, 8]
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
