"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import { useNavigationPending } from "@/components/providers/NavigationProvider";
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
  const navigationPending = useNavigationPending();
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const readyRef = useRef(false);
  const [loadFailed, setLoadFailed] = useState(false);

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

        // YouTube replaces its target. Keep React's host intact across effect cleanup.
        const target = document.createElement("div");
        containerRef.current.replaceChildren(target);
        playerRef.current = new YTApi.Player(target, {
          videoId: wantedVideoId.current,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            iv_load_policy: 3,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              readyRef.current = true;
              event.target.cueVideoById(wantedVideoId.current);
            },
            onStateChange: (event) => {
              if (!cancelled && event.data === YTApi.PlayerState.ENDED) {
                handlers.current.onEnded?.();
              }
            },
            onError: () => {
              if (!cancelled) handlers.current.onError?.();
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
      readyRef.current = false;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    // cueVideoById, not loadVideoById: the live site loads the next video
    // without starting playback on its own.
    if (readyRef.current) playerRef.current?.cueVideoById(video.youtubeId);
  }, [video.youtubeId]);

  useEffect(() => {
    if (navigationPending && readyRef.current) playerRef.current?.pauseVideo();
  }, [navigationPending]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.2,
        delay: 0.5,
        ease: [0, 0.71, 0.2, 1.01],
      }}
      className="aspect-video w-full"
    >
      {loadFailed && (
        <p role="status" className="p-4 text-sm text-muted-foreground">
          The YouTube player could not load. Reload the page or open the video using its title
          below.
        </p>
      )}
      <div
        ref={containerRef}
        className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full"
        hidden={loadFailed}
      />
    </motion.div>
  );
};

export default VideoPlayer;
