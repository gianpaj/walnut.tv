"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import VideoDisplay from "@/components/VideoDisplay";
import { channels } from "@/lib/data";
import { interleaveArrays, isVideoObject } from "@/lib/videoService";
import LoadingPage from "../loading";
import { fetchYouTubeVideos } from "@/lib/actions/youtube";

interface ChannelPageProps {
  params: {
    channel: string;
  };
}

const ChannelPage = ({ params }: ChannelPageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [allVideos, setAllVideos] = useState<VideoData[]>([]);
  const channel = channels.find((c) => c.title === params.channel);
  const subReddits = channel?.subreddit?.split(";") ?? [];
  const youtubeChannels = channel?.youtubeChannels?.split(";") ?? [];
  useEffect(() => {
    async function getRedditData() {
      try {
        const promises = subReddits.map((sub) =>
          axios.get<RedditResponseData>(`https://www.reddit.com/r/${sub}/hot.json?limit=50`)
        );
        const arrayOfArrayOfResponses = await Promise.all(promises)
        // filter only the videos and only the ones with more than min votes or 3
        const videosArrayOfArrays = arrayOfArrayOfResponses.map((response) => response.data.data.children).map((posts) => posts.filter(isVideoObject).filter((item) => item.data.score >= (channel?.minNumOfVotes || 3)))

        // console.log({ flat: videosArrayOfArrays.flat().map(v => v.data).map(v => ({ subreddit: v.subreddit, id: v.id, url: v.url })) })
        const flat = interleaveArrays(videosArrayOfArrays).flat()

        const videosData = flat.map((video) => {
          return {
            id: video.data.id,
            title: video.data.title,
            thumbnail:
              video.data.thumbnail ??
              video.data.media?.oembed?.thumbnail_url ??
              "",
            url: video.data.url,
            author: video.data.author,
          };
        });

        const uniq = {} as Record<string, boolean>;
        // console.log({ flat });
        const allVideosData = videosData.filter((v) => !uniq[v.url] && (uniq[v.url] = true));
        // console.log({ allVideosData });
        setAllVideos(allVideosData);
      } catch (error) {
        console.error(error);
      }
    }
    async function getYouTubeData() {
      try {
        const videos = await fetchYouTubeVideos({ title: params.channel });
        setAllVideos(videos ?? []);
      } catch (error) {
        console.error(error);
      }
    }

    if (subReddits.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      getRedditData();
    }
    if (youtubeChannels.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      getYouTubeData();
    }
    setIsLoading(false)
  }, []);


  if (isLoading) {
    return <LoadingPage />
  }

  return (
    <div className="">
      {allVideos.length > 0 && <VideoDisplay videos={allVideos} />}
    </div>
  );
};

export default ChannelPage;
