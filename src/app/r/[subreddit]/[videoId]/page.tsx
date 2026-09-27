import type { Metadata, ResolvingMetadata } from "next";

import ChannelView from "@/components/ChannelView";
import type { Channel } from "@/lib/data";
import { createRouteMetadata } from "@/lib/metadata";

interface SubredditVideoPageProps {
  params: Promise<{ subreddit: string; videoId: string }>;
}

const SUBREDDIT_PATTERN = /^\w{2,21}$/;

export async function generateMetadata(
  { params }: SubredditVideoPageProps,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { subreddit, videoId } = await params;
  return createRouteMetadata(
    {
      title: `r/${subreddit} videos - walnut.tv`,
      segments: ["r", subreddit],
      videoId,
      noindex: true,
    },
    await parent,
  );
}

export default async function SubredditVideoPage({ params }: SubredditVideoPageProps) {
  const { subreddit, videoId } = await params;

  const channel: Channel = {
    title: `r/${subreddit}`,
    subreddit: SUBREDDIT_PATTERN.test(subreddit) ? subreddit : "",
    minNumOfVotes: 0,
  };

  return (
    <ChannelView
      key={subreddit}
      channel={channel}
      urlPrefix={`/r/${subreddit}`}
      initialVideoId={videoId}
    />
  );
}
