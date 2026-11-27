import type { Metadata } from "next";

import LegacyRedirect from "@/components/LegacyRedirect";

export const metadata: Metadata = { robots: { index: false, follow: true } };

/** Only legacy shim requests reach this page; Proxy redirects ordinary home visits. */
export default function HomePage() {
  return <LegacyRedirect />;
}
