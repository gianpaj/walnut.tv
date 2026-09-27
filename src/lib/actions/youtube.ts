import "server-only";
import type { youtube_v3 } from "@googleapis/youtube";

import type { FeedIssue, FeedResult } from "@/lib/actions/feed";
import { getYouTubeChannelIds, type Channel } from "@/lib/data";
import { isShortDuration } from "@/lib/utils";
import { interleaveArrays, youtubeThumbnail } from "@/lib/videoService";

const API = "https://www.googleapis.com/youtube/v3";

/** The live site takes the 4 most recent uploads per channel. */
const MAX_VIDEOS_PER_CHANNEL = 4;

/** Cache sharing and quota estimates require deployment-host verification; see MIGRATION-PLAN.md. */
const REVALIDATE_SECONDS = 60 * 60 * 2;

/** A channel's uploads playlist id never changes in practice. */
const PLAYLIST_ID_REVALIDATE_SECONDS = 60 * 60 * 24 * 30;

function apiKey() {
  // Compatibility fallback; prefer the server-only name in deployment configuration.
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

class YouTubeFeedError extends Error {
  readonly reason: FeedIssue["reason"];

  constructor(reason: FeedIssue["reason"]) {
    super(reason);
    this.reason = reason;
  }
}

async function callApi<T>(
  path: string,
  params: Record<string, string>,
  revalidate: number,
): Promise<T> {
  const key = apiKey();
  if (!key) throw new YouTubeFeedError("missing-config");

  const url = `${API}/${path}?${new URLSearchParams({ ...params, key })}`;
  const response = await fetch(url, {
    headers: refererHeader(),
    // Preserve Next's Data Cache; quota usage depends on the host sharing it.
    next: { revalidate },
  });

  const denied = response.status === 401 || response.status === 403;
  const body = (await response.json().catch(() => {
    throw new YouTubeFeedError(denied ? "api-denied" : "fetch-failed");
  })) as T & {
    error?: { code?: number; errors?: { reason?: string }[] };
  };
  if (!response.ok || body.error) {
    // A 403 alone does not establish quota exhaustion. Ignore upstream messages.
    const quotaExceeded = body.error?.errors?.some(({ reason }) =>
      ["quotaExceeded", "dailyLimitExceeded", "dailyLimitExceededUnreg"].includes(reason ?? ""),
    );
    const apiDenied = denied || body.error?.code === 401 || body.error?.code === 403;
    throw new YouTubeFeedError(
      quotaExceeded ? "quota-exceeded" : apiDenied ? "api-denied" : "fetch-failed",
    );
  }
  return body;
}

/** The 3-call dance: channel -> uploads playlist -> video details. */
export async function fetchChannelUploads(channelId: string): Promise<FeedResult> {
  try {
    const channelRes = await callApi<youtube_v3.Schema$ChannelListResponse>(
      "channels",
      { id: channelId, part: "contentDetails" },
      PLAYLIST_ID_REVALIDATE_SECONDS,
    );

    const playlistId = channelRes.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!playlistId) return { videos: [], issues: [] };

    const playlistRes = await callApi<youtube_v3.Schema$PlaylistItemListResponse>(
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
    if (videoIds.length === 0) return { videos: [], issues: [] };

    const videosRes = await callApi<youtube_v3.Schema$VideoListResponse>(
      "videos",
      { id: videoIds.join(","), part: "snippet,contentDetails" },
      REVALIDATE_SECONDS,
    );

    const videos = (videosRes.items ?? [])
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
    return { videos, issues: [] };
  } catch (error) {
    return {
      videos: [],
      issues: [
        {
          source: "youtube",
          reason: error instanceof YouTubeFeedError ? error.reason : "fetch-failed",
        },
      ],
    };
  }
}

export async function fetchYouTubeVideos(channel: Channel): Promise<FeedResult> {
  const channelIds = getYouTubeChannelIds(channel);
  const perChannel = await Promise.all(channelIds.map(fetchChannelUploads));

  // Rotate between channels so one prolific uploader does not fill the list.
  const videos = interleaveArrays(perChannel.map((result) => result.videos));

  if (channel.sortBy === "new") {
    videos.sort(
      (a, b) => new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime(),
    );
  }

  return { videos, issues: perChannel.flatMap((result) => result.issues) };
}
