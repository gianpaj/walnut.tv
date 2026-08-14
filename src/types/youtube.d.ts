// @types/youtube declares the YT namespace and window.YT, but not the global
// ready callback the IFrame API invokes once the script has loaded.
declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
  }
}

export {};
