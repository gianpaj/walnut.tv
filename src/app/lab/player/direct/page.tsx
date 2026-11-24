import type { Metadata } from "next";
import Link from "next/link";

import DirectPlayer from "./DirectPlayer";

export const metadata: Metadata = {
  title: "Direct YouTube playback | walnut.tv",
  robots: { index: false },
};

export default function DirectPlayerLab() {
  return (
    <main className="min-h-0 grow overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-12">
        <Link
          href="/lab/player"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Player lab
        </Link>
        <h1 className="mb-2 mt-3 text-2xl font-semibold">Direct YouTube playback</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Walnut finds the MP4 URL. Your browser streams it from YouTube.
        </p>
        <DirectPlayer />
      </div>
    </main>
  );
}
