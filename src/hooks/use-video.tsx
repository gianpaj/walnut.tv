// import { toast } from "react-hot-toast";
// import { shared } from "use-broadcast-ts";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface VideoStore {
  // Store all the list of videos seen, currently watching, has already watched has alreadty clicked and so on
  watchedVideos: string[];
  currentVideoWatching: string;
  clickedVideos: string[];
  addToWatchedVideos: (videoId: string) => void;
  addToClickedVideos: (videoId: string) => void;
  setCurrentVideoWatching: (videoId: string) => void;
}

const useVideo = create(
  persist<VideoStore>(
    (set, get) => ({
      watchedVideos: [],
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
    },
  ),
  // ),
);

export default useVideo;
