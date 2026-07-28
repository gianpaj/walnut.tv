"use client";

import { motion } from "framer-motion";

type Props = {
  video: VideoData;
};

/** Pulls the YouTube video id out of a watch, youtu.be or embed URL. */
function youtubeIdFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    return (
      parsed.searchParams.get("v") ??
      parsed.pathname.split("/").filter(Boolean).pop()?.split("?")[0] ??
      ""
    );
  } catch {
    return "";
  }
}

const VideoPlayer = ({ video }: Props) => {
  if (!video) return null;

  // Derived during render: an effect + state here only added a frame where the
  // iframe pointed at an empty video id.
  const videoID = youtubeIdFromUrl(video.url);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.2,
        delay: 0.5,
        ease: [0, 0.71, 0.2, 1.01],
      }}
      className="aspect-h-9 aspect-w-16 w-full"
    >
      <iframe
        src={`https://www.youtube.com/embed/${videoID}`}
        title={video.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    </motion.div>
  );
};

export default VideoPlayer;
