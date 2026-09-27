import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ChannelView from "@/components/ChannelView";
import { channelLabel, channels, getChannel } from "@/lib/data";

interface ChannelPageProps {
  params: Promise<{ channel: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export function generateStaticParams() {
  return channels.map((channel) => ({ channel: channel.title }));
}

export async function generateMetadata({
  params,
}: ChannelPageProps): Promise<Metadata> {
  const { channel: slug } = await params;
  const channel = getChannel(slug);
  if (!channel) return {};

  const title = `${channelLabel(channel)} videos - walnut.tv`;
  return {
    title,
    alternates: { canonical: `/${channel.title}` },
    openGraph: { title, url: `/${channel.title}` },
  };
}

/**
 * Server component so an unknown slug returns a real 404 status. The fetching
 * below it has to stay client-side while Reddit blocks datacenter IPs.
 */
export default async function ChannelPage({
  params,
  searchParams,
}: ChannelPageProps) {
  const { channel: slug } = await params;
  const channel = getChannel(slug);
  if (!channel) notFound();

  // ?v={id} is the URL shape the first Next.js draft produced. Still accepted
  // so links from it keep working; VideoDisplay rewrites them to /{slug}/{id}.
  const v = (await searchParams).v;
  const initialVideoId = typeof v === "string" ? v : undefined;

  return (
    <ChannelView
      key={channel.title}
      channel={channel}
      initialVideoId={initialVideoId}
    />
  );
}
