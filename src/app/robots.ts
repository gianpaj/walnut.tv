import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Ad-hoc subreddit listings are unbounded and not worth crawling.
      disallow: "/r/",
    },
    sitemap: "https://walnut.tv/sitemap.xml",
  };
}
