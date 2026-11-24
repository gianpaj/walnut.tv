export function parseMp4Url(output: string): string | undefined {
  const candidate = output.trim();
  if (/\s/.test(candidate)) return;

  const url = URL.parse(candidate);
  if (
    url?.protocol === "https:" &&
    url.hostname.endsWith(".googlevideo.com") &&
    url.pathname === "/videoplayback" &&
    url.searchParams.get("mime") === "video/mp4" &&
    !url.username &&
    !url.password &&
    !url.port &&
    !url.hash
  ) {
    return candidate;
  }
}
