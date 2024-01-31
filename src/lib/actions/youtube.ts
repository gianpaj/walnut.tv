"use server";

import { youtube } from "@googleapis/youtube";

import { channels } from "@/lib/data";
import { isShortDuration } from "@/lib/utils";
import type { VideoData } from "@/types";

const youtubeApi = youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

const getYouTubeChannelSearch = (channelId: string) => {
  return youtubeApi.channels
    .list({
      id: [channelId],
      part: ["contentDetails"],
    })
    .then(
      (res) => res.data?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads,
    )
    .then((playlistId) =>
      youtubeApi.playlistItems.list({
        part: ["snippet"],
        playlistId,
        maxResults: 4,
      }),
    )
    .then((res) =>
      res.data.items?.map((item) => item.snippet?.resourceId?.videoId),
    )
    .then((videoIDs) =>
      youtubeApi.videos.list({
        id: [videoIDs?.join(",") ?? ""],
        part: ["snippet", "contentDetails"],
      }),
    )
    .then(
      (res) =>
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
        }) ?? [],
    )
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
