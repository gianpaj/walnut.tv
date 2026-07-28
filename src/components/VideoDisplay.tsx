"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import useVideo from "@/hooks/use-video";
import { cn } from "@/lib/utils";

import Footer from "./Footer";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import VideoPlayer from "./VideoPlayer";

interface Props {
  videos: VideoData[];
  channelSlug: string;
  initialVideoId?: string;
}

interface VideoListProps {
  videos: VideoData[];
  activeIndex: number;
  onSelect: (index: number) => void;
  showAuthor?: boolean;
}

const VideoList = ({
  videos,
  activeIndex,
  onSelect,
  showAuthor = false,
}: VideoListProps) => {
  const watchedVideos = useVideo((state) => state.watchedVideos);

  return (
    <ScrollArea className="h-screen">
      <div id="video-list" className="flex h-full flex-col space-y-4 p-2">
        {videos.map((video, index) => {
          const isActive = index === activeIndex;
          // The active video is never dimmed, even once it counts as watched.
          const isWatched =
            !isActive && watchedVideos.includes(video.youtubeId);

          return (
            <button
              key={video.id}
              data-active={isActive || undefined}
              className="grid grid-cols-[0.2fr_1fr_1fr_1fr_1fr_1fr]"
              onClick={() => onSelect(index)}
            >
              <motion.div
                className={cn(
                  "col-span-1",
                  isActive ? "h-full w-[5px] rounded-lg bg-primary" : "",
                )}
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
                  <Badge className="absolute left-1 top-1 text-[10px] leading-none">
                    WATCHED
                  </Badge>
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
                  <span className="line-clamp-2 text-start text-xs text-primary">
                    {video.author}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
};

const VideoDisplay = ({ videos, channelSlug, initialVideoId }: Props) => {
  const setCurrentVideoWatching = useVideo(
    (state) => state.setCurrentVideoWatching,
  );
  const addToClickedVideos = useVideo((state) => state.addToClickedVideos);
  const addToWatchedVideos = useVideo((state) => state.addToWatchedVideos);

  const initialIndex = Math.max(
    0,
    videos.findIndex((video) => video.id === initialVideoId),
  );
  const [index, setIndex] = useState(initialIndex);
  const video = videos[index] ?? videos[0];

  const select = useCallback(
    (nextIndex: number) => {
      const next = videos[nextIndex];
      if (!next) return;
      setIndex(nextIndex);

      // replaceState rather than router.replace: this is the same URL shape the
      // live site produces, and a real navigation would remount the view and
      // refetch the whole listing.
      window.history.replaceState(null, "", `/${channelSlug}/${next.id}`);

      setCurrentVideoWatching(next.youtubeId);
      addToClickedVideos(next.youtubeId);
      addToWatchedVideos(next.youtubeId);
    },
    [
      videos,
      channelSlug,
      setCurrentVideoWatching,
      addToClickedVideos,
      addToWatchedVideos,
    ],
  );

  // Mark the video the page opened on, and normalise a ?v= or bare /{channel}
  // URL to /{channel}/{id}. No setIndex here: useState already started there.
  useEffect(() => {
    const first = videos[initialIndex];
    if (!first) return;
    window.history.replaceState(null, "", `/${channelSlug}/${first.id}`);
    setCurrentVideoWatching(first.youtubeId);
    addToClickedVideos(first.youtubeId);
    addToWatchedVideos(first.youtubeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!video) return null;

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

  return (
    <>
      <ResizablePanelGroup
        direction="horizontal"
        className="min-h-[200px] rounded-lg border"
      >
        <div className="hidden md:flex">
          <ResizablePanel defaultSize={25}>
            <VideoList videos={videos} activeIndex={index} onSelect={select} />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel
            defaultSize={75}
            className="flex flex-col justify-between"
          >
            <div className="flex w-full flex-col justify-center p-4">
              <VideoPlayer video={video} />
              {details}
            </div>
            <Footer />
          </ResizablePanel>
        </div>
        <div className="flex h-screen w-full md:hidden">
          <ResizablePanel defaultSize={100}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={80}>
                <div className="flex w-full flex-col justify-center p-4">
                  <VideoPlayer video={video} />
                  {details}
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={75}>
                <VideoList
                  videos={videos}
                  activeIndex={index}
                  onSelect={select}
                  showAuthor
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </div>
      </ResizablePanelGroup>
      <div className="md:hidden">
        <Footer />
      </div>
    </>
  );
};

export default VideoDisplay;
