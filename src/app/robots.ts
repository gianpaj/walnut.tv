import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // Crawlers must reach /r/ pages to see their noindex directive.
      allow: "/",
    },
    sitemap: "https://walnut.tv/sitemap.xml",
  };
}
