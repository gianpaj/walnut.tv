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

const { channels } = require("../channels");

const API = "https://www.googleapis.com/youtube/v3/channels";
const BATCH = 50;

/** Returns `{ id, problem }` for each channel that is missing or has no videos. */
async function findEmptyChannels(ids, key) {
  const problems = [];
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const url = `${API}?${new URLSearchParams({ part: "statistics", id: batch.join(","), key })}`;
    const response = await fetch(url);
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.error) {
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
  return problems;
}

function warn(message) {
  console.log(
    process.env.GITHUB_ACTIONS ? `::warning title=channels.js::${message}` : `Warning: ${message}`,
  );
}

async function main() {
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

  try {
    const problems = await findEmptyChannels([...byId.keys()], key);
    for (const { id, problem } of problems) {
      warn(
        `YouTube channel ${id} (${byId.get(id).join(", ")}) ${problem}; remove it from channels.js.`,
      );
    }
    console.log(`Checked ${byId.size} YouTube channels: ${problems.length} to remove.`);
  } catch (error) {
    warn(`Could not check YouTube channels: ${error.message}`);
  }
}

module.exports = { findEmptyChannels };

if (require.main === module) main();
