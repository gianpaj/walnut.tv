"use client";

import { useEffect } from "react";
import Link from "next/link";

import { legacyRedirect } from "@/lib/legacyRedirect";

export default function LegacyRedirect() {
  useEffect(() => {
    // Vercel reserializes query parameters before Proxy, losing the shim's raw escapes.
    window.location.replace(legacyRedirect(window.location.search) + window.location.hash);
  }, []);

  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-4 px-6">
      <p role="status">Opening your saved link…</p>
      <Link href="/hustle" className="text-primary underline">
        Continue to the homepage
      </Link>
    </div>
  );
}
