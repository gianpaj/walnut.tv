import "server-only";

import type { youtube_v3 } from "@googleapis/youtube";

import { getYouTubeChannelIds, type Channel } from "@/lib/data";
import { isShortDuration } from "@/lib/utils";
import { interleaveArrays, youtubeThumbnail } from "@/lib/videoService";

const API = "https://www.googleapis.com/youtube/v3";

/** The live site takes the 4 most recent uploads per channel. */
const MAX_VIDEOS_PER_CHANNEL = 4;

/**
 * Quota budget. Every channel costs 2 units per refresh (the uploads playlist
 * id is cached far longer, see below), and the three YouTube categories hold
 * ~125 channel ids between them, so a full refresh is ~250 units. At a 2 hour
 * window that is ~3,000 of the 10,000 units/day, with room to spare.
 *
 * This is the whole point of fetching server-side: the cost is per window, not
 * per visitor. Client-side it was ~195 units for a single view of /hustle.
 */
const REVALIDATE_SECONDS = 60 * 60 * 2;

/** A channel's uploads playlist id never changes in practice. */
const PLAYLIST_ID_REVALIDATE_SECONDS = 60 * 60 * 24 * 30;

function apiKey() {
  // NEXT_PUBLIC_ is still accepted so an existing .env.local keeps working, but
  // the key is no longer shipped to the browser — prefer the server-only name.
  return process.env.YOUTUBE_API_KEY ?? process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
}

/**
 * Google keys are often locked to HTTP referrers, which a server request cannot
 * satisfy — it sends none, and the API answers 403 "Requests from referer
 * <empty> are blocked". The real fix is to restrict the key by IP instead now
 * that it is server-side; this exists so an existing referrer-locked key can be
 * used unchanged in the meantime.
 */
function refererHeader(): HeadersInit {
  const referer = process.env.YOUTUBE_API_REFERER;
  return referer ? { Referer: referer } : {};
}

async function callApi<T>(
  path: string,
  params: Record<string, string>,
  revalidate: number,
): Promise<T> {
  const key = apiKey();
  if (!key) throw new Error("YOUTUBE_API_KEY is not set");

  const url = `${API}/${path}?${new URLSearchParams({ ...params, key })}`;
  const response = await fetch(url, {
    headers: refererHeader(),
    // Opting this request into Next's Data Cache is what makes the quota
    // proportional to time rather than to traffic.
    next: { revalidate },
  });

  const body = (await response.json()) as T & {
    error?: { message: string };
  };
  if (!response.ok || body.error) {
    throw new Error(
      body.error?.message ?? `${path} failed with ${response.status}`,
    );
  }
  return body;
}

/** The 3-call dance: channel -> uploads playlist -> video details. */
export async function fetchChannelUploads(
  channelId: string,
): Promise<VideoData[]> {
  try {
    const channelRes = await callApi<youtube_v3.Schema$ChannelListResponse>(
      "channels",
      { id: channelId, part: "contentDetails" },
      PLAYLIST_ID_REVALIDATE_SECONDS,
    );

    const playlistId =
      channelRes.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!playlistId) return [];

    const playlistRes =
      await callApi<youtube_v3.Schema$PlaylistItemListResponse>(
        "playlistItems",
        {
          part: "snippet",
          playlistId,
          maxResults: String(MAX_VIDEOS_PER_CHANNEL),
        },
        REVALIDATE_SECONDS,
      );

    const videoIds =
      playlistRes.items
        ?.map((item) => item.snippet?.resourceId?.videoId)
        .filter((id): id is string => Boolean(id)) ?? [];
    if (videoIds.length === 0) return [];

    const videosRes = await callApi<youtube_v3.Schema$VideoListResponse>(
      "videos",
      { id: videoIds.join(","), part: "snippet,contentDetails" },
      REVALIDATE_SECONDS,
    );

    return (videosRes.items ?? [])
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
  const channelIds = getYouTubeChannelIds(channel);
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
