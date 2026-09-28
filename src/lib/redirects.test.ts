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

  it("hands raw and platform-normalized shim requests to the browser decoder", () => {
    for (const search of [
      "?p=/ai&q=v=video-id~and~tag=a%26b~and~tag=c+d",
      "?p=%2Fai&q=v%3Dvideo-id~and~tag%3Da%26b~and~tag%3Dc%20d",
      "?p=",
      "?p=//external.invalid",
      "?p=/ai%GG",
    ]) {
      const response = redirect(search);
      assert.equal(response.headers.get("x-middleware-next"), "1");
      assert.equal(response.headers.get("location"), null);
    }
  });

  it("omits a fragment in Location so the browser inherits the original fragment", () => {
    const response = redirect("?v=video-id#player");
    assert.equal(response.headers.get("location"), `${ORIGIN}/hustle?v=video-id`);
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

  it("hands retired and unknown shim paths to the same browser decoder", () => {
    for (const path of ["/reddit", "/curious/video-id", "/docus/video-id", "/unknown/video-id"]) {
      assert.equal(redirect(`?p=${path}`).headers.get("x-middleware-next"), "1");
    }
  });
});
