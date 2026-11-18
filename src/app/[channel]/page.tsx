import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";

import ChannelView from "@/components/ChannelView";
import { channelLabel, channels, getChannel } from "@/lib/data";
import { createRouteMetadata } from "@/lib/metadata";

interface ChannelPageProps {
  params: Promise<{ channel: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export function generateStaticParams() {
  return channels.map((channel) => ({ channel: channel.title }));
}

export async function generateMetadata(
  { params, searchParams }: ChannelPageProps,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { channel: slug } = await params;
  const channel = getChannel(slug);
  if (!channel) return {};

  const v = (await searchParams).v;
  return createRouteMetadata(
    {
      title: `${channelLabel(channel)} videos - walnut.tv`,
      segments: [channel.title],
      videoId: v,
    },
    await parent,
  );
}

/** Validate before fetching or streaming so unknown channels return HTTP 404. */
export default async function ChannelPage({ params, searchParams }: ChannelPageProps) {
  const { channel: slug } = await params;
  const channel = getChannel(slug);
  if (!channel) notFound();

  // ?v={id} is the URL shape the first Next.js draft produced. Still accepted
  // so links from it keep working; VideoDisplay rewrites them to /{slug}/{id}.
  const v = (await searchParams).v;
  const initialVideoId = typeof v === "string" ? v : undefined;

  return <ChannelView key={channel.title} channel={channel} initialVideoId={initialVideoId} />;
}
