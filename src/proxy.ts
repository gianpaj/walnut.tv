import { type NextRequest, NextResponse } from "next/server.js";

import { legacyRedirect } from "./lib/legacyRedirect.ts";

export function proxy(request: NextRequest) {
  const destination = legacyRedirect(request.nextUrl.search);
  // A Location without a fragment lets the browser inherit the original fragment.
  return NextResponse.redirect(new URL(destination, request.url), 307);
}

export const config = { matcher: "/" };
