/**
 * Loads https://www.youtube.com/iframe_api once per page and resolves when
 * `YT.Player` is constructible. The API only calls the global
 * `onYouTubeIframeAPIReady` a single time, so every caller shares one promise.
 */
let apiPromise: Promise<typeof YT> | null = null;

export function loadYouTubeIframeApi(): Promise<typeof YT> {
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("The YouTube IFrame API needs a browser"));
      return;
    }
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }

    const previous: (() => void) | undefined = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      reject(new Error("Failed to load the YouTube IFrame API"));
    };
    document.head.appendChild(script);
  });

  return apiPromise;
}
