"use client";

import { useEffect, useState } from "react";

import LoadingPage from "@/components/LoadingPage";
import VideoDisplay from "@/components/VideoDisplay";
import { fetchRedditVideos } from "@/lib/actions/reddit";
import { mergeVideoSources } from "@/lib/actions/videos";
import { getSubreddits, type Channel } from "@/lib/data";

interface Props {
  channel: Channel;
  /** Fetched and cached on the server. */
  youtubeVideos: VideoData[];
  /** Base path for deep links. Defaults to /{channel.title}. */
  urlPrefix?: string;
  initialVideoId?: string;
}

type State =
  | { status: "loading" }
  | { status: "error" }
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

const ChannelView = ({
  channel,
  youtubeVideos,
  urlPrefix,
  initialVideoId,
}: Props) => {
  const hasReddit = getSubreddits(channel).length > 0;

  // A YouTube-only channel is already complete when it arrives from the server,
  // so it renders without a client fetch or a loading flash.
  const [state, setState] = useState<State>(
    hasReddit
      ? { status: "loading" }
      : { status: "ready", videos: youtubeVideos },
  );

  // Mount-only: the pages key this component by channel, so switching channels
  // remounts it and `state` starts over on its own.
  useEffect(() => {
    if (!hasReddit) return;
    let cancelled = false;

    fetchRedditVideos(channel)
      .then((redditVideos) => {
        if (cancelled) return;
        setState({
          status: "ready",
          videos: mergeVideoSources(redditVideos, youtubeVideos),
        });
      })
      .catch((error: unknown) => {
        console.error(`Error fetching videos for /${channel.title}:`, error);
        if (cancelled) return;
        // Reddit is unreachable, but anything the server already fetched should
        // still render rather than the whole channel failing.
        setState(
          youtubeVideos.length > 0
            ? { status: "ready", videos: youtubeVideos }
            : { status: "error" },
        );
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
  if (state.videos.length === 0) {
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
      urlPrefix={urlPrefix ?? `/${channel.title}`}
      initialVideoId={initialVideoId}
    />
  );
};

export default ChannelView;
