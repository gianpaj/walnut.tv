"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * useSyncExternalStore rather than useState + useEffect: matchMedia is an
 * external store, and this keeps the server snapshot explicit instead of
 * setting state from an effect on mount.
 */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", onChange);
      return () => mediaQuery.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Tailwind's `md` breakpoint. */
export const useIsDesktop = () => useMediaQuery("(min-width: 768px)");
