"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { LOOPBACK_RESOLVER_ORIGIN } from "./local-resolver";
import { parseMp4Url } from "./mp4-url";
import { directVideos } from "./videos";

const localRequest: RequestInit & { targetAddressSpace: "loopback" } = {
  cache: "no-store",
  credentials: "omit",
  redirect: "error",
  targetAddressSpace: "loopback",
};

const slots = [0, 1] as const;
const initialBufferSeconds = 5;
const playbackError = "The browser couldn’t play this YouTube URL. Resolve it again to retry.";
const playingMessage = "Playing directly from YouTube.";

type Slot = (typeof slots)[number];
type Video = (typeof directVideos)[number];

type Handoff = {
  trigger: "Next" | "Automatic";
  startedAt: number;
  buffered: number;
  frame?: number;
  timer?: number;
};

type Queue = {
  controller: AbortController;
  local: boolean;
  slot: Slot;
  video: Video;
  preload?: Promise<string | undefined>;
  handoff?: Handoff;
};

function otherSlot(slot: Slot): Slot {
  return slot === 0 ? 1 : 0;
}

function following(video: Video) {
  return directVideos[(directVideos.indexOf(video) + 1) % directVideos.length] ?? directVideos[0];
}

function bufferedAhead(video: HTMLVideoElement, time: number) {
  const ranges = video.buffered;
  for (let index = 0; index < ranges.length; index++) {
    if (ranges.start(index) <= time && ranges.end(index) > time) {
      return ranges.end(index) - time;
    }
  }
  return 0;
}

function clearVideo(video: HTMLVideoElement | null) {
  if (!video?.hasAttribute("src")) return;
  video.pause();
  video.removeAttribute("src");
  video.load();
}

function copyPlaybackSettings(outgoing: HTMLVideoElement, incoming: HTMLVideoElement) {
  incoming.muted = outgoing.muted;
  incoming.volume = outgoing.volume;
  incoming.playbackRate = outgoing.playbackRate;
}

async function loadMedia(
  queue: Queue,
  element: HTMLVideoElement,
  video: Video,
  preload: "metadata" | "auto",
) {
  const signal = queue.controller.signal;
  try {
    const endpoint = queue.local
      ? `${LOOPBACK_RESOLVER_ORIGIN}/resolve`
      : "/lab/player/direct/resolve";
    const response = await fetch(`${endpoint}?${new URLSearchParams({ id: video.id })}`, {
      ...(queue.local ? localRequest : { cache: "no-store" }),
      signal,
    });
    const result = (await response.json()) as { url?: string; error?: string };
    const url = result.url && parseMp4Url(result.url);
    if (!response.ok || !url) return result.error ?? "Couldn’t resolve the video.";
    if (signal.aborted) return;

    element.preload = preload;
    element.src = url;
  } catch {
    return queue.local
      ? "Couldn’t reach the local resolver. Start it on this device and allow loopback access in Chrome."
      : "Couldn’t reach the resolver. Try again.";
  }
}

