import type { youtube_v3 } from "@googleapis/youtube";
import axios from "axios";
import type { AxiosResponse } from "axios";

import { channels } from "@/lib/data";
import { isShortDuration } from "@/lib/utils";
import type { VideoData } from "@/types";

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
    .then((res: AxiosResponse<youtube_v3.Schema$PlaylistItemListResponse>) => {
      return res.data.items?.map((item) => item.snippet?.resourceId?.videoId);
    })
    .then((videoIDs: (string | null | undefined)[] | undefined) => {
      return axios.get("https://www.googleapis.com/youtube/v3/videos", {
        params: {
          id: videoIDs?.join(","),
          key: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY,
          part: "snippet,contentDetails",
        },
      });
    })
    .then((res: AxiosResponse<youtube_v3.Schema$VideoListResponse>) => {
      return (
        res.data.items?.map((item) => {
          if (isShortDuration(item.contentDetails?.duration ?? "")) return null;
          return {
            id: item.id!,
            title: item.snippet?.title,
            url: `https://www.youtube.com/watch?v=${item.id}`,
            duration: item.contentDetails?.duration,
            thumbnail: item.snippet?.thumbnails?.maxres?.url,
            author: item.snippet?.channelTitle,
          };
        }) ?? []
      );
    })
    .catch((err) => {
      console.error("Error fetching videos:", err);
      return [];
    });
};

export async function fetchYouTubeVideos({ title }: { title: string }) {
  const channelString = channels.find(
    (channel) => channel.title === title,
  )?.youtubeChannels;
  if (!channelString) return [];

  const channelIds = channelString.split(";").splice(0, 3);

  const allVideos = await Promise.all(
    channelIds.map((channelId) => {
      return getYouTubeChannelSearch(channelId) ?? [];
    }),
  )
    .then((res) => res.flat())
    .then((res) => res.filter((item) => item !== null));

  return allVideos as VideoData[];
}
