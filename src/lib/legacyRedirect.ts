const DEFAULT_DESTINATION = "/hustle";
const INTERNAL_ORIGIN = "https://walnut.invalid";

/** Decode the raw GitHub Pages SPA shim query, not URLSearchParams values. */
export function legacyRedirect(search: string): string {
  let path: string | undefined;
  let query: string | undefined;

  // The shim preserves percent escapes and plus signs; duplicate keys use the last value.
  for (const parameter of search.slice(1).split("&")) {
    const [key, ...value] = parameter.split("=");
    if (key === "p") path = value.join("=").replace(/~and~/g, "&");
    if (key === "q") query = value.join("=").replace(/~and~/g, "&");
  }

  if (path === undefined) return DEFAULT_DESTINATION + search;
  if (path === "") path = "/";

  try {
    // Decode only for validation: encoded separators must not disguise an external URL.
    const decodedPath = decodeURIComponent(path);
    if (
      !decodedPath.startsWith("/") ||
      decodedPath.startsWith("//") ||
      /[\\\s\u0000-\u001f\u007f]/.test(decodedPath)
    ) {
      return DEFAULT_DESTINATION;
    }

    const destination = new URL(path, INTERNAL_ORIGIN);
    if (
      !path.startsWith("/") ||
      destination.origin !== INTERNAL_ORIGIN ||
      destination.pathname.startsWith("//") ||
      destination.search ||
      destination.hash
    ) {
      return DEFAULT_DESTINATION;
    }

    // Empty/root paths must leave the shim without redirecting back into it.
    if (destination.pathname === "/") destination.pathname = DEFAULT_DESTINATION;
    destination.search = query ? `?${query}` : "";
    return destination.pathname + destination.search;
  } catch {
    return DEFAULT_DESTINATION;
  }
}
