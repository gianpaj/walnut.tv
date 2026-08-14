import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isShortDuration } from "./utils.ts";
import {
  dedupeByYouTubeId,
  interleaveArrays,
  isVideoObject,
  redditPostToVideo,
  youtubeIdFromUrl,
  youtubeThumbnail,
} from "./videoService.ts";

describe("interleaveArrays", () => {
  it("takes one element from each array in rotation", () => {
    assert.deepEqual(
      interleaveArrays([
        [1, 2, 3],
        [4, 5, 6, 7, 8],
        [9, 10],
      ]),
      // The order the live site's mixElementsFromArraysOfArrays produces.
      [1, 4, 9, 2, 5, 10, 3, 6, 7, 8],
    );
  });

  it("does not consume the arrays it is given", () => {
    const input = [[1, 2], [3]];
    interleaveArrays(input);
    assert.deepEqual(input, [[1, 2], [3]]);
  });

  it("skips empty arrays", () => {
    assert.deepEqual(interleaveArrays([[], [1], [], [2, 3]]), [1, 2, 3]);
  });

  it("handles no arrays at all", () => {
    assert.deepEqual(interleaveArrays([]), []);
  });
});

describe("youtubeIdFromUrl", () => {
  it("reads watch, youtu.be, shorts and embed URLs", () => {
    assert.equal(
      youtubeIdFromUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
      "dQw4w9WgXcQ",
    );
    assert.equal(
      youtubeIdFromUrl("https://youtu.be/dQw4w9WgXcQ"),
      "dQw4w9WgXcQ",
    );
    assert.equal(
      youtubeIdFromUrl("https://www.youtube.com/embed/dQw4w9WgXcQ"),
      "dQw4w9WgXcQ",
    );
    assert.equal(
      youtubeIdFromUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ"),
      "dQw4w9WgXcQ",
    );
    assert.equal(
      youtubeIdFromUrl("https://www.youtube.com/watch?v=abc123&t=30s"),
      "abc123",
    );
  });

  it("rejects non-YouTube hosts rather than returning the last path segment", () => {
    assert.equal(youtubeIdFromUrl("https://example.com/dQw4w9WgXcQ"), "");
    assert.equal(youtubeIdFromUrl("https://vimeo.com/123456"), "");
    assert.equal(youtubeIdFromUrl("https://notyoutube.com/watch?v=abc"), "");
  });

  it("survives a malformed URL", () => {
    assert.equal(youtubeIdFromUrl("not a url"), "");
    assert.equal(youtubeIdFromUrl(""), "");
  });
});

describe("isShortDuration", () => {
  it("treats anything up to two minutes as a Short, like the live site", () => {
    assert.equal(isShortDuration("PT16S"), true);
    assert.equal(isShortDuration("PT2M0S"), true);
    assert.equal(isShortDuration("PT2M1S"), false);
    assert.equal(isShortDuration("PT1H27M11S"), false);
  });
});

function redditPost(overrides: Record<string, unknown> = {}) {
  return {
    kind: "t3",
    data: {
      id: "abc123",
      title: "Some video",
      author: "someone",
      score: 500,
      is_video: false,
      url: "https://youtu.be/dQw4w9WgXcQ",
      permalink: "/r/videos/comments/abc123/some_video/",
      media: { type: "youtube.com" },
      ...overrides,
    },
  } as unknown as RedditPost;
}

describe("redditPostToVideo", () => {
  it("keeps the reddit id for the URL and the youtube id for the player", () => {
    const video = redditPostToVideo(redditPost());
    assert.equal(video?.id, "abc123");
    assert.equal(video?.youtubeId, "dQw4w9WgXcQ");
  });

  it("links the title at the reddit thread, as the live site does", () => {
    assert.equal(
      redditPostToVideo(redditPost())?.url,
      "https://www.reddit.com/r/videos/comments/abc123/some_video/",
    );
  });

  it("derives the thumbnail from the youtube id", () => {
    assert.equal(
      redditPostToVideo(redditPost())?.thumbnail,
      youtubeThumbnail("dQw4w9WgXcQ"),
    );
  });

  it("drops a post whose link is not a youtube video", () => {
    assert.equal(
      redditPostToVideo(redditPost({ url: "https://example.com/x" })),
      null,
    );
  });
});

describe("isVideoObject", () => {
  it("accepts youtube-hosted posts", () => {
    assert.equal(isVideoObject(redditPost()), true);
  });

  it("rejects reddit-native video, which nothing renders yet", () => {
    assert.equal(isVideoObject(redditPost({ is_video: true })), false);
  });

  it("rejects posts with no media", () => {
    assert.equal(isVideoObject(redditPost({ media: null })), false);
  });
});

describe("dedupeByYouTubeId", () => {
  it("keeps the first occurrence of a video across sources", () => {
    const videos = [
      { id: "1", youtubeId: "yt1" },
      { id: "2", youtubeId: "yt2" },
      { id: "3", youtubeId: "yt1" },
    ] as VideoData[];
    assert.deepEqual(
      dedupeByYouTubeId(videos).map((video) => video.id),
      ["1", "2"],
    );
  });
});
