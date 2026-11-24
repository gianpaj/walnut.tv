import type { Metadata } from "next";
import Link from "next/link";

import NativePlayer from "./NativePlayer";

export const metadata: Metadata = {
  title: "Player lab | walnut.tv",
  robots: { index: false },
};

export default function PlayerLab() {
  return (
    <main className="min-h-0 grow overflow-y-auto">
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-8 sm:py-12">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Player lab</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The same Sintel trailer in two players.
          </p>
        </header>

        <div className="grid gap-8 min-[993px]:grid-cols-2">
          <section aria-labelledby="native-heading" className="min-w-0">
            <h2 id="native-heading" className="mb-3 text-base font-semibold">
              Walnut
            </h2>
            <NativePlayer />
            <Link
              className="mt-3 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline"
              href="/lab/player/direct"
            >
              Test direct YouTube playback
            </Link>
          </section>

          <section aria-labelledby="youtube-heading" className="min-w-0">
            <h2 id="youtube-heading" className="mb-3 text-base font-semibold">
              YouTube
            </h2>
            <iframe
              className="aspect-video w-full rounded-md border border-border"
              src="https://www.youtube.com/embed/HOfdboHvshg?playsinline=1&rel=0"
              title="Sintel trailer on YouTube"
              loading="lazy"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
            <a
              className="mt-3 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline"
              href="https://www.youtube.com/watch?v=HOfdboHvshg"
            >
              Watch on YouTube
            </a>
          </section>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          <a className="underline underline-offset-4" href="https://durian.blender.org/">
            © copyright Blender Foundation | durian.blender.org
          </a>
          {" · "}
          <a
            className="underline underline-offset-4"
            href="https://creativecommons.org/licenses/by/3.0/"
          >
            CC BY 3.0
          </a>
        </p>
      </div>
    </main>
  );
}