export default function DirectPlayer() {
  const firstVideo = useRef<HTMLVideoElement>(null);
  const secondVideo = useRef<HTMLVideoElement>(null);
  const currentQueue = useRef<Queue | null>(null);
  const [startVideo, setStartVideo] = useState<Video>(directVideos[0]);
  const [local, setLocal] = useState(false);
  const [view, setView] = useState<{ slot: Slot; video: Video; incoming?: Slot }>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [buffered, setBuffered] = useState(0);
  const [lastHandoff, setLastHandoff] = useState<{
    trigger: Handoff["trigger"];
    ms: number;
    buffered: number;
  }>();

  useEffect(() => {
    return () => {
      const queue = currentQueue.current;
      queue?.controller.abort();
      window.clearTimeout(queue?.handoff?.timer);
      currentQueue.current = null;
    };
  }, []);

  function elementAt(slot: Slot) {
    return (slot === 0 ? firstVideo : secondVideo).current;
  }

  function reset() {
    const queue = currentQueue.current;
    queue?.controller.abort();
    window.clearTimeout(queue?.handoff?.timer);
    currentQueue.current = null;
    for (const slot of slots) clearVideo(elementAt(slot));
    setView(undefined);
    setLoading(false);
    setMessage("");
    setBuffered(0);
    setLastHandoff(undefined);
  }

  async function resolveVideo(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (local && !window.isSecureContext) {
      setMessage("Open this lab over HTTPS to use the local resolver.");
      return;
    }

    const element = elementAt(0);
    if (!element) return;

    reset();
    const queue: Queue = { controller: new AbortController(), local, slot: 0, video: startVideo };
    currentQueue.current = queue;
    setLoading(true);
    setMessage("Resolving YouTube URL…");
    const error = await loadMedia(queue, element, startVideo, "metadata");
    if (currentQueue.current !== queue) return;
    setLoading(false);
    if (error) {
      setMessage(error);
      return;
    }
    setView({ slot: 0, video: startVideo });
    setMessage("URL resolved. Press play.");
  }

  function prepareNext(queue: Queue, active: HTMLVideoElement) {
    if (queue.preload || queue.handoff || active.paused || active.seeking) return;
    const headroom = Math.min(initialBufferSeconds, active.duration - active.currentTime);
    if (!(headroom > 0 && bufferedAhead(active, active.currentTime) >= headroom)) return;

    const standby = elementAt(otherSlot(queue.slot));
    if (standby) queue.preload = loadMedia(queue, standby, following(queue.video), "auto");
  }

  function mediaProgress(slot: Slot, element: HTMLVideoElement) {
    const queue = currentQueue.current;
    if (!queue || queue.handoff) return;

    if (queue.slot === slot) prepareNext(queue, element);
    else {
      const seconds = Math.min(initialBufferSeconds, bufferedAhead(element, 0));
      setBuffered(Math.floor(seconds * 10) / 10);
    }
  }

  function finishHandoff(queue: Queue, handoff: Handoff, message: string, frameAt?: number) {
    if (currentQueue.current !== queue || queue.handoff !== handoff) return;
    const active = elementAt(queue.slot);
    if (handoff.frame !== undefined) active?.cancelVideoFrameCallback(handoff.frame);
    window.clearTimeout(handoff.timer);
    queue.handoff = undefined;

    // Put the new frame in front before unloading the outgoing element.
    flushSync(() => setView({ slot: queue.slot, video: queue.video }));
    clearVideo(elementAt(otherSlot(queue.slot)));
    setMessage(message);
    if (frameAt !== undefined) {
      setLastHandoff({
        trigger: handoff.trigger,
        ms: Math.round(frameAt - handoff.startedAt),
        buffered: handoff.buffered,
      });
    }
    if (active) prepareNext(queue, active);
  }

  function playing(slot: Slot, video: HTMLVideoElement) {
    const queue = currentQueue.current;
    if (!queue || queue.slot !== slot) return;
    const handoff = queue.handoff;
    if (!handoff) {
      setMessage(playingMessage);
      prepareNext(queue, video);
      return;
    }

    if (handoff.frame === undefined) {
      finishHandoff(queue, handoff, playingMessage);
    } else {
      // Some browsers stop reporting frames when the incoming element is covered.
      handoff.timer ??= window.setTimeout(() => finishHandoff(queue, handoff, playingMessage), 500);
    }
  }

  async function advance(trigger: Handoff["trigger"], startedAt: number) {
    const queue = currentQueue.current;
    if (!queue || queue.handoff) return;
    const outgoing = elementAt(queue.slot);
    const slot = otherSlot(queue.slot);
    const incoming = elementAt(slot);
    if (!outgoing || !incoming) return;

    const handoff: Handoff = {
      trigger,
      startedAt,
      buffered: Math.floor(bufferedAhead(incoming, 0) * 10) / 10,
    };
    const preload = queue.preload;
    if (incoming.error) clearVideo(incoming);
    outgoing.pause();
    copyPlaybackSettings(outgoing, incoming);

    setView({ slot: queue.slot, video: queue.video, incoming: slot });
    setMessage("Starting next video…");
    setBuffered(0);
    setLastHandoff(undefined);
    queue.video = following(queue.video);
    queue.slot = slot;
    queue.handoff = handoff;
    queue.preload = undefined;

    // A loaded element can play in the Next button's gesture. A cold skip
    // waits for the existing request, or resolves a fresh URL if that failed.
    if (!incoming.hasAttribute("src")) {
      await preload;
      if (currentQueue.current !== queue || queue.handoff !== handoff) return;
      if (!incoming.hasAttribute("src")) {
        const error = await loadMedia(queue, incoming, queue.video, "auto");
        if (currentQueue.current !== queue || queue.handoff !== handoff) return;
        if (error) {
          finishHandoff(queue, handoff, error);
          return;
        }
      }
    }

    try {
      if (typeof incoming.requestVideoFrameCallback === "function") {
        handoff.frame = incoming.requestVideoFrameCallback((now) => {
          finishHandoff(queue, handoff, playingMessage, now);
        });
      }
      await incoming.play();
    } catch (error) {
      const blocked = error instanceof DOMException && error.name === "NotAllowedError";
      finishHandoff(queue, handoff, blocked ? "Press play to continue." : playbackError);
    }
  }

  return (
    <>
      <form onSubmit={resolveVideo} className="mb-4 flex flex-wrap items-end gap-3">
        <label className="grid min-w-0 gap-1 text-sm">
          Starting video
          <select
            className="h-10 max-w-full rounded-md border border-input bg-background px-2"
            value={startVideo.id}
            disabled={loading}
            onChange={(event) => {
              const selected = directVideos.find(({ id }) => id === event.target.value);
              if (selected) {
                reset();
                setStartVideo(selected);
              }
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
          {view ? "Resolve again" : "Resolve video"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!view || loading || view.incoming !== undefined}
          onClick={(event) => void advance("Next", event.timeStamp)}
        >
          Next
        </Button>
        <label className="flex h-10 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={local}
            disabled={loading}
            onChange={(event) => {
              reset();
              setLocal(event.target.checked);
            }}
          />
          Use local resolver
        </label>
      </form>
      <div className="relative aspect-video overflow-hidden rounded-md border border-border bg-black">
        {slots.map((slot) => {
          const front = view?.slot === slot;
          const incoming = view?.incoming === slot;
          return (
            <video
              key={slot}
              ref={slot === 0 ? firstVideo : secondVideo}
              className={cn(
                "absolute inset-0 h-full w-full bg-black object-contain",
                front ? "z-10" : "pointer-events-none",
                !front && !incoming && "invisible",
              )}
              aria-hidden={!front}
              controls={front && view.incoming === undefined}
              playsInline
              onProgress={(event) => mediaProgress(slot, event.currentTarget)}
              onLoadedData={(event) => mediaProgress(slot, event.currentTarget)}
              onTimeUpdate={(event) => mediaProgress(slot, event.currentTarget)}
              onPlaying={(event) => playing(slot, event.currentTarget)}
              onEnded={(event) => {
                if (currentQueue.current?.slot === slot && event.currentTarget.ended) {
                  void advance("Automatic", event.timeStamp);
                }
              }}
              onError={(event) => {
                const queue = currentQueue.current;
                if (!queue || !event.currentTarget.error) return;
                if (queue.slot !== slot) setBuffered(0);
                else if (queue.handoff) finishHandoff(queue, queue.handoff, playbackError);
                else setMessage(playbackError);
              }}
            />
          );
        })}
      </div>
      {view && (
        <div className="mt-3 space-y-1 text-sm">
          <p>Now playing · {view.video.title}</p>
          <p className="text-muted-foreground">
            Up next · {following(view.video).title} · {buffered}
            {buffered === initialBufferSeconds ? "+" : ""}s buffered
          </p>
          {lastHandoff && (
            <p className="text-muted-foreground">
              {lastHandoff.trigger} · {lastHandoff.ms} ms to first frame · {lastHandoff.buffered}s
              buffered
            </p>
          )}
        </div>
      )}
      <p role="status" className="mt-3 min-h-5 text-sm text-muted-foreground">
        {message}
      </p>
    </>
  );
}
