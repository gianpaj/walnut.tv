import type { Metadata, Viewport } from "next";
import { Open_Sans } from "next/font/google";

import "./globals.css";

import Analytics from "@/components/Analytics";
import Header from "@/components/navbar/Header";
import { NavigationProvider } from "@/components/providers/NavigationProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";

// The weights the legacy site requests. Headings ask for 500 there, which
// falls back to 400 because 500 is not loaded.
const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

const description =
  "Your dose of daily videos on AI, Crypto, Entrepreneurship, Reddit, Documentaries";

export const metadata: Metadata = {
  metadataBase: new URL("https://walnut.tv"),
  title: {
    default: `walnut.tv - ${description}`,
    template: "%s",
  },
  description,
  applicationName: "Walnut",
  manifest: "/site.webmanifest",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Walnut",
    url: "/",
    title: `walnut.tv - ${description}`,
    description,
    images: [{ url: "/walnut.tv-og-image.png", width: 960, height: 480 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "walnut.tv",
    description,
    images: ["/walnut.tv-og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    other: [{ rel: "mask-icon", url: "/safari-pinned-tab.svg" }],
  },
  other: {
    "msapplication-TileColor": "#da532c",
    "msapplication-config": "/browserconfig.xml",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body
        className={`${openSans.className} text-[13px] leading-[1.42857143]`}
        suppressHydrationWarning={true}
      >
        <ToastProvider>
          <ThemeProvider attribute="class" defaultTheme="dark">
            <NavigationProvider>
              {/* Fixed height only for the sidebar layout; 993px matches useIsDesktop. */}
              <div className="flex min-h-dvh flex-col min-[993px]:h-dvh min-[993px]:overflow-hidden">
                <Header />
                {children}
              </div>
            </NavigationProvider>
          </ThemeProvider>
        </ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}
