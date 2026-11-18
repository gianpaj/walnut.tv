import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { it } from "node:test";

// Node's test runner does not resolve Next's aliases or server-only condition.
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

const { fetchRedditVideos, fetchSubredditVideos } = await import("./reddit.ts");
hooks.deregister();

it("disabled Reddit makes no requests, with or without credentials", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", () => {
    throw new Error("Disabled Reddit must not make network requests");
  });
  const previousId = process.env.REDDIT_CLIENT_ID;
  const previousSecret = process.env.REDDIT_CLIENT_SECRET;
  t.after(() => {
    if (previousId === undefined) delete process.env.REDDIT_CLIENT_ID;
    else process.env.REDDIT_CLIENT_ID = previousId;
    if (previousSecret === undefined) delete process.env.REDDIT_CLIENT_SECRET;
    else process.env.REDDIT_CLIENT_SECRET = previousSecret;
  });

  for (const hasCredentials of [false, true]) {
    if (hasCredentials) {
      process.env.REDDIT_CLIENT_ID = "test-client";
      process.env.REDDIT_CLIENT_SECRET = "test-secret";
    } else {
      delete process.env.REDDIT_CLIENT_ID;
      delete process.env.REDDIT_CLIENT_SECRET;
    }

    assert.deepEqual(await fetchSubredditVideos("videos", 0), []);
    assert.deepEqual(
      await fetchRedditVideos({ title: "reddit", subreddit: "videos;documentaries" }),
      [],
    );
    assert.deepEqual(
      await fetchRedditVideos({ title: "youtube", youtubeChannels: "test-channel" }),
      [],
    );
  }
  assert.equal(fetch.mock.callCount(), 0);
});
