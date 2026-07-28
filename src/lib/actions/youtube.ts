import type { youtube_v3 } from "@googleapis/youtube";
import axios from "axios";
import type { AxiosResponse } from "axios";

import { getChannel, getYouTubeChannelIds } from "@/lib/data";
import { isShortDuration } from "@/lib/utils";

export const getYouTubeChannelSearch = async (channelId: string) => {
  return axios
    .get("https://www.googleapis.com/youtube/v3/channels", {
      params: {
        id: channelId,
        key: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY,
        part: "contentDetails",
      },
    })
    .then(
      (res: AxiosResponse<youtube_v3.Schema$ChannelListResponse>) =>
        res.data?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads,
    )
    .then((playlistId: string | undefined) =>
      axios.get("https://www.googleapis.com/youtube/v3/playlistItems", {
        params: {
          part: "snippet",
          key: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY,
          playlistId,
          maxResults: 4,
        },
      }),
    )
    .then((res: AxiosResponse<youtube_v3.Schema$PlaylistItemListResponse>) =>
      res.data.items?.map((item) => item.snippet?.resourceId?.videoId),
    )
    .then((videoIDs: (string | null | undefined)[] | undefined) =>
      axios.get("https://www.googleapis.com/youtube/v3/videos", {
        params: {
          id: videoIDs?.join(","),
          key: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY,
          part: "snippet,contentDetails",
        },
      }),
    )
    .then((res: AxiosResponse<youtube_v3.Schema$VideoListResponse>) => {
      return (
        res.data.items?.map((item) => {
          if (isShortDuration(item.contentDetails?.duration ?? "")) return null;
          return {
            id: item.id!,
            title: item.snippet?.title,
            url: `https://www.youtube.com/watch?v=${item.id}`,
            // duration: item.contentDetails?.duration,
            thumbnail: item.snippet?.thumbnails?.maxres?.url,
            // publishedAt: item.snippet?.publishedAt,
            author: item.snippet?.channelTitle,
          } as VideoData;
        }) ?? []
      );
    })
    .catch((err) => {
      console.error("Error fetching YouTube videos:", err);
      return [];
    });
};

/**
 * Only the first few channels of a category are queried: each channel costs 3
 * YouTube Data API calls and `hustle` alone has 65 of them, which blows the
 * 10k/day quota on a handful of page views. Phase 2 moves this server-side
 * behind a cache, at which point the cap can be removed.
 */
const MAX_CHANNELS_PER_CATEGORY = 3;

export async function fetchYouTubeVideos({ title }: { title: string }) {
  const channel = getChannel(title);
  if (!channel) return [];

  const channelIds = getYouTubeChannelIds(channel).slice(
    0,
    MAX_CHANNELS_PER_CATEGORY,
  );
  if (channelIds.length === 0) return [];

  const allVideos = await Promise.all(
    channelIds.map((channelId) => getYouTubeChannelSearch(channelId)),
  )
    .then((res) => res.flat())
    .then((res) => res.filter((item): item is VideoData => item !== null));

  return allVideos;
}
