import type { Metadata } from "next";
import { Poppins } from "next/font/google";

import "./globals.css";

import Header from "@/components/navbar/Header";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title:
    "walnut.tv - Your dose of daily videos on AI, Crypto, Entrepreneurship, Reddit, Documentaries",
  description:
    "walnut.tv - Your dose of daily videos on AI, Crypto, Entrepreneurship, Reddit, Documentaries",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export const dynamic = "force-dynamic";

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
      </body>
    </html>
  );
}
