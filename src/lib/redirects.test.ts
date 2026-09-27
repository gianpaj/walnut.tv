import assert from "node:assert/strict";
import { describe, it } from "node:test";

import nextConfig from "../../next.config.mjs";
import { getChannel } from "./data.ts";

describe("migration redirects", () => {
  it("sends the homepage to the configured Hustle category", async () => {
    const redirects = await nextConfig.redirects();
    const home = redirects.find(({ source }) => source === "/");

    assert.deepEqual(home, {
      source: "/",
      destination: "/hustle",
      permanent: false,
    });
    assert.ok(getChannel(home.destination.slice(1)));
  });

  it("redirects only the retired categories and their video links home", async () => {
    const redirects = await nextConfig.redirects();

    assert.deepEqual(
      redirects.filter(({ source }) => source !== "/"),
      ["reddit", "curious", "docus"].map((category) => ({
        source: `/${category}/:videoId?`,
        destination: "/",
        permanent: true,
      })),
    );
  });
});
