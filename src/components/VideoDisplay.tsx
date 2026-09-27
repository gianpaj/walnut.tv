"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useIsDesktop } from "@/hooks/use-media-query";
import useVideo from "@/hooks/use-video";
import { cn } from "@/lib/utils";

import Footer from "./Footer";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import VideoPlayer from "./VideoPlayer";

interface Props {
  videos: VideoData[];
  /** Base path for deep links, e.g. "/ai" or "/r/videos". */
  urlPrefix: string;
  initialVideoId?: string;
}

/**
 * The live site carries an `autoplay` flag that nothing ever sets to true, so a
 * finished video does not advance on its own there. Kept off for parity rather
 * than quietly changing the behaviour, but named so it is one edit to enable.
 */
const AUTOPLAY_NEXT = false;

function replaceVideoUrl(urlPrefix: string, videoId: string) {
  const url = new URL(window.location.href);
  // A departing route can remain mounted while Next commits its replacement.
  if (url.pathname !== urlPrefix && !url.pathname.startsWith(`${urlPrefix}/`)) return;
  url.pathname = `${urlPrefix}/${encodeURIComponent(videoId)}`;
  if (url.searchParams.has("v")) url.searchParams.set("v", videoId);
  if (url.href !== window.location.href) window.history.replaceState(null, "", url);
}

interface VideoListProps {
  videos: VideoData[];
  activeIndex: number;
  onSelect: (index: number) => void;
  showAuthor?: boolean;
  /** Own scroll container (desktop sidebar) vs. scrolling with the page (mobile). */
  scroll?: boolean;
  className?: string;
}

