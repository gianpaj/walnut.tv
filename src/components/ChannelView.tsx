"use client";

import { useEffect, useState } from "react";

import LoadingPage from "@/components/LoadingPage";
import VideoDisplay from "@/components/VideoDisplay";
import { fetchChannelVideos } from "@/lib/actions/videos";
import type { Channel } from "@/lib/data";

interface Props {
  channel: Channel;
  initialVideoId?: string;
}

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "empty" }
  | { status: "ready"; videos: VideoData[] };

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[60vh] items-center justify-center px-6">
      <h2 className="text-center text-xl font-medium text-muted-foreground">
        {children}
      </h2>
    </div>
  );
}

const ChannelView = ({ channel, initialVideoId }: Props) => {
  const [state, setState] = useState<State>({ status: "loading" });

  // Mount-only: the pages key this component by channel, so switching channels
  // remounts it and `state` starts at "loading" again on its own.
  useEffect(() => {
    let cancelled = false;

    void fetchChannelVideos(channel).then(({ videos, failed }) => {
      if (cancelled) return;
      if (videos.length > 0) {
        setState({ status: "ready", videos });
      } else {
        setState({ status: failed ? "error" : "empty" });
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.status === "loading") return <LoadingPage />;

  if (state.status === "error") {
    return (
      <Message>
        Sorry, there was an error retrieving videos in /{channel.title}
      </Message>
    );
  }

  // Nothing came back and nothing threw: on the YouTube channels this is
  // almost always the daily API quota being spent, which is what the live site
  // tells people too.
  if (state.status === "empty") {
    return (
      <Message>
        Come back tomorrow, today&apos;s YouTube quota was used for /
        {channel.title}
      </Message>
    );
  }

  return (
    <VideoDisplay
      videos={state.videos}
      channelSlug={channel.title}
      initialVideoId={initialVideoId}
    />
  );
};

export default ChannelView;
