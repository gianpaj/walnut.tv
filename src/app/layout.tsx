import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";

import "./globals.css";

import Analytics from "@/components/Analytics";
import Header from "@/components/navbar/Header";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
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
      <body className={poppins.className} suppressHydrationWarning={true}>
        <ToastProvider>
          <ThemeProvider attribute="class" defaultTheme="dark">
            <Header />
            {children}
          </ThemeProvider>
        </ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}
