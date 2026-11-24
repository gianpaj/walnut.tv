import assert from "node:assert/strict";
import { test } from "node:test";

import { parseMp4Url } from "./mp4-url.ts";

const mp4 = "https://media.googlevideo.com/videoplayback?mime=video%2Fmp4&sig=example";

test("keeps the original signed MP4 URL", () => {
  assert.equal(parseMp4Url(`${mp4}\r\n`), mp4);
});

test("rejects unexpected resolver output", () => {
  for (const output of [
    "",
    `${mp4}\n${mp4}`,
    mp4.replace("https:", "http:"),
    mp4.replace("googlevideo.com", "googlevideo.com.example.com"),
    mp4.replace("media.googlevideo.com", "user@media.googlevideo.com"),
    mp4.replace("videoplayback", "manifest.m3u8"),
    mp4.replace("video%2Fmp4", "audio%2Fmp4"),
  ]) {
    assert.equal(parseMp4Url(output), undefined);
  }
});
