// Test-process preload only. Intercepts Google before Next's cache; no real API calls.
const fs = require("node:fs");
const path = require("node:path");
const { channels } = require(path.resolve(__dirname, "../../channels.js"));
const ids = [...new Set(channels.flatMap((c) => c.youtubeChannels.split(";")))];
const output = process.env.BROWSER_ACCEPTANCE_OUT;
if (!output) throw new Error("BROWSER_ACCEPTANCE_OUT is required for the acceptance preload");
const control = path.join(output, "fixture-control.json");
const log = path.join(output, "fixture-requests.jsonl");
const videoId = (n, i) => `fx${String(n * 4 + i).padStart(9, "0")}`;
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
async function fixture(url) {
  const config = JSON.parse(fs.readFileSync(control, "utf8"));
  const endpoint = url.pathname.split("/").at(-1);
  const id = url.searchParams.get("id") || url.searchParams.get("playlistId");
  fs.appendFileSync(log, JSON.stringify({ endpoint, id, mode: config.mode }) + "\n");
  if (config.delayMs) await new Promise((r) => setTimeout(r, config.delayMs));
  if (config.mode === "network") throw new TypeError("Fixture network failure");
  if (["denied", "quota"].includes(config.mode) || (config.mode === "partial" && id === ids[0])) {
    return json(
      {
        error: {
          code: 403,
          errors: [{ reason: config.mode === "quota" ? "quotaExceeded" : "forbidden" }],
        },
      },
      403,
    );
  }
  if (config.mode === "empty") return json({ items: [] });
  if (endpoint === "channels")
    return json({
      items: [{ contentDetails: { relatedPlaylists: { uploads: "uploads:" + id } } }],
    });
  if (endpoint === "playlistItems") {
    const n = ids.indexOf(id.replace("uploads:", ""));
    return json({
      items: [0, 1, 2, 3].map((i) => ({ snippet: { resourceId: { videoId: videoId(n, i) } } })),
    });
  }
  if (endpoint === "videos")
    return json({
      items: id.split(",").map((id) => {
        const n = Number(id.slice(2));
        const duration = ["PT3M", "PT1H", "PT2M", "PT1M59S"][n % 4];
        return {
          id,
          snippet: {
            title: `Fixture ${String(n).padStart(3, "0")} — ${duration}`,
            channelTitle: "Acceptance source",
            publishedAt: new Date(Date.UTC(2026, 8, 27) - n * 1000).toISOString(),
          },
          contentDetails: { duration },
        };
      }),
    });
  throw new Error("Unrecognized fixture endpoint");
}
function wrap(fn) {
  return new Proxy(fn, {
    apply(target, self, args) {
      const input = args[0];
      const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
      return url.hostname === "www.googleapis.com" && url.pathname.startsWith("/youtube/v3/")
        ? fixture(url)
        : Reflect.apply(target, self, args);
    },
  });
}
let wrapped = wrap(globalThis.fetch);
Object.defineProperty(globalThis, "fetch", {
  configurable: true,
  get: () => wrapped,
  set: (fn) => {
    wrapped = wrap(fn);
  },
});
