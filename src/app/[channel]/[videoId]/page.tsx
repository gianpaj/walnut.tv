import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";

import ChannelView from "@/components/ChannelView";
import { channelLabel, getChannel } from "@/lib/data";
import { createRouteMetadata } from "@/lib/metadata";

interface VideoPageProps {
  params: Promise<{ channel: string; videoId: string }>;
}

export async function generateMetadata(
  { params }: VideoPageProps,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { channel: slug, videoId } = await params;
  const channel = getChannel(slug);
  if (!channel) return {};

  return createRouteMetadata(
    {
      title: `${channelLabel(channel)} videos - walnut.tv`,
      segments: [channel.title],
      videoId,
    },
    await parent,
  );
}

/**
 * Deep link to one video, the URL shape the live site produces. The id is a
 * Reddit post id or a YouTube video id depending on the source; if it is no
 * longer in the current listing, ChannelView falls back to the first video.
 */
export default async function ChannelVideoPage({ params }: VideoPageProps) {
  const { channel: slug, videoId } = await params;
  const channel = getChannel(slug);
  if (!channel) notFound();

  return <ChannelView key={channel.title} channel={channel} initialVideoId={videoId} />;
}
