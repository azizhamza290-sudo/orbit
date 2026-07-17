import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: {
    default: "Orbit — Team collaboration, beautifully simple",
    template: "%s · Orbit",
  },
  description:
    "Orbit is a free, open-source team collaboration platform. Channels, DMs, threads, file sharing and realtime search — no subscriptions, no ads, no tracking.",
  keywords: ["team chat", "collaboration", "open source", "slack alternative"],
  authors: [{ name: "Orbit" }],
  openGraph: {
    title: "Orbit — Team collaboration, beautifully simple",
    description: "Free, open-source, realtime team collaboration. No subscriptions. No ads.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0f16" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
