import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ChannelView from "@/components/ChannelView";
import { channelLabel, getChannel } from "@/lib/data";

interface VideoPageProps {
  params: Promise<{ channel: string; videoId: string }>;
}

export async function generateMetadata({
  params,
}: VideoPageProps): Promise<Metadata> {
  const { channel: slug, videoId } = await params;
  const channel = getChannel(slug);
  if (!channel) return {};

  const title = `${channelLabel(channel)} videos - walnut.tv`;
  return {
    title,
    alternates: { canonical: `/${channel.title}/${videoId}` },
    openGraph: { title, url: `/${channel.title}/${videoId}` },
  };
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

  return (
    <ChannelView
      key={channel.title}
      channel={channel}
      initialVideoId={videoId}
    />
  );
}
