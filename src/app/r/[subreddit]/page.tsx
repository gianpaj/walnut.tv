import type { Metadata, ResolvingMetadata } from "next";

import ChannelView from "@/components/ChannelView";
import type { Channel } from "@/lib/data";
import { createRouteMetadata } from "@/lib/metadata";

interface SubredditPageProps {
  params: Promise<{ subreddit: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Reddit allows letters, digits and underscores, 3-21 characters. */
const SUBREDDIT_PATTERN = /^\w{2,21}$/;

export async function generateMetadata(
  { params, searchParams }: SubredditPageProps,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { subreddit } = await params;
  const v = (await searchParams).v;
  return createRouteMetadata(
    {
      title: `r/${subreddit} videos - walnut.tv`,
      segments: ["r", subreddit],
      videoId: v,
      noindex: true,
    },
    await parent,
  );
}

/**
 * Browse any subreddit without it being in channels.js, the way /r/{sub} works
 * on the live site. Synthesises a Channel so the rest of the pipeline — fetch,
 * interleave, dedupe, /r/{sub}/{id} deep links — is shared with the real ones.
 */
export default async function SubredditPage({ params, searchParams }: SubredditPageProps) {
  const { subreddit } = await params;

  // No notFound() on a bad name: whether a subreddit exists is Reddit's to
  // answer, and the fetch happens in the browser. An unusable name simply
  // yields no videos and lands on the empty state.
  const safeName = SUBREDDIT_PATTERN.test(subreddit) ? subreddit : "";

  const channel: Channel = {
    title: `r/${subreddit}`,
    subreddit: safeName,
    minNumOfVotes: 0,
  };

  const v = (await searchParams).v;
  const initialVideoId = typeof v === "string" ? v : undefined;

  return (
    <ChannelView
      key={subreddit}
      channel={channel}
      urlPrefix={`/r/${subreddit}`}
      initialVideoId={initialVideoId}
    />
  );
}
