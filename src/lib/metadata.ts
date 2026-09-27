import type { Metadata } from "next";

interface RouteMetadataOptions {
  title: string;
  segments: readonly string[];
  videoId?: string | string[];
  noindex?: boolean;
}

export function createRouteMetadata(
  { title, segments, videoId, noindex = false }: RouteMetadataOptions,
  parent: Pick<Metadata, "openGraph" | "twitter">,
): Metadata {
  const path = typeof videoId === "string" && videoId ? [...segments, videoId] : segments;
  const canonical = `/${path.map(encodeURIComponent).join("/")}`;

  // Next replaces nested metadata objects rather than merging their fields.
  return {
    title,
    alternates: { canonical },
    openGraph: { ...parent.openGraph, title, url: canonical },
    twitter: { ...parent.twitter, title },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
