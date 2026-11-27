import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { legacyRedirect } from "./legacyRedirect.ts";

describe("legacy SPA shim decoding", () => {
  const cases = [
    ["?p=/hustle", "/hustle"],
    ["?p=/ai/video-id", "/ai/video-id"],
    ["?p=/crypto/video-id", "/crypto/video-id"],
    ["?p=/r/videos", "/r/videos"],
    ["?p=/r/videos/post-id", "/r/videos/post-id"],
    ["?p=/ai&q=v=video-id", "/ai?v=video-id"],
    ["?p=/r/videos&q=v=post-id~and~sort=hot", "/r/videos?v=post-id&sort=hot"],
    ["?p=/ai/a~and~b&q=a=b=c~and~flag~and~empty=", "/ai/a&b?a=b=c&flag&empty="],
    ["?p=/ai/a%26b+z&q=x=a+b%20c%26d%3De~and~x=%2526", "/ai/a%26b+z?x=a+b%20c%26d%3De&x=%2526"],
    ["?p=/ai&q=x=%7Eand%7E~and~y=~and~", "/ai?x=%7Eand%7E&y=&"],
    ["?p=/ai&q=first=1&p=/crypto&q=last=2", "/crypto?last=2"],
    ["?p=/ai&q=inner=1&v=outer&other=ignored", "/ai?inner=1"],
    ["?p=/ai&q=", "/ai"],
    ["?p=/ai&q", "/ai"],
    ["?p", "/hustle"],
    ["?p=&q=v=video-id", "/hustle?v=video-id"],
    ["?p=/&q=v=video-id", "/hustle?v=video-id"],
    ["?p=/ai/..&q=v=video-id", "/hustle?v=video-id"],
    ["?p=/ai/%2e%2e", "/hustle"],
    ["?%70=/ai&q=x=1", "/hustle?%70=/ai&q=x=1"],
    ["?q=ordinary~and~query", "/hustle?q=ordinary~and~query"],
    ["?v=video-id", "/hustle?v=video-id"],
    ["", "/hustle"],
  ] as const;

  for (const [search, expected] of cases) {
    it(`decodes ${JSON.stringify(search)} as ${expected}`, () => {
      assert.equal(legacyRedirect(search), expected);
    });
  }

  it("round-trips the path and query transformation from master:404.html", () => {
    const original = new URL("https://walnut.tv/r/videos/post-id?a=b&tag=a%26b&tag=c+d#player");
    const search = `?p=${original.pathname.replace(/&/g, "~and~")}&q=${original.search.slice(1).replace(/&/g, "~and~")}`;
    assert.equal(legacyRedirect(search), original.pathname + original.search);
  });
});

describe("legacy redirect safety", () => {
  const unsafePaths = [
    "https://example.com/ai",
    "http://example.com/ai",
    "javascript:alert(1)",
    "//example.com/ai",
    "///example.com/ai",
    "/\\example.com/ai",
    "\\\\example.com/ai",
    "%2F%2Fexample.com/ai",
    "/%2fexample.com/ai",
    "/%5cexample.com/ai",
    "/ai/..//example.com/ai",
    "/ai/%2e%2e//example.com/ai",
    "ai/video-id",
    "/ai?other=query",
    "/ai#other-fragment",
    "/ai\r\nLocation:https://example.com",
    "/ai%0d%0aLocation:https://example.com",
    "/ai%00",
    "/ai%7f",
    "/ai%",
    "/ai%GG",
    "/ai%C0%AF",
  ];

  for (const path of unsafePaths) {
    it(`rejects ${JSON.stringify(path)} without forwarding the payload`, () => {
      assert.equal(legacyRedirect(`?p=${path}&q=v=untrusted`), "/hustle");
    });
  }

  it("keeps external URLs in query values as data", () => {
    assert.equal(
      legacyRedirect("?p=/ai&q=next=https://example.com/~and~v=video-id"),
      "/ai?next=https://example.com/&v=video-id",
    );
  });
});
