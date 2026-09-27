import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { beforeEach, it, type TestContext } from "node:test";

import type { FeedIssue } from "./feed.ts";

// Exercise the real fetchers without Next's server-only condition or aliases.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: "data:text/javascript,", shortCircuit: true };
    }
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});
const { fetchChannelUploads, fetchYouTubeVideos } = await import("./youtube.ts");
const { fetchChannelVideos } = await import("./videos.ts");
const { channels, getYouTubeChannelIds } = await import("../data.ts");
hooks.deregister();

const SECRET = "private-test-api-key";
const RAW_ERROR = `https://www.googleapis.com/youtube/v3/channels?key=${SECRET}`;
const API_STEPS = ["channels", "playlistItems", "videos"] as const;

beforeEach((t) => {
  assert.ok("mock" in t);
  const envNames = [
    "YOUTUBE_API_KEY",
    "NEXT_PUBLIC_YOUTUBE_API_KEY",
    "YOUTUBE_API_REFERER",
    "REDDIT_CLIENT_ID",
    "REDDIT_CLIENT_SECRET",
  ] as const;
  const previousEnv = envNames.map((name) => [name, process.env[name]] as const);
  t.after(() => {
    for (const [name, value] of previousEnv) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
  process.env.YOUTUBE_API_KEY = SECRET;
  delete process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  delete process.env.YOUTUBE_API_REFERER;
  process.env.REDDIT_CLIENT_ID = "disabled-reddit-client";
  process.env.REDDIT_CLIENT_SECRET = "disabled-reddit-secret";

  const logs = (["error", "warn", "log", "info"] as const).map((method) =>
    t.mock.method(console, method, () => undefined),
  );
  t.after(() => {
    for (const log of logs) assert.equal(log.mock.callCount(), 0, "fetchers must not log errors");
  });
});

function videoItem(id: string, publishedAt = "2026-01-01T00:00:00Z", duration = "PT3M1S") {
  return {
    id,
    snippet: { title: `Video ${id}`, channelTitle: "Uploader", publishedAt },
    contentDetails: { duration },
  };
}

function requestUrl(input: Parameters<typeof fetch>[0]) {
  assert.ok(typeof input === "string", "fetchers pass URLs as strings");
  return new URL(input);
}

function mockApi(t: TestContext, override: (url: URL) => Response | undefined = () => undefined) {
  return t.mock.method(
    globalThis,
    "fetch",
    async (input: Parameters<typeof fetch>[0], _init?: RequestInit) => {
      const url = requestUrl(input);
      assert.equal(url.origin, "https://www.googleapis.com", "Reddit must remain disabled");
      const overridden = override(url);
      if (overridden) return overridden;

      switch (url.pathname.split("/").pop()) {
        case "channels":
          return Response.json({
            items: [
              {
                contentDetails: {
                  relatedPlaylists: { uploads: `uploads-${url.searchParams.get("id")}` },
                },
              },
            ],
          });
        case "playlistItems": {
          const channelId = url.searchParams.get("playlistId")?.replace(/^uploads-/, "");
          return Response.json({
            items: [0, 1, 2, 3].map((index) => ({
              snippet: { resourceId: { videoId: `${channelId}-${index}` } },
            })),
            nextPageToken: "must-not-backfill",
          });
        }
        case "videos":
          return Response.json({
            items: url.searchParams
              .get("id")
              ?.split(",")
              .map((id) => videoItem(id)),
          });
        default:
          throw new Error("Unexpected API endpoint");
      }
    },
  );
}

function failure(reason: FeedIssue["reason"]) {
  return { videos: [], issues: [{ source: "youtube", reason }] };
}

it("reports missing configuration without making a request", async (t) => {
  const fetch = mockApi(t);
  delete process.env.YOUTUBE_API_KEY;
  delete process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

  assert.deepEqual(await fetchChannelUploads("source"), failure("missing-config"));
  assert.deepEqual(
    await fetchChannelVideos({ title: "test", youtubeChannels: "source" }),
    failure("missing-config"),
  );
  assert.equal(fetch.mock.callCount(), 0);
});

it("uses the server key first, supports the fallback key and forwards the configured referer", async (t) => {
  const fetch = mockApi(t);
  process.env.NEXT_PUBLIC_YOUTUBE_API_KEY = "fallback-test-key";
  process.env.YOUTUBE_API_REFERER = "https://walnut.tv";

  assert.equal((await fetchChannelUploads("source")).videos.length, 4);
  delete process.env.YOUTUBE_API_KEY;
  assert.equal((await fetchChannelUploads("source")).videos.length, 4);

  for (const [index, call] of fetch.mock.calls.entries()) {
    const [input, init] = call.arguments;
    assert.equal(
      requestUrl(input).searchParams.get("key"),
      index < 3 ? SECRET : "fallback-test-key",
    );
    assert.deepEqual(init?.headers, { Referer: "https://walnut.tv" });
  }
});

const apiFailures: {
  name: string;
  status: number;
  reason?: string;
  expected: FeedIssue["reason"];
}[] = [
  { name: "forbidden access", status: 403, reason: "forbidden", expected: "api-denied" },
  { name: "unauthorized access", status: 401, expected: "api-denied" },
  { name: "quota exhaustion", status: 403, reason: "quotaExceeded", expected: "quota-exceeded" },
  {
    name: "daily quota exhaustion",
    status: 403,
    reason: "dailyLimitExceeded",
    expected: "quota-exceeded",
  },
  {
    name: "unregistered daily quota exhaustion",
    status: 403,
    reason: "dailyLimitExceededUnreg",
    expected: "quota-exceeded",
  },
  { name: "server failure", status: 503, reason: "backendError", expected: "fetch-failed" },
  {
    name: "rate limiting without quota evidence",
    status: 429,
    reason: "rateLimitExceeded",
    expected: "fetch-failed",
  },
  { name: "unknown failure", status: 400, reason: "unknown", expected: "fetch-failed" },
];

for (const step of API_STEPS) {
  for (const { name, status, reason, expected } of apiFailures) {
    it(`reports ${name} at ${step} without exposing the upstream message`, async (t) => {
      const fetch = mockApi(t, (url) => {
        if (!url.pathname.endsWith(`/${step}`)) return;
        return Response.json({ error: { message: RAW_ERROR, errors: [{ reason }] } }, { status });
      });
      assert.deepEqual(await fetchChannelUploads("source"), failure(expected));
      assert.equal(fetch.mock.callCount(), API_STEPS.indexOf(step) + 1);
    });
  }

  it(`reports network failure at ${step} without exposing the exception`, async (t) => {
    mockApi(t, (url) => {
      if (url.pathname.endsWith(`/${step}`)) throw new TypeError(RAW_ERROR);
    });
    assert.deepEqual(await fetchChannelUploads("source"), failure("fetch-failed"));
  });

  it(`keeps a successful empty ${step} response distinct from failure`, async (t) => {
    const fetch = mockApi(t, (url) => {
      if (url.pathname.endsWith(`/${step}`)) return Response.json({ items: [] });
    });
    assert.deepEqual(await fetchChannelUploads("source"), { videos: [], issues: [] });
    assert.equal(fetch.mock.callCount(), API_STEPS.indexOf(step) + 1);
  });
}

it("classifies error envelopes even when the HTTP status is successful", async (t) => {
  mockApi(t, () => Response.json({ error: { code: 403, message: RAW_ERROR } }));
  assert.deepEqual(await fetchChannelUploads("source"), failure("api-denied"));
});

it("does not infer quota from status or message text", async (t) => {
  mockApi(t, () =>
    Response.json({ error: { message: `quotaExceeded ${RAW_ERROR}` } }, { status: 403 }),
  );
  assert.deepEqual(await fetchChannelUploads("source"), failure("api-denied"));
});

for (const status of [200, 403, 502]) {
  it(`sanitizes non-JSON responses with HTTP ${status}`, async (t) => {
    mockApi(t, () => new Response(RAW_ERROR, { status }));
    assert.deepEqual(
      await fetchChannelUploads("source"),
      failure(status === 403 ? "api-denied" : "fetch-failed"),
    );
  });
}

it("sanitizes malformed JSON structures", async (t) => {
  mockApi(t, () => Response.json(null));
  assert.deepEqual(await fetchChannelUploads("source"), failure("fetch-failed"));
});

it("preserves the API request shapes, caches, four candidates and no backfill", async (t) => {
  const fetch = mockApi(t, (url) => {
    if (!url.pathname.endsWith("/videos")) return;
    return Response.json({
      items: [
        videoItem("source-0", "2026-01-01T00:00:00Z", "PT1M59S"),
        videoItem("source-1", "2026-01-01T00:00:00Z", "PT2M0S"),
        videoItem("source-2", "2026-01-01T00:00:00Z", "PT2M1S"),
        videoItem("source-3"),
      ],
      nextPageToken: "must-not-backfill",
    });
  });
  const result = await fetchChannelUploads("source");
  assert.deepEqual(result, {
    videos: ["source-2", "source-3"].map((id) => ({
      id,
      youtubeId: id,
      title: `Video ${id}`,
      thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${id}`,
      author: "Uploader",
      publishedAt: "2026-01-01T00:00:00Z",
    })),
    issues: [],
  });
  assert.equal(fetch.mock.callCount(), 3);
  const expectedParams = [
    { id: "source", part: "contentDetails", key: SECRET },
    { playlistId: "uploads-source", part: "snippet", maxResults: "4", key: SECRET },
    { id: "source-0,source-1,source-2,source-3", part: "snippet,contentDetails", key: SECRET },
  ];
  for (const [index, call] of fetch.mock.calls.entries()) {
    const [input, init] = call.arguments;
    const url = requestUrl(input);
    assert.equal(url.pathname, `/youtube/v3/${API_STEPS[index]}`);
    assert.deepEqual(Object.fromEntries(url.searchParams), expectedParams[index]);
    assert.deepEqual(init?.next, { revalidate: index === 0 ? 60 * 60 * 24 * 30 : 60 * 60 * 2 });
    assert.deepEqual(init?.headers, {});
  }
});

it("returns a successful empty feed when all candidates are filtered out", async (t) => {
  const fetch = mockApi(t, (url) => {
    if (!url.pathname.endsWith("/videos")) return;
    return Response.json({ items: [videoItem("short", undefined, "PT1M0S")] });
  });
  assert.deepEqual(await fetchChannelVideos({ title: "test", youtubeChannels: "source" }), {
    videos: [],
    issues: [],
  });
  assert.equal(fetch.mock.callCount(), 3);
});

it("considers every configured source ID with the same cache policy", async (t) => {
  const fetch = mockApi(t);
  for (const channel of channels) {
    const result = await fetchYouTubeVideos(channel);
    assert.equal(result.videos.length, getYouTubeChannelIds(channel).length * 4);
    assert.deepEqual(result.issues, []);
  }
  const requests = fetch.mock.calls.map(({ arguments: [input, init] }) => ({
    url: requestUrl(input),
    init,
  }));
  assert.deepEqual(
    requests
      .filter(({ url }) => url.pathname.endsWith("/channels"))
      .map(({ url }) => url.searchParams.get("id")),
    channels.flatMap(getYouTubeChannelIds),
  );
  assert.equal(requests.length, channels.flatMap(getYouTubeChannelIds).length * 3);
  for (const { url, init } of requests) {
    assert.deepEqual(init?.next, {
      revalidate: url.pathname.endsWith("/channels") ? 60 * 60 * 24 * 30 : 60 * 60 * 2,
    });
  }
});

it("interleaves sources by default and sorts newest-first when configured", async (t) => {
  mockApi(t, (url) => {
    if (!url.pathname.endsWith("/videos")) return;
    const first = url.searchParams.get("id")?.startsWith("first-");
    return Response.json({
      items: first
        ? [videoItem("older", "2026-01-01T00:00:00Z"), videoItem("newest", "2026-03-01T00:00:00Z")]
        : [videoItem("middle", "2026-02-01T00:00:00Z")],
    });
  });
  const channel = { title: "test", youtubeChannels: "first;second" };
  assert.deepEqual(
    (await fetchYouTubeVideos(channel)).videos.map(({ id }) => id),
    ["older", "middle", "newest"],
  );
  assert.deepEqual(
    (await fetchChannelVideos({ ...channel, sortBy: "new" })).videos.map(({ id }) => id),
    ["newest", "middle", "older"],
  );
});

it("preserves successful sources and all failure kinds through the combined feed", async (t) => {
  mockApi(t, (url) => {
    if (url.pathname.endsWith("/channels")) {
      const id = url.searchParams.get("id");
      if (id === "quota")
        return Response.json({ error: { errors: [{ reason: "quotaExceeded" }] } }, { status: 403 });
      if (id === "denied") return Response.json({ error: { message: RAW_ERROR } }, { status: 403 });
      if (id === "network") throw new Error(RAW_ERROR);
      if (id === "empty") return Response.json({ items: [] });
    }
  });
  const channel = {
    title: "test",
    subreddit: "videos",
    youtubeChannels: "good;quota;denied;network;empty;also-good",
    sortBy: "new",
  };
  const youtube = await fetchYouTubeVideos(channel);
  const combined = await fetchChannelVideos(channel);
  assert.deepEqual(combined, youtube);
  assert.equal(combined.videos.length, 8);
  assert.ok(combined.videos.some(({ id }) => id.startsWith("good-")));
  assert.ok(combined.videos.some(({ id }) => id.startsWith("also-good-")));
  assert.deepEqual(combined.issues, [
    { source: "youtube", reason: "quota-exceeded" },
    { source: "youtube", reason: "api-denied" },
    { source: "youtube", reason: "fetch-failed" },
  ]);
});

it("retains the failure when other sources succeed with no videos", async (t) => {
  mockApi(t, (url) => {
    if (url.searchParams.get("id") === "failed") throw new Error(RAW_ERROR);
    return Response.json({ items: [] });
  });
  assert.deepEqual(
    await fetchChannelVideos({ title: "test", youtubeChannels: "empty;failed" }),
    failure("fetch-failed"),
  );
});

it("reports complete quota failure through the combined feed", async (t) => {
  mockApi(t, () =>
    Response.json({ error: { errors: [{ reason: "quotaExceeded" }] } }, { status: 403 }),
  );
  assert.deepEqual(
    await fetchChannelVideos({ title: "test", youtubeChannels: "source" }),
    failure("quota-exceeded"),
  );
});

it("deduplicates successful videos without discarding partial-feed issues", async (t) => {
  mockApi(t, (url) => {
    if (url.searchParams.get("id") === "failed") throw new Error(RAW_ERROR);
    if (url.pathname.endsWith("/videos")) return Response.json({ items: [videoItem("shared")] });
  });
  const result = await fetchChannelVideos({
    title: "test",
    youtubeChannels: "first;second;failed",
    subreddit: "videos;documentaries",
  });
  assert.deepEqual(
    result.videos.map(({ id }) => id),
    ["shared"],
  );
  assert.deepEqual(result.issues, [{ source: "youtube", reason: "fetch-failed" }]);
});

it("makes no requests for disabled Reddit-only channels or unconfigured sources", async (t) => {
  const fetch = mockApi(t);
  delete process.env.YOUTUBE_API_KEY;
  for (const channel of [{ title: "test" }, { title: "test", subreddit: "videos;documentaries" }]) {
    assert.deepEqual(await fetchChannelVideos(channel), { videos: [], issues: [] });
  }
  assert.equal(fetch.mock.callCount(), 0);
});
