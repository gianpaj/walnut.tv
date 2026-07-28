// import { toast } from "react-hot-toast";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface VideoStore {
  // Store all the list of videos seen, currently watching, has already watched has already clicked and so on
  watchedVideos: string[];
  currentVideoWatching: string;
  clickedVideos: string[];
  addToWatchedVideos: (videoId: string) => void;
  addToClickedVideos: (videoId: string) => void;
  setCurrentVideoWatching: (videoId: string) => void;
}

/** Where the Vue app on walnut.tv keeps its watched YouTube video ids. */
const LEGACY_STORAGE_KEY = "videosWatched";

/**
 * Reads the watch history the live site wrote, so people who have been using
 * walnut.tv for years do not lose it at cutover. Deliberately non-destructive:
 * the old key is left in place, so going back to the live site mid-rollout
 * still shows the same history.
 */
function readLegacyWatchedVideos(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

const union = (a: string[], b: string[]) => Array.from(new Set([...a, ...b]));

const useVideo = create(
  persist<VideoStore>(
    (set, get) => ({
      // Seeded from the legacy key so a first-time visitor arriving from the
      // live site starts with their history already in place.
      watchedVideos: readLegacyWatchedVideos(),
      currentVideoWatching: "",
      clickedVideos: [],
      addToWatchedVideos: (videoId) => {
        const { watchedVideos } = get();
        if (watchedVideos.includes(videoId)) {
          // toast("Already watched this video");
        } else {
          set((state) => ({
            watchedVideos: [...state.watchedVideos, videoId],
          }));
        }
      },
      addToClickedVideos: (videoId) => {
        const { clickedVideos } = get();
        if (clickedVideos.includes(videoId)) {
          // toast("Already clicked this video");
        } else {
          set((state) => ({
            clickedVideos: [...state.clickedVideos, videoId],
          }));
        }
      },
      setCurrentVideoWatching: (videoId) => {
        set({
          currentVideoWatching: videoId,
        });
      },
    }),
    {
      name: "video-storage",
      storage: createJSONStorage(() => localStorage),
      // Union rather than replace: the seeded legacy ids live on `current`,
      // anything watched since lives on `persisted`. Idempotent, so it is safe
      // to run on every rehydrate.
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<VideoStore>;
        return {
          ...currentState,
          ...persisted,
          watchedVideos: union(
            currentState.watchedVideos,
            persisted.watchedVideos ?? [],
          ),
        };
      },
    },
  ),
);

export default useVideo;
