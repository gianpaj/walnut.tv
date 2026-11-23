"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import {
  Captions,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import styles from "./player.module.css";

const mediaPath = "/lab/player";
const bookmarkKey = "walnut:player-lab:sintel:position";

type Phase = "intro" | "video" | "outro";
type FullscreenVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
};

function subscribeToBookmark(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readBookmark() {
  try {
    const position = Number(window.localStorage.getItem(bookmarkKey));
    return Number.isFinite(position) && position >= 1 ? position : 0;
  } catch {
    return 0;
  }
}

function writeBookmark(position: number) {
  try {
    if (position >= 1) window.localStorage.setItem(bookmarkKey, String(position));
    else window.localStorage.removeItem(bookmarkKey);
  } catch {
    // Playback also works when the browser disables local storage.
  }
}

function formatTime(seconds: number) {
  const wholeSeconds = Math.floor(seconds);
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}

function toggleCaptions(video: HTMLVideoElement | null) {
  const track = video?.textTracks[0];
  if (!track) return false;
  track.mode = track.mode === "showing" ? "disabled" : "showing";
  return track.mode === "showing";
}

export default function NativePlayer() {
  const playerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<FullscreenVideo>(null);
  const stageActionsRef = useRef<HTMLDivElement>(null);
  const transportRef = useRef<HTMLButtonElement>(null);
  const hasPlayed = useRef(false);
  const lastSave = useRef(0);

  const [phase, setPhase] = useState<Phase>("intro");
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [message, setMessage] = useState("");
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [previewTime, setPreviewTime] = useState<number | null>(null);
  const [scrubberFocused, setScrubberFocused] = useState(false);
  const bookmark = useSyncExternalStore(subscribeToBookmark, readBookmark, () => 0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const save = () => {
      if (hasPlayed.current && !video.ended) writeBookmark(video.currentTime);
    };
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") save();
    };
    const updateFullscreen = () => setFullscreen(document.fullscreenElement === playerRef.current);
    const updateCaptions = () => setCaptions(video.textTracks[0]?.mode === "showing");

    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", saveWhenHidden);
    document.addEventListener("fullscreenchange", updateFullscreen);
    video.textTracks.addEventListener("change", updateCaptions);

    return () => {
      save();
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", saveWhenHidden);
      document.removeEventListener("fullscreenchange", updateFullscreen);
      video.textTracks.removeEventListener("change", updateCaptions);
    };
  }, []);

  function startPlayback(start?: number) {
    const video = videoRef.current;
    if (!video) return;

    setMessage("");
    const resumeAt = start ?? (video.error ? position : undefined);
    if (video.error) video.load();
    if (resumeAt !== undefined) {
      video.currentTime =
        Number.isFinite(video.duration) && resumeAt >= video.duration ? 0 : resumeAt;
    }
    void video.play().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("Playback couldn’t start. Try playing again.");
    });
  }

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;

    if (phase === "intro") startPlayback(bookmark);
    else if (phase === "outro") startPlayback(0);
    else if (video.paused) startPlayback();
    else video.pause();
  }

  async function toggleFullscreen() {
    const player = playerRef.current;
    if (!player) return;

    try {
      if (document.fullscreenElement === player) await document.exitFullscreen();
      else if (document.fullscreenEnabled && player.requestFullscreen) {
        await player.requestFullscreen();
      } else if (videoRef.current?.webkitEnterFullscreen) {
        videoRef.current.webkitEnterFullscreen();
      } else {
        setMessage("Fullscreen is unavailable in this browser.");
      }
    } catch {
      setMessage("Couldn’t enter fullscreen.");
    }
  }

  function seekTo(seconds: number) {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(duration, seconds));
    setPosition(video.currentTime);
    if (phase === "outro" && video.currentTime < duration) setPhase("video");
  }

  const canSeek = duration > 0 && phase !== "intro";
  const preview = canSeek ? (previewTime ?? (scrubberFocused ? position : null)) : null;
  // The sprite samples a frame every three seconds in six columns.
  const previewFrame = preview === null ? 0 : Math.min(17, Math.floor(preview / 3));
  const progress = duration > 0 ? (position / duration) * 100 : 0;
  const playLabel = phase === "outro" ? "Replay" : playing ? "Pause" : "Play";
  const PlayIcon = phase === "outro" ? RotateCcw : playing ? Pause : Play;
  const VolumeIcon = muted ? VolumeX : Volume2;
  const FullscreenIcon = fullscreen ? Minimize : Maximize;

  return (
    <div ref={playerRef} className={cn(styles.player, "rounded-md border border-border bg-black")}>
      <div className="relative flex aspect-video min-h-0 items-center justify-center overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-contain"
          poster={`${mediaPath}/intro.webp`}
          src={`${mediaPath}/sintel.mp4`}
          playsInline
          preload="metadata"
          onDurationChange={(event) => {
            const nextDuration = event.currentTarget.duration;
            setDuration(Number.isFinite(nextDuration) ? nextDuration : 0);
          }}
          onPlaying={(event) => {
            // The browser can load metadata before React hydrates the page.
            const clipDuration = event.currentTarget.duration;
            setDuration(Number.isFinite(clipDuration) ? clipDuration : 0);
            if (stageActionsRef.current?.contains(document.activeElement)) {
              transportRef.current?.focus({ preventScroll: true });
            }
            hasPlayed.current = true;
            setPhase("video");
            setPlaying(true);
            setMessage("");
          }}
          onPause={(event) => {
            setPlaying(false);
            if (hasPlayed.current && !event.currentTarget.ended) {
              writeBookmark(event.currentTarget.currentTime);
            }
          }}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            setPosition(video.currentTime);
            const now = Date.now();
            if (
              hasPlayed.current &&
              !video.paused &&
              !video.ended &&
              now - lastSave.current >= 5000
            ) {
              writeBookmark(video.currentTime);
              lastSave.current = now;
            }
          }}
          onSeeked={(event) => {
            if (hasPlayed.current && !event.currentTarget.ended) {
              writeBookmark(event.currentTarget.currentTime);
            }
          }}
          onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
          onEnded={() => {
            hasPlayed.current = false;
            writeBookmark(0);
            setPlaying(false);
            setPhase("outro");
          }}
          onError={() => {
            setPlaying(false);
            setMessage("The trailer couldn’t load. Try playing again.");
          }}
        >
          <track kind="captions" src={`${mediaPath}/sintel.en.vtt`} srcLang="en" label="English" />
        </video>

        {phase === "outro" && (
          <Image
            fill
            unoptimized
            className="object-contain"
            src={`${mediaPath}/outro.webp`}
            alt=""
          />
        )}
        {phase !== "video" && (
          <div
            ref={stageActionsRef}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/25"
          >
            <Button type="button" className="gap-2" onClick={togglePlayback}>
              <PlayIcon aria-hidden="true" size={18} />
              {phase === "intro" && bookmark > 0 ? `Resume at ${formatTime(bookmark)}` : playLabel}
            </Button>
            {phase === "intro" && bookmark > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => startPlayback(0)}>
                Start over
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="px-3 pb-2 pt-1 sm:px-4">
        <div className="relative">
          {preview !== null && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-full z-10 w-40 -translate-x-1/2 overflow-hidden rounded border border-white/30 bg-black text-center text-xs text-white shadow-lg"
              style={{ left: `clamp(80px, ${(preview / duration) * 100}%, 100% - 80px)` }}
            >
              <div
                className="h-[90px] w-[160px]"
                style={{
                  backgroundImage: `url(${mediaPath}/frames.webp)`,
                  backgroundPosition: `${-(previewFrame % 6) * 160}px ${-Math.floor(previewFrame / 6) * 90}px`,
                }}
              />
              <div className="py-1 tabular-nums">{formatTime(preview)}</div>
            </div>
          )}
          <input
            aria-label="Seek"
            aria-valuetext={`${formatTime(position)} of ${formatTime(duration)}`}
            className={styles.scrubber}
            disabled={!canSeek}
            type="range"
            min={0}
            max={duration || 1}
            step="0.1"
            value={position}
            style={{ "--progress": `${progress}%` } as React.CSSProperties}
            onFocus={(event) => setScrubberFocused(event.currentTarget.matches(":focus-visible"))}
            onKeyDown={(event) => {
              setScrubberFocused(true);
              setPreviewTime(null);
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault();
                seekTo(position + (event.key === "ArrowRight" ? 5 : -5));
              }
            }}
            onBlur={() => setScrubberFocused(false)}
            onPointerMove={(event) => {
              if (!canSeek) return;
              const rect = event.currentTarget.getBoundingClientRect();
              const fraction = (event.clientX - rect.left) / rect.width;
              setPreviewTime(Math.min(duration, Math.max(0, fraction * duration)));
            }}
            onPointerLeave={() => setPreviewTime(null)}
            onPointerUp={() => {
              setScrubberFocused(false);
              setPreviewTime(null);
            }}
            onPointerCancel={() => setPreviewTime(null)}
            onChange={(event) => seekTo(Number(event.currentTarget.value))}
          />
        </div>
        <div className="flex items-center gap-1 text-white">
          <Button
            type="button"
            ref={transportRef}
            aria-label={playLabel}
            variant="ghost"
            size="icon"
            onClick={togglePlayback}
          >
            <PlayIcon aria-hidden="true" size={18} />
          </Button>
          <Button
            type="button"
            aria-label={muted ? "Unmute" : "Mute"}
            variant="ghost"
            size="icon"
            onClick={() => {
              if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
            }}
          >
            <VolumeIcon aria-hidden="true" size={18} />
          </Button>
          <span className="ml-1 text-xs tabular-nums text-neutral-300">
            {formatTime(position)} / {formatTime(duration)}
          </span>
          <Button
            type="button"
            aria-label="Captions"
            aria-pressed={captions}
            variant="ghost"
            size="icon"
            className={cn("ml-auto", captions && "text-primary hover:text-primary")}
            onClick={() => setCaptions(toggleCaptions(videoRef.current))}
          >
            <Captions aria-hidden="true" size={18} />
          </Button>
          <Button
            type="button"
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            variant="ghost"
            size="icon"
            disabled={!fullscreen && phase !== "video"}
            onClick={() => void toggleFullscreen()}
          >
            <FullscreenIcon aria-hidden="true" size={18} />
          </Button>
        </div>
        {message && (
          <p role="status" className="px-2 py-1 text-sm text-neutral-200">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
