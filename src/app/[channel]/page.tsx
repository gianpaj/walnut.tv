"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import axios from "axios";

import VideoDisplay from "@/components/VideoDisplay";
import { fetchYouTubeVideos } from "@/lib/actions/youtube";
import {
  getChannel,
  getSubreddits,
  getYouTubeChannelIds,
  type Channel,
} from "@/lib/data";
import { interleaveArrays, isVideoObject } from "@/lib/videoService";

import LoadingPage from "../loading";

interface ChannelPageProps {
  // Next 16: params is a Promise in client components too, unwrapped with use().
  params: Promise<{ channel: string }>;
}

async function fetchRedditVideos(channel: Channel): Promise<VideoData[]> {
  // Fetched from the browser on purpose: reddit.com answers 403 to requests
  // from datacenter IPs, so this cannot move server-side without an OAuth
  // script app. See MIGRATION-PLAN.md phase 2.
  const responses = await Promise.all(
    getSubreddits(channel).map((sub) =>
      axios.get<RedditResponseData>(
        `https://www.reddit.com/r/${sub}/hot.json?limit=50`,
      ),
    ),
  );

  const videosArrayOfArrays = responses
    .map((response) => response.data.data.children)
    .map((posts) =>
      posts
        .filter(isVideoObject)
        .filter((item) => item.data.score >= (channel.minNumOfVotes ?? 3)),
    );

  const videosData = interleaveArrays(videosArrayOfArrays)
    .flat()
    .map((video) => ({
      id: video.data.id,
      title: video.data.title,
      thumbnail:
        video.data.thumbnail ?? video.data.media?.oembed?.thumbnail_url ?? "",
      url: video.data.url,
      author: video.data.author,
    }));

  const seen = new Set<string>();
  return videosData.filter((video) => {
    if (seen.has(video.url)) return false;
    seen.add(video.url);
    return true;
  });
}

const ChannelPage = ({ params }: ChannelPageProps) => {
  const { channel: slug } = use(params);
  const channel = getChannel(slug);

  const [isLoading, setIsLoading] = useState(true);
  const [allVideos, setAllVideos] = useState<VideoData[]>([]);

  useEffect(() => {
    if (!channel) return;

    let cancelled = false;

    async function load(current: Channel) {
      try {
        // TODO(phase 1): interleave the two sources and honour sortBy: "new",
        // the way the live site does.
        const [redditVideos, youtubeVideos] = await Promise.all([
          getSubreddits(current).length > 0
            ? fetchRedditVideos(current)
            : Promise.resolve<VideoData[]>([]),
          getYouTubeChannelIds(current).length > 0
            ? fetchYouTubeVideos({ title: current.title })
            : Promise.resolve<VideoData[]>([]),
        ]);
        if (!cancelled) setAllVideos([...redditVideos, ...youtubeVideos]);
      } catch (error) {
        console.error(error);
      } finally {
        // TODO(phase 1): surface an error / "quota used up" message instead of
        // falling through to an empty list.
        if (!cancelled) setIsLoading(false);
      }
    }

    void load(channel);

    return () => {
      cancelled = true;
    };
  }, [channel]);

  if (!channel) notFound();

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div>{allVideos.length > 0 && <VideoDisplay videos={allVideos} />}</div>
  );
};

export default ChannelPage;
