"use client";

import { motion } from "framer-motion";

type Props = {
  video: VideoData;
};

const VideoPlayer = ({ video }: Props) => {
  if (!video) return null;

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
        src={`https://www.youtube.com/embed/${video.youtubeId}`}
        title={video.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    </motion.div>
  );
};

export default VideoPlayer;
