import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDurationInSec(durationString: string) {
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
