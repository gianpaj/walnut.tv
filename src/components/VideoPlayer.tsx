"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

import { loadYouTubeIframeApi } from "@/lib/youtubeIframeApi";

type Props = {
  video: VideoData;
  /** Fired when the video plays to the end. */
  onEnded?: () => void;
  /** Fired when YouTube refuses to play the video (removed, private, blocked). */
  onError?: () => void;
};

/**
 * The real IFrame Player API rather than a bare <iframe>, because the live site
 * depends on the player events: skipping a video YouTube will not play, and
 * knowing when one finishes. A plain embed reports neither.
 */
const VideoPlayer = ({ video, onEnded, onError }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);

  // Kept in refs so the player is created once, but always calls the latest
  // handlers and shows the latest video even if it finishes loading late.
  const handlers = useRef({ onEnded, onError });
  const wantedVideoId = useRef(video.youtubeId);

  useEffect(() => {
    handlers.current = { onEnded, onError };
    wantedVideoId.current = video.youtubeId;
  });

  useEffect(() => {
    let cancelled = false;

    void loadYouTubeIframeApi()
      .then((YTApi) => {
        if (cancelled || !containerRef.current) return;

        playerRef.current = new YTApi.Player(containerRef.current, {
          videoId: wantedVideoId.current,
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            iv_load_policy: 3,
          },
          events: {
            onStateChange: (event) => {
              if (event.data === YTApi.PlayerState.ENDED) {
                handlers.current.onEnded?.();
              }
            },
            onError: () => handlers.current.onError?.(),
          },
        });
      })
      .catch((error: unknown) => console.error(error));

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    // cueVideoById, not loadVideoById: the live site loads the next video
    // without starting playback on its own.
    playerRef.current?.cueVideoById(video.youtubeId);
  }, [video.youtubeId]);

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
      {/* Replaced in place by the player's iframe. */}
      <div ref={containerRef} />
    </motion.div>
  );
};

export default VideoPlayer;
