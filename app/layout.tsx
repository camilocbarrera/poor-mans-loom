import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL || 'https://poor-mans-loom.vercel.app'),
  title: "Poor Man's Loom — Screen Recording",
  description: "Minimal screen recording for everyone",
  openGraph: {
    title: "Poor Man's Loom",
    description: "Free, local screen recording. Record, edit, and export — all in your browser.",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Poor Man's Loom — Screen Recording",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Poor Man's Loom",
    description: "Free, local screen recording. Record, edit, and export — all in your browser.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0a] text-neutral-100`}
      >
        <div className="noise-overlay" aria-hidden="true" />
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
