"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { directVideos } from "./videos";

export default function DirectPlayer() {
  const [videoId, setVideoId] = useState<string>(directVideos[0].id);
  const [source, setSource] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function resolveVideo(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setSource(undefined);
    setMessage("Resolving YouTube URL…");
    try {
      const response = await fetch(`/lab/player/direct/resolve?id=${videoId}`, {
        cache: "no-store",
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        setMessage(result.error ?? "Couldn’t resolve the video.");
        return;
      }
      setSource(result.url);
      setMessage("URL resolved. Press play.");
    } catch {
      setMessage("Couldn’t reach the resolver. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={resolveVideo} className="mb-4 flex flex-wrap items-end gap-3">
        <label className="grid min-w-0 gap-1 text-sm">
          Video
          <select
            className="h-10 max-w-full rounded-md border border-input bg-background px-2"
            value={videoId}
            disabled={loading}
            onChange={(event) => {
              setVideoId(event.target.value);
              setSource(undefined);
              setMessage("");
            }}
          >
            {directVideos.map(({ id, title }) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={loading}>
          {source ? "Resolve again" : "Resolve video"}
        </Button>
      </form>
      <div className="aspect-video overflow-hidden rounded-md border border-border bg-black">
        {source && (
          <video
            className="h-full w-full"
            src={source}
            controls
            playsInline
            preload="metadata"
            onPlaying={() => setMessage("Playing directly from YouTube.")}
            onError={() =>
              setMessage("The browser couldn’t play this YouTube URL. Resolve it again to retry.")
            }
          />
        )}
      </div>
      <p role="status" className="mt-3 min-h-5 text-sm text-muted-foreground">
        {message}
      </p>
    </>
  );
}
