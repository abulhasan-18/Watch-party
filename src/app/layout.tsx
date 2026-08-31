// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import ToasterProvider from "@/components/providers/ToasterProvider";

export const metadata: Metadata = {
  title: "Watch Party | Watch YouTube Videos Together in Real-Time",
  description:
    "Create private rooms to watch synchronized YouTube videos with friends and live chat in real-time. No login required.",
  keywords: ["watch party", "youtube sync", "synchronized video", "group watch", "live chat"],
  openGraph: {
    title: "Watch Party | Synchronized YouTube Streaming",
    description:
      "Watch YouTube videos with friends in perfect sync with real-time chat. No login needed.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0b0b0b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 dark:bg-[#0b0b0b] antialiased">
        <ToasterProvider />
        {children}
      </body>
    </html>
  );
}
