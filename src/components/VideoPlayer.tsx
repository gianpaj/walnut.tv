"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import type { VideoData } from "@/types";

type Props = {
  video: VideoData;
};

const VideoPlayer = ({ video }: Props) => {
  const [videoID, setVideoID] = useState("");

  useEffect(() => {
    const url = new URL(video.url);
    const videoID = url.searchParams.get("v")
      ? url.searchParams.get("v")
      : url.pathname
          .split("/")
          [url.pathname.split("/").length - 1]?.split("?")[0];
    setVideoID(videoID ?? "");
  }, [video]);

  if (!video) return null;

  return (
    
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.4,
          delay: 0.5,
          ease: [0, 0.71, 0.2, 1.01],
        }}
        className="aspect-h-9 aspect-w-16 w-full "
      >
        <iframe
          src={"https://www.youtube.com/embed/" + videoID}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="rounded-lg border"
        ></iframe>
      </motion.div>
    
  );
};

export default VideoPlayer;
