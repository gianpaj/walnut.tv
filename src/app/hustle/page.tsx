"use client";

import { useEffect, useState } from "react";

import VideoDisplay from "@/components/VideoDisplay";
import { fetchYouTubeVideos } from "@/lib/actions/youtube";
import type { VideoData } from "@/types";

const HustlePage = () => {
  const [allVideos, setAllVideos] = useState<VideoData[]>([]);

  useEffect(() => {
    async function getData() {
      try {
        const videos = await fetchYouTubeVideos({ title: "hustle" });
        setAllVideos(videos ?? []);
      } catch (error) {
        console.error(error);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    getData();
  }, []);

  return (
    <div className="p-4">
      {allVideos.length > 0 && <VideoDisplay videos={allVideos ?? []} />}
    </div>
  );
};

export default HustlePage;
