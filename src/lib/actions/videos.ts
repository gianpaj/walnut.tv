import "server-only";
import type { FeedIssue, FeedResult } from "@/lib/actions/feed";
import { fetchRedditVideos } from "@/lib/actions/reddit";
import { fetchYouTubeVideos } from "@/lib/actions/youtube";
import type { Channel } from "@/lib/data";
import { dedupeByYouTubeId, interleaveArrays } from "@/lib/videoService";

/** Fetch enabled sources independently so one failure does not discard the other feed. */
export async function fetchChannelVideos(channel: Channel): Promise<FeedResult> {
  const [reddit, youtube] = await Promise.allSettled([
    fetchRedditVideos(channel),
    fetchYouTubeVideos(channel),
  ]);

  const issues: FeedIssue[] = [];
  if (reddit.status === "rejected") {
    issues.push({ source: "reddit", reason: "fetch-failed" });
  }
  if (youtube.status === "rejected") {
    issues.push({ source: "youtube", reason: "fetch-failed" });
  } else {
    issues.push(...youtube.value.issues);
  }

  const videos = dedupeByYouTubeId(
    interleaveArrays([
      reddit.status === "fulfilled" ? reddit.value : [],
      youtube.status === "fulfilled" ? youtube.value.videos : [],
    ]),
  );

  return {
    videos,
    issues,
  };
}
