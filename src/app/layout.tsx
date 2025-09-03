// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import ToasterProvider from "@/components/providers/ToasterProvider";

export const metadata: Metadata = {
  title: "Watch Party",
  description: "Admin interface for EdPlatform",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
