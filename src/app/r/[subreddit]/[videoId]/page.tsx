import type { Metadata } from "next";

import ChannelView from "@/components/ChannelView";
import type { Channel } from "@/lib/data";

interface SubredditVideoPageProps {
  params: Promise<{ subreddit: string; videoId: string }>;
}

const SUBREDDIT_PATTERN = /^\w{2,21}$/;

export async function generateMetadata({
  params,
}: SubredditVideoPageProps): Promise<Metadata> {
  const { subreddit, videoId } = await params;
  const title = `r/${subreddit} videos - walnut.tv`;
  return {
    title,
    alternates: { canonical: `/r/${subreddit}/${videoId}` },
    openGraph: { title, url: `/r/${subreddit}/${videoId}` },
    robots: { index: false, follow: true },
  };
}

export default async function SubredditVideoPage({
  params,
}: SubredditVideoPageProps) {
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
      youtubeVideos={[]}
      urlPrefix={`/r/${subreddit}`}
      initialVideoId={videoId}
    />
  );
}
