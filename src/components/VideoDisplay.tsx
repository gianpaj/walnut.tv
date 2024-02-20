"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
}

const VideoDisplay = ({ videos }: Props) => {
  const videoStore = useVideo();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [video, setVideo] = useState(
    videos.find((v) => v.id === searchParams.get("v")) ?? videos[0]!,
  );

  useEffect(() => {
    if (!searchParams.get("v")) {
      router.push(`${pathname}?v=${video.id}`);
      videoStore.setCurrentVideoWatching(video.id);
      videoStore.addToClickedVideos(video.id);
      videoStore.addToWatchedVideos(video.id);
    }
  }, [video]);

  return (
    <>
      <ResizablePanelGroup
        direction="horizontal"
        className="min-h-[200px] rounded-lg border"
      >
        <div className="hidden md:flex">
          <ResizablePanel defaultSize={25}>
            <ScrollArea className="h-screen">
              <div className="flex h-full flex-col space-y-4 p-2">
                {videos.map((video) => {
                  const isWatched = videoStore.watchedVideos.includes(video.id);
                  let thumbnail = video.thumbnail;
                  if (
                    !thumbnail ||
                    (!thumbnail.startsWith("http://") &&
                      !thumbnail.startsWith("https://"))
                  ) {
                    thumbnail = "/img/notfound.jpg";
                  }
                  return (
                    <button
                      key={video.id}
                      className="grid grid-cols-[0.2fr_1fr_1fr_1fr_1fr_1fr]"
                      onClick={() => {
                        router.push(`${pathname}?v=${video.id}`);
                        setVideo(video);
                        console.log(video);
                        videoStore.setCurrentVideoWatching(video.id);
                        videoStore.addToClickedVideos(video.id);
                        videoStore.addToWatchedVideos(video.id);
                      }}
                    >
                      <motion.div
                        className={cn(
                          "col-span-1",
                          searchParams.get("v") === video.id
                            ? "h-full w-[5px] rounded-lg bg-primary"
                            : "",
                        )}
                        layoutId="underline"
                      />
                      <div className="col-span-2">
                        <Image
                          src={thumbnail}
                          alt="thumbnail"
                          width={100}
                          height={100}
                          className="w-full"
                        />
                      </div>
                      <div className="col-span-3 p-2">
                        <span className="line-clamp-2 text-start text-xs font-medium">
                          {video.title}
                        </span>
                        <span className="line-clamp-2 text-start text-xs text-primary">
                          {video.author}
                        </span>
                        {isWatched && (
                          <div className="text-start">
                            <Badge className="text-xs">Watched</Badge>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel
            defaultSize={75}
            className="flex flex-col justify-between"
          >
            <div className="flex w-full flex-col justify-center p-4">
              <VideoPlayer video={video} />
              <div className="mt-4">
                <a className="text-2xl font-semibold" href={video.url}>
                  {video.title}
                </a>
              </div>
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
                  <div className="mt-4">
                    <a
                      className="text-sm font-semibold md:text-base lg:text-lg"
                      href={video.url}
                    >
                      {video.title}
                    </a>
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={75}>
                <ScrollArea className="h-screen">
                  <div className="flex h-full flex-col space-y-4 p-2">
                    {videos.map((video) => {
                      let thumbnail = video.thumbnail;
                      if (
                        !thumbnail ||
                        (!thumbnail.startsWith("http://") &&
                          !thumbnail.startsWith("https://"))
                      ) {
                        thumbnail = "/img/notfound.jpg";
                      }
                      return (
                        <button
                          key={video.id}
                          className="grid grid-cols-[0.2fr_1fr_1fr_1fr_1fr_1fr]"
                          onClick={() => {
                            router.push(`${pathname}?v=${video.id}`);
                            setVideo(video);
                            videoStore.setCurrentVideoWatching(video.id);
                            videoStore.addToClickedVideos(video.id);
                            videoStore.addToWatchedVideos(video.id);
                          }}
                        >
                          <motion.div
                            className={cn(
                              "col-span-1",
                              searchParams.get("v") === video.id
                                ? "h-full w-[5px] rounded-lg bg-primary"
                                : "",
                            )}
                            layoutId="underline"
                          />
                          <div className="col-span-2">
                            <Image
                              src={thumbnail}
                              alt="thumbnail"
                              width={100}
                              height={100}
                              className="w-full"
                            />
                          </div>
                          <div className="col-span-3 p-2">
                            <span className="line-clamp-2 text-start text-xs font-medium">
                              {video.title}
                            </span>
                            <span className="line-clamp-2 text-start text-xs text-primary">
                              {video.author}
                            </span>
                            {videoStore.watchedVideos.includes(video.id) && (
                              <div className="text-start ">
                                <Badge className="text-xs">Watched</Badge>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
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
