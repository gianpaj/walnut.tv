"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import VideoDisplay from "@/components/VideoDisplay";
import { channels } from "@/lib/data";
import type { RedditResponseData, VideoData } from "@/types";

const DocusPage = () => {
  const [allVideos, setAllVideos] = useState<VideoData[]>([]);
  const subReddits =
    channels.find((c) => c.title === "docus")?.subreddit?.split(";") ?? [];
  useEffect(() => {
    async function getData() {
      try {
        for (const sub of subReddits) {
          const response = await Promise.resolve(
            await axios.get(
              `https://www.reddit.com/r/${sub}/hot.json?limit=10`,
            ),
          );
          const videos = (
            response.data as RedditResponseData
          ).data.children.filter((item) => {
            return item.data.score >= 3 && !item.data.url.includes("reddit");
          });

          const videosData = videos.map((video) => {
            return {
              id: video.data.id,
              title: video.data.title,
              thumbnail: video.data.thumbnail,
              url: video.data.url,
              author: video.data.author,
            };
          });

          setAllVideos((prev) => [...prev, ...videosData]);
        }
      } catch (error) {
        console.error(error);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    getData();
  }, []);

  return (
    <div className="p-4">
      {allVideos.length > 0 && <VideoDisplay videos={allVideos} />}
    </div>
  );
};

export default DocusPage;
