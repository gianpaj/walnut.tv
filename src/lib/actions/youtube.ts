import type { youtube_v3 } from "@googleapis/youtube";
import axios from "axios";
import type { AxiosResponse } from "axios";

import { getYouTubeChannelIds, type Channel } from "@/lib/data";
import { isShortDuration } from "@/lib/utils";
import { interleaveArrays, youtubeThumbnail } from "@/lib/videoService";

const API = "https://www.googleapis.com/youtube/v3";

/** The live site takes the 4 most recent uploads per channel. */
const MAX_VIDEOS_PER_CHANNEL = 4;

/**
 * Only the first few channels of a category are queried: each channel costs 3
 * YouTube Data API calls and `hustle` alone has 65 of them, which blows the
 * 10k/day quota on a handful of page views. Phase 2 moves this server-side
 * behind a cache, at which point the cap can be removed.
 */
const MAX_CHANNELS_PER_CATEGORY = 3;

function apiKey() {
  return process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
}

/** The 3-call dance: channel -> uploads playlist -> video details. */
export async function fetchChannelUploads(
  channelId: string,
): Promise<VideoData[]> {
  try {
    const channelRes: AxiosResponse<youtube_v3.Schema$ChannelListResponse> =
      await axios.get(`${API}/channels`, {
        params: { id: channelId, key: apiKey(), part: "contentDetails" },
      });

    const playlistId =
      channelRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!playlistId) return [];

    const playlistRes: AxiosResponse<youtube_v3.Schema$PlaylistItemListResponse> =
      await axios.get(`${API}/playlistItems`, {
        params: {
          part: "snippet",
          key: apiKey(),
          playlistId,
          maxResults: MAX_VIDEOS_PER_CHANNEL,
        },
      });

    const videoIds =
      playlistRes.data.items
        ?.map((item) => item.snippet?.resourceId?.videoId)
        .filter((id): id is string => Boolean(id)) ?? [];
    if (videoIds.length === 0) return [];

    const videosRes: AxiosResponse<youtube_v3.Schema$VideoListResponse> =
      await axios.get(`${API}/videos`, {
        params: {
          id: videoIds.join(","),
          key: apiKey(),
          part: "snippet,contentDetails",
        },
      });

    return (videosRes.data.items ?? [])
      .filter((item) => !isShortDuration(item.contentDetails?.duration ?? ""))
      .map((item): VideoData | null => {
        if (!item.id) return null;
        return {
          id: item.id,
          youtubeId: item.id,
          title: item.snippet?.title ?? "",
          thumbnail: youtubeThumbnail(item.id),
          url: `https://www.youtube.com/watch?v=${item.id}`,
          author: item.snippet?.channelTitle ?? "",
          publishedAt: item.snippet?.publishedAt ?? undefined,
        };
      })
      .filter((video): video is VideoData => video !== null);
  } catch (error) {
    // Most often a 403 once the daily quota is spent. One dead channel should
    // not take the whole page down, so it degrades to no videos.
    console.error(`Error fetching YouTube channel ${channelId}:`, error);
    return [];
  }
}

export async function fetchYouTubeVideos(
  channel: Channel,
): Promise<VideoData[]> {
  const channelIds = getYouTubeChannelIds(channel).slice(
    0,
    MAX_CHANNELS_PER_CATEGORY,
  );
  if (channelIds.length === 0) return [];

  const perChannel = await Promise.all(channelIds.map(fetchChannelUploads));

  // Rotate between channels so one prolific uploader does not fill the list.
  const videos = interleaveArrays(perChannel);

  if (channel.sortBy === "new") {
    return [...videos].sort(
      (a, b) =>
        new Date(b.publishedAt ?? 0).getTime() -
        new Date(a.publishedAt ?? 0).getTime(),
    );
  }

  return videos;
}
