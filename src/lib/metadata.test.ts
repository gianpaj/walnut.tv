import type { Metadata } from "next";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import robots from "../app/robots.ts";
import { channelLabel, channels } from "./data.ts";
import { createRouteMetadata } from "./metadata.ts";

const ORIGIN = "https://walnut.tv";
const parent: Pick<Metadata, "openGraph" | "twitter"> = {
  openGraph: {
    type: "website",
    siteName: "Walnut",
    title: "walnut.tv",
    description: "Your dose of daily videos",
    url: `${ORIGIN}/`,
    images: [{ url: `${ORIGIN}/walnut.tv-og-image.png`, width: 960, height: 480 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "walnut.tv",
    description: "Your dose of daily videos",
    images: [`${ORIGIN}/walnut.tv-og-image.png`],
  },
};

function assertSocialMetadata(metadata: Metadata, title: string, canonical: string) {
  assert.equal(metadata.title, title);
  assert.deepEqual(metadata.alternates, { canonical });
  // Assert complete objects: Next does not fill missing social fields from the layout.
  assert.deepEqual(metadata.openGraph, { ...parent.openGraph, title, url: canonical });
  assert.deepEqual(metadata.twitter, { ...parent.twitter, title });
  assert.equal(new URL(canonical, ORIGIN).origin, ORIGIN);
}

describe("route metadata", () => {
  for (const channel of channels) {
    for (const videoId of [undefined, "aB_cD-12345"]) {
      const canonical = `/${channel.title}${videoId ? `/${videoId}` : ""}`;
      it(`retains the layout social preview on ${canonical}`, () => {
        const title = `${channelLabel(channel)} videos - walnut.tv`;
        const metadata = createRouteMetadata({ title, segments: [channel.title], videoId }, parent);

        assertSocialMetadata(metadata, title, canonical);
        assert.equal(metadata.robots, undefined);
      });
    }
  }

  for (const videoId of [undefined, "post-id"]) {
    it(`keeps Reddit ${videoId ? "video pages" : "listings"} noindex with social previews`, () => {
      const title = "r/videos videos - walnut.tv";
      const metadata = createRouteMetadata(
        { title, segments: ["r", "videos"], videoId, noindex: true },
        parent,
      );

      assertSocialMetadata(metadata, title, `/r/videos${videoId ? `/${videoId}` : ""}`);
      assert.deepEqual(metadata.robots, { index: false, follow: true });
    });
  }

  it("uses the deep-link canonical for a single legacy ?v= value", () => {
    const options = { title: "AI videos - walnut.tv", segments: ["ai"] };
    const fromQuery = createRouteMetadata({ ...options, videoId: "aB_cD-12345" }, parent);
    const fromPath = createRouteMetadata({ ...options, segments: ["ai", "aB_cD-12345"] }, parent);
    assert.deepEqual(fromQuery, fromPath);
  });

  it("ignores empty and repeated ?v= values, matching page selection", () => {
    for (const videoId of [undefined, "", ["first", "second"]]) {
      const metadata = createRouteMetadata(
        { title: "AI videos - walnut.tv", segments: ["ai"], videoId },
        parent,
      );
      assert.deepEqual(metadata.alternates, { canonical: "/ai" });
    }
  });

  it("encodes decoded route segments without creating extra paths, queries or fragments", () => {
    const metadata = createRouteMetadata(
      {
        title: "r/test videos - walnut.tv",
        segments: ["r", "a/b?#% café"],
        videoId: "//example.com/watch?v=x#player",
        noindex: true,
      },
      parent,
    );
    const canonical = "/r/a%2Fb%3F%23%25%20caf%C3%A9/%2F%2Fexample.com%2Fwatch%3Fv%3Dx%23player";
    assertSocialMetadata(metadata, "r/test videos - walnut.tv", canonical);
    assert.equal(new URL(canonical, ORIGIN).search, "");
    assert.equal(new URL(canonical, ORIGIN).hash, "");
  });

  it("preserves parent-specific images without mutating parent metadata", () => {
    const customParent = structuredClone(parent);
    assert.ok(customParent.twitter);
    customParent.twitter.images = ["https://walnut.tv/custom-preview.png"];
    const before = structuredClone(customParent);
    const metadata = createRouteMetadata(
      { title: "AI videos - walnut.tv", segments: ["ai"] },
      customParent,
    );
    assert.deepEqual(metadata.twitter?.images, customParent.twitter.images);
    assert.deepEqual(customParent, before);
  });

  it("allows crawling Reddit pages so their noindex directive can be read", () => {
    assert.deepEqual(robots(), {
      rules: { userAgent: "*", allow: "/" },
      sitemap: `${ORIGIN}/sitemap.xml`,
    });
  });
});

function readPublicAsset(path: string) {
  return readFileSync(new URL(`../../public${path}`, import.meta.url));
}

function assertPng(path: string, width: number, height: number) {
  const png = readPublicAsset(path);
  assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.equal(png.toString("ascii", 12, 16), "IHDR");
  assert.equal(png.readUInt32BE(16), width, path);
  assert.equal(png.readUInt32BE(20), height, path);
}

describe("metadata assets", () => {
  it("ships the social image and PNG icons at their declared dimensions", () => {
    assertPng("/walnut.tv-og-image.png", 960, 480);
    assertPng("/favicon-32x32.png", 32, 32);
    assertPng("/favicon-16x16.png", 16, 16);
    assertPng("/apple-touch-icon.png", 180, 180);
  });

  it("ships every manifest icon at its declared dimensions", () => {
    const manifest = JSON.parse(readPublicAsset("/site.webmanifest").toString()) as {
      icons: { src: string; sizes: string; type: string }[];
    };
    assert.ok(manifest.icons.length > 0);
    for (const icon of manifest.icons) {
      const [width, height] = icon.sizes.split("x").map(Number);
      assert.ok(width && height);
      assert.equal(icon.type, "image/png");
      assertPng(icon.src, width, height);
    }
  });

  it("ships the favicon, Safari mask and Windows tile assets", () => {
    const favicon = readFileSync(new URL("../app/favicon.ico", import.meta.url));
    assert.deepEqual(favicon.subarray(0, 4), Buffer.from([0, 0, 1, 0]));
    assert.ok(favicon.readUInt16LE(4) > 0);
    assert.match(readPublicAsset("/safari-pinned-tab.svg").toString(), /<svg\b/);
    const browserConfig = readPublicAsset("/browserconfig.xml").toString();
    const tilePath = /square150x150logo src="([^"]+)"/.exec(browserConfig)?.[1];
    assert.ok(tilePath);
    assert.ok(readPublicAsset(tilePath).length > 0);
  });
});
