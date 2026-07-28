import type { MetadataRoute } from "next";

import { channels } from "@/lib/data";

const SITE = "https://walnut.tv";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE}/`,
      changeFrequency: "daily",
      priority: 1,
    },
    // Only the configured channels. /{channel}/{id} and /r/{subreddit} point at
    // listings that turn over daily, so there is nothing stable to submit.
    ...channels.map((channel) => ({
      url: `${SITE}/${channel.title}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
