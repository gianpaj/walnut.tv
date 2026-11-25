import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { parseMp4Url } from "./mp4-url.ts";
import { directVideos } from "./videos.ts";

const run = promisify(execFile);
const pending = new Map<string, Promise<string | undefined>>();

async function resolveMp4(binary: string, id: string) {
  const { stdout } = await run(
    binary,
    [
      "--ignore-config",
      "--no-plugin-dirs",
      "--no-cache-dir",
      "--no-playlist",
      "--no-check-formats",
      "--js-runtimes",
      "node",
      "--get-url",
      "--socket-timeout",
      "8",
      "--retries",
      "0",
      "--extractor-retries",
      "0",
      "--extractor-args",
      "youtube:player_client=web_embedded",
      "--format",
      "best[protocol=https][ext=mp4][vcodec^=avc1][acodec^=mp4a]",
      `https://www.youtube.com/watch?v=${id}`,
    ],
    { timeout: 20_000, maxBuffer: 32 * 1024 },
  );
  return parseMp4Url(stdout);
}

export async function resolveVideo(id: string | null) {
  const video = directVideos.find((candidate) => candidate.id === id);
  if (!video) {
    return { status: 400, body: { error: "Choose a lab video." } };
  }

  const binary = process.env.PLAYER_LAB_YT_DLP;
  if (!binary) {
    return { status: 503, body: { error: "The lab resolver is off." } };
  }

  let resolution = pending.get(video.id);
  if (!resolution) {
    resolution = resolveMp4(binary, video.id).finally(() => pending.delete(video.id));
    pending.set(video.id, resolution);
  }

  const url = await resolution.catch(() => undefined);
  if (!url) {
    return {
      status: 502,
      body: { error: "The resolver couldn’t find a compatible YouTube MP4." },
    };
  }
  return { status: 200, body: { url } };
}
