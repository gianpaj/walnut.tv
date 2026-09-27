import { NextRequest } from "next/server.js";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import nextConfig from "../../next.config.mjs";
import { config, proxy } from "../proxy.ts";
import { getChannel } from "./data.ts";

const ORIGIN = "https://walnut.tv";

function redirect(search = "") {
  return proxy(new NextRequest(`${ORIGIN}/${search}`));
}

describe("migration redirects", () => {
  it("sends the homepage to the configured Hustle category with a 307", () => {
    const response = redirect();
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), `${ORIGIN}/hustle`);
    assert.ok(getChannel("hustle"));
  });

  it("handles the root in the proxy before the default destination can discard the shim", async () => {
    assert.deepEqual(config, { matcher: "/" });
    assert.equal(nextConfig.skipProxyUrlNormalize, true);
    const redirects = await nextConfig.redirects();
    assert.ok(redirects.every(({ source }) => source !== "/"));
  });

  it("preserves ordinary homepage query parameters, including ?v=", () => {
    assert.equal(
      redirect("?v=video-id&utm_source=a+b%20c&q=ordinary").headers.get("location"),
      `${ORIGIN}/hustle?v=video-id&utm_source=a+b%20c&q=ordinary`,
    );
  });

  it("restores a shim's query without forwarding its wrapper parameters", () => {
    assert.equal(
      redirect("?p=/ai&q=v=video-id~and~tag=a%26b~and~tag=c+d&utm_source=outer").headers.get(
        "location",
      ),
      `${ORIGIN}/ai?v=video-id&tag=a%26b&tag=c+d`,
    );
  });

  it("omits a fragment in Location so the browser inherits the original fragment", () => {
    const response = redirect("?p=/r/videos/post-id&q=sort=hot#player");
    assert.equal(response.headers.get("location"), `${ORIGIN}/r/videos/post-id?sort=hot`);
  });

  it("redirects only the retired categories and their video links home", async () => {
    assert.deepEqual(
      await nextConfig.redirects(),
      ["reddit", "curious", "docus"].map((category) => ({
        source: `/${category}/:videoId?`,
        destination: "/",
        permanent: true,
      })),
    );
  });

  it("restores retired and unknown destinations for the existing redirect/404 rules", () => {
    for (const path of ["/reddit", "/curious/video-id", "/docus/video-id", "/unknown/video-id"]) {
      assert.equal(redirect(`?p=${path}`).headers.get("location"), ORIGIN + path);
    }
  });
});
