"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

import { useIsDesktop } from "@/hooks/use-media-query";
import useVideo from "@/hooks/use-video";
import { cn } from "@/lib/utils";

import Footer from "./Footer";
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
  // The path names the video, so a legacy `?v=` would only duplicate it.
  url.searchParams.delete("v");
  if (url.href !== window.location.href) window.history.replaceState(null, "", url);
}

/**
 * The legacy list's cut: titles over 90 characters end at a word within 80.
 * Legacy left only "..." when the first 80 had no space (common in CJK
 * titles); those are cut at 80 characters instead.
 */
function shortTitle(title: string) {
  if (title.length <= 90) return title;
  const head = title.trim().substring(0, 80);
  return `${head.split(" ").slice(0, -1).join(" ") || head}...`;
}

interface VideoListProps {
  videos: VideoData[];
  activeIndex: number;
  onSelect: (index: number) => void;
  /** Own scroll container (desktop sidebar) vs. scrolling with the page (mobile). */
  scroll?: boolean;
  className?: string;
}

const VideoList = ({ videos, activeIndex, onSelect, scroll = true, className }: VideoListProps) => {
  const watchedVideos = useVideo((state) => state.watchedVideos);
  const activeRef = useRef<HTMLButtonElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Keep the playing video visible when arrow keys move the selection past
  // the edge of the sidebar, or when the sidebar appears at the breakpoint.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !activeRef.current) return;
    const item = activeRef.current.getBoundingClientRect();
    const bounds = viewport.getBoundingClientRect();
    if (item.top < bounds.top) viewport.scrollTop -= bounds.top - item.top;
    else if (item.bottom > bounds.bottom) viewport.scrollTop += item.bottom - bounds.bottom;
  }, [activeIndex, scroll]);

  const items = (
    <div id="video-list">
      {videos.map((video, index) => {
        const isActive = index === activeIndex;
        // The active video is never dimmed, even once it counts as watched.
        const isWatched = !isActive && watchedVideos.includes(video.youtubeId);

        return (
          <button
            key={video.id}
            ref={isActive ? activeRef : undefined}
            data-active={isActive || undefined}
            className={cn(
              "flex w-full items-start border-l-4 px-2.5 py-3 text-left",
              isActive ? "border-[#ffec00]" : "border-transparent",
            )}
            onClick={() => onSelect(index)}
          >
            <div className="relative mr-[15px] shrink-0">
              <Image
                src={video.thumbnail}
                alt=""
                width={125}
                height={70}
                className="w-[125px]"
                unoptimized
              />
              {isWatched && (
                <span className="absolute left-0 top-0 bg-[#1d2122] px-1 py-0.5 text-[8px] text-white">
                  WATCHED
                </span>
              )}
            </div>
            <span
              title={video.title}
              className={cn(
                "w-[225px] text-xs leading-4",
                isWatched ? "text-[#5a5a5a]" : "text-white",
              )}
            >
              {shortTitle(video.title)}
            </span>
          </button>
        );
      })}
    </div>
  );

  if (!scroll) return items;

  return (
    <div ref={viewportRef} className={cn("h-full overflow-y-auto", className)}>
      {items}
    </div>
  );
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

  // Legacy's pixel arrows, shown only in the stacked layout.
  const controls = (
    <div className="flex justify-between pb-10 pt-5">
      <button type="button" onClick={goPrev} disabled={index < 1} aria-label="Previous video">
        <Image src="/img/walnut-logo.svg" alt="" width={30} height={45} className="rotate-180" />
      </button>
      <button
        type="button"
        onClick={goNext}
        disabled={index >= videos.length - 1}
        aria-label="Next video"
      >
        <Image src="/img/walnut-logo.svg" alt="" width={30} height={45} />
      </button>
    </div>
  );

  // One layout at a time, not two CSS-hidden copies: a hidden copy would build
  // a second YouTube player and every onEnded/onError would fire twice.
  //
  // Legacy's flex column: a viewport-tall box (91vh when stacked) whose player,
  // title and footer rows start at zero height and split the spare height
  // evenly, so the player is 47% of its width plus a third of what is left.
  const player = (
    <div
      className={cn(
        "flex shrink-0 flex-col",
        isDesktop ? "h-screen px-[30px] pt-[15px]" : "h-[91vh] px-2.5 pt-[5px]",
      )}
    >
      <div className="relative grow basis-0 pb-[47%] [&>*]:absolute [&>*]:inset-0 [&>*]:h-full">
        <VideoPlayer video={video} onEnded={onVideoEnded} onError={goNext} />
      </div>
      <div className={cn("grow basis-0", isDesktop ? "pt-5" : "mx-2.5")}>
        <a className="block" href={video.url} target="_blank" rel="noopener noreferrer">
          <h2
            className={cn("mb-2.5 mt-5 text-white", isDesktop ? "text-2xl/[1.1]" : "text-lg/[1.1]")}
          >
            {video.title}
          </h2>
        </a>
      </div>
      {!isDesktop && controls}
      {/* The footer row. On desktop it sits at the bottom of the viewport-tall
          box, a short scroll down, as on legacy. Legacy's 1rem bottom padding
          is 10px under Bootstrap 3's root font size. */}
      <div className={cn("flex grow basis-0 items-end", isDesktop ? "pb-2.5" : "pt-5")}>
        <Footer />
      </div>
    </div>
  );

  // Both layouts share one element tree so the player keeps its position, and
  // keeps playing, when the width crosses the breakpoint. Desktop puts the list
  // in a fixed sidebar on the left; below it, `contents` drops the wrappers and
  // everything stacks and scrolls with the page.
  return (
    <div className={isDesktop ? "flex min-h-0 flex-1" : "contents"}>
      <div className={isDesktop ? "flex min-w-0 flex-1 flex-col overflow-y-auto" : "contents"}>
        {player}
      </div>
      <VideoList
        videos={videos}
        activeIndex={index}
        onSelect={select}
        className={isDesktop ? "order-first w-[400px] shrink-0" : undefined}
        scroll={isDesktop}
      />
    </div>
  );
};

export default VideoDisplay;
