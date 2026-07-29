import { dedupeByYouTubeId, interleaveArrays } from "@/lib/videoService";

/**
 * Interleaves the two sources the way the live site does, then drops any video
 * that reached the list twice.
 *
 * Kept free of imports from either fetcher on purpose: YouTube is fetched on
 * the server and Reddit in the browser, so the merge is the one piece both
 * sides share.
 */
export function mergeVideoSources(
  redditVideos: VideoData[],
  youtubeVideos: VideoData[],
): VideoData[] {
  return dedupeByYouTubeId(interleaveArrays([redditVideos, youtubeVideos]));
}