const VideoList = ({
  videos,
  activeIndex,
  onSelect,
  showAuthor = false,
  scroll = true,
  className,
}: VideoListProps) => {
  const watchedVideos = useVideo((state) => state.watchedVideos);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Keep the playing video visible when arrow keys or prev/next move the
  // selection past the edge of the scroll area.
  useEffect(() => {
    if (!scroll || !activeRef.current) return;
    const viewport = activeRef.current.closest<HTMLElement>("[data-radix-scroll-area-viewport]");
    if (!viewport) return;
    const item = activeRef.current.getBoundingClientRect();
    const bounds = viewport.getBoundingClientRect();
    if (item.top < bounds.top) viewport.scrollTop -= bounds.top - item.top;
    else if (item.bottom > bounds.bottom) viewport.scrollTop += item.bottom - bounds.bottom;
  }, [activeIndex, scroll]);

  const items = (
    <div id="video-list" className="flex h-full flex-col space-y-4 p-2">
      {videos.map((video, index) => {
        const isActive = index === activeIndex;
        // The active video is never dimmed, even once it counts as watched.
        const isWatched = !isActive && watchedVideos.includes(video.youtubeId);

        return (
          <button
            key={video.id}
            ref={isActive ? activeRef : undefined}
            data-active={isActive || undefined}
            className="grid grid-cols-[0.2fr_1fr_1fr_1fr_1fr_1fr]"
            onClick={() => onSelect(index)}
          >
            <motion.div
              className={cn("col-span-1", isActive ? "h-full w-[5px] rounded-lg bg-primary" : "")}
              layoutId="underline"
            />
            <div className="relative col-span-2">
              <Image
                src={video.thumbnail}
                alt=""
                width={320}
                height={180}
                className={cn("w-full", isWatched && "opacity-50")}
                unoptimized
              />
              {isWatched && (
                <Badge className="absolute left-1 top-1 text-[10px] leading-none">WATCHED</Badge>
              )}
            </div>
            <div className="col-span-3 px-2">
              <span
                className={cn(
                  "line-clamp-2 text-start text-xs font-medium",
                  isWatched && "opacity-60",
                )}
              >
                {video.title}
              </span>
              {showAuthor && (
                <span className="line-clamp-2 text-start text-xs text-primary">{video.author}</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );

  if (!scroll) return items;

  return <ScrollArea className={cn("h-full", className)}>{items}</ScrollArea>;
};

const VideoDisplay = ({ videos, urlPrefix, initialVideoId }: Props) => {
  const isDesktop = useIsDesktop();
  const setCurrentVideoWatching = useVideo((state) => state.setCurrentVideoWatching);
  const addToClickedVideos = useVideo((state) => state.addToClickedVideos);
  const addToWatchedVideos = useVideo((state) => state.addToWatchedVideos);

  const readIndex = useCallback(() => {
    let requestedId = initialVideoId;
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.pathname.startsWith(`${urlPrefix}/`)) {
        requestedId = videos.find(
          (item) => url.pathname === `${urlPrefix}/${encodeURIComponent(item.id)}`,
        )?.id;
      } else if (url.pathname === urlPrefix) {
        requestedId = url.searchParams.get("v") ?? initialVideoId;
      }
    }
    return Math.max(
      0,
      videos.findIndex((item) => item.id === requestedId),
    );
  }, [videos, urlPrefix, initialVideoId]);
  // A restored history entry can differ from Next's cached page props.
  const [index, setIndex] = useState(readIndex);
  const video = videos[index] ?? videos[0];

  const select = useCallback(
    (nextIndex: number) => {
      const next = videos[nextIndex];
      if (!next) return;
      setIndex(nextIndex);

      // replaceState rather than router.replace: this is the same URL shape the
      // live site produces, and a real navigation would remount the view and
      // refetch the whole listing.
      replaceVideoUrl(urlPrefix, next.id);

      setCurrentVideoWatching(next.youtubeId);
      addToClickedVideos(next.youtubeId);
      addToWatchedVideos(next.youtubeId);
    },
    [videos, urlPrefix, setCurrentVideoWatching, addToClickedVideos, addToWatchedVideos],
  );

  const goNext = useCallback(() => {
    if (index < videos.length - 1) select(index + 1);
  }, [index, videos.length, select]);

  const goPrev = useCallback(() => {
    if (index > 0) select(index - 1);
  }, [index, select]);

  useEffect(() => {
    if (!video) return;
    replaceVideoUrl(urlPrefix, video.id);
    setCurrentVideoWatching(video.youtubeId);
    addToClickedVideos(video.youtubeId);
    addToWatchedVideos(video.youtubeId);
  }, [video, urlPrefix, setCurrentVideoWatching, addToClickedVideos, addToWatchedVideos]);

  useEffect(() => {
    const restore = () => {
      const path = window.location.pathname;
      if (path === urlPrefix || path.startsWith(`${urlPrefix}/`)) setIndex(readIndex());
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [readIndex, urlPrefix]);

  const onVideoEnded = useCallback(() => {
    if (AUTOPLAY_NEXT) goNext();
  }, [goNext]);

  // Left/right arrows step through the list, as on the live site.
  useEffect(() => {
    const onKeyUp = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable]")) return;
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    };
    window.addEventListener("keyup", onKeyUp);
    return () => window.removeEventListener("keyup", onKeyUp);
  }, [goPrev, goNext]);

  if (!video) return null;

  const controls = (
    <div className="mt-4 flex items-center justify-between">
      <Button
        variant="secondary"
        size="sm"
        onClick={goPrev}
        disabled={index < 1}
        aria-label="Previous video"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Prev
      </Button>
      <span className="text-xs text-muted-foreground">
        {index + 1} / {videos.length}
      </span>
      <Button
        variant="secondary"
        size="sm"
        onClick={goNext}
        disabled={index >= videos.length - 1}
        aria-label="Next video"
      >
        Next
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );

  const details = (
    <div className="mt-4">
      <a
        className="text-2xl font-semibold hover:underline"
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {video.title}
      </a>
    </div>
  );

  // One layout at a time, not two CSS-hidden copies: a hidden copy would build
  // a second YouTube player and every onEnded/onError would fire twice.
  const player = (
    <div className="flex w-full flex-col justify-center p-4">
      {/* Capped by width so 16:9 leaves room for the title and controls; at
          full width the player alone pushed both below the fold. */}
      <div className="mx-auto w-full max-w-[calc((100dvh-18rem)*16/9)]">
        <VideoPlayer video={video} onEnded={onVideoEnded} onError={goNext} />
      </div>
      {details}
      {controls}
    </div>
  );

  if (isDesktop) {
    return (
      <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1 rounded-lg border">
        <ResizablePanel defaultSize={25}>
          <VideoList videos={videos} activeIndex={index} onSelect={select} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={75} className="flex flex-col justify-between overflow-y-auto">
          {player}
          <Footer />
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }

  // Mobile stacks and scrolls with the page. A vertical ResizablePanelGroup was
  // tried here and computed to 1px tall — it never gets a definite height off a
  // page that scrolls — which collapsed both the player and the list to nothing.
  return (
    <>
      {player}
      <VideoList videos={videos} activeIndex={index} onSelect={select} showAuthor scroll={false} />
      <Footer />
    </>
  );
};

export default VideoDisplay;
