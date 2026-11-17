#!/usr/bin/env node

/**
 * Warns about YouTube channels in channels.js that no longer exist or have no
 * public videos. The app shows nothing for them but still spends API quota on
 * every feed refresh. Never fails: it is a warning for CI and local use.
 *
 * Usage: YOUTUBE_API_KEY=... node scripts/check-channel-uploads.js
 *
 * Costs one quota unit per 50 channels (channels.list with statistics).
 */

const API = "https://www.googleapis.com/youtube/v3/channels";
const BATCH = 50;

/**
 * Returns `{ problems, error }`. `problems` lists `{ id, problem }` for each
 * missing or empty channel found before a request failed; `error` is set if
 * one did, so earlier findings are still reported.
 */
async function findEmptyChannels(ids, key) {
  const problems = [];
  try {
    await checkBatches(ids, key, problems);
  } catch (error) {
    return { problems, error };
  }
  return { problems };
}

async function checkBatches(ids, key, problems) {
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const url = `${API}?${new URLSearchParams({ part: "statistics", id: batch.join(","), key })}`;
    // Same optional header the app sends for a referrer-restricted key.
    const referer = process.env.YOUTUBE_API_REFERER;
    const response = await fetch(url, { headers: referer ? { Referer: referer } : {} });
    const body = await response.json().catch(() => ({}));
    // Anything but a channel list (e.g. an HTML error page with status 200)
    // would otherwise read as "every channel is gone".
    if (!response.ok || body.error || body.kind !== "youtube#channelListResponse") {
      // Do not echo the upstream message: it can contain the request URL and key.
      const reason = body.error?.errors?.[0]?.reason ?? "unknown";
      throw new Error(`YouTube API answered ${response.status} (${reason})`);
    }
    const found = new Map((body.items ?? []).map((item) => [item.id, item]));
    for (const id of batch) {
      const item = found.get(id);
      if (!item) problems.push({ id, problem: "no longer exists" });
      else if (item.statistics?.videoCount === "0")
        problems.push({ id, problem: "has no public videos" });
    }
  }
}

function warn(message) {
  console.log(
    process.env.GITHUB_ACTIONS ? `::warning title=channels.js::${message}` : `Warning: ${message}`,
  );
}

async function main() {
  // Loaded here so add-youtube-channel.js can import the helper without it.
  const { channels } = require("../channels");
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    console.log("YOUTUBE_API_KEY is not set; skipping the channel upload check.");
    return;
  }

  const byId = new Map();
  for (const channel of channels) {
    for (const id of (channel.youtubeChannels ?? "").split(";").filter(Boolean)) {
      byId.set(id, [...(byId.get(id) ?? []), channel.title]);
    }
  }

  const { problems, error } = await findEmptyChannels([...byId.keys()], key);
  for (const { id, problem } of problems) {
    warn(
      `YouTube channel ${id} (${byId.get(id).join(", ")}) ${problem}; remove it from channels.js.`,
    );
  }
  if (error) warn(`Could not check every YouTube channel: ${error.message}`);
  else console.log(`Checked ${byId.size} YouTube channels: ${problems.length} to remove.`);
}

module.exports = { findEmptyChannels };

if (require.main === module) main();
