import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Strange Grounds — Backcountry Conditions Intelligence",
  description:
    "Every data source, one briefing. AI-powered conditions analysis for backcountry travel.",
  openGraph: {
    title: "Strange Grounds — Backcountry Conditions Intelligence",
    description:
      "Every data source, one briefing. AI-powered conditions analysis for backcountry travel.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Strange Grounds — Backcountry Conditions Intelligence",
    description:
      "Every data source, one briefing. AI-powered conditions analysis for backcountry travel.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
