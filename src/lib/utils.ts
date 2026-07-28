import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Matches /{slug} and /{slug}/{videoId}, but not /{slug}foo.
 * Phase 1 restores the /{channel}/{id} URLs the live site uses.
 */
export function isActiveChannel(pathname: string, slug: string) {
  return pathname === `/${slug}` || pathname.startsWith(`/${slug}/`);
}

function getDurationInSec(durationString: string) {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(\d+)S/;
  const matches = durationString.match(regex) ?? [];

  const hours = parseInt(matches[1] ?? "0");
  const minutes = parseInt(matches[2] ?? "0");
  const seconds = parseInt(matches[3] ?? "0");

  const totalSeconds = hours * 60 * 60 + minutes * 60 + seconds;

  return totalSeconds;
}

export function isShortDuration(duration: string) {
  return getDurationInSec(duration) <= 60;
}
