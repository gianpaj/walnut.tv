import "server-only";

import { fetchRedditVideos } from "@/lib/actions/reddit";
import { fetchYouTubeVideos } from "@/lib/actions/youtube";
import type { Channel } from "@/lib/data";
import { dedupeByYouTubeId, interleaveArrays } from "@/lib/videoService";

export interface ChannelVideosResult {
  videos: VideoData[];
  /** True when a source threw rather than simply returning nothing. */
  failed: boolean;
}

/**
 * Both sources, fetched and cached on the server, interleaved the way the live
 * site does. Settled rather than all-or-nothing: if Reddit is unreachable the
 * YouTube half should still render, and vice versa.
 */
export async function fetchChannelVideos(
  channel: Channel,
): Promise<ChannelVideosResult> {
  const [reddit, youtube] = await Promise.allSettled([
    fetchRedditVideos(channel),
    fetchYouTubeVideos(channel),
  ]);

  for (const result of [reddit, youtube]) {
    if (result.status === "rejected") {
      console.error(
        `Error fetching videos for /${channel.title}:`,
        result.reason,
      );
    }
  }

  const videos = dedupeByYouTubeId(
    interleaveArrays([
      reddit.status === "fulfilled" ? reddit.value : [],
      youtube.status === "fulfilled" ? youtube.value : [],
    ]),
  );

  return {
    videos,
    failed: reddit.status === "rejected" || youtube.status === "rejected",
  };
}
