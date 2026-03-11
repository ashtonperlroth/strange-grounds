import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#059669",
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "localhost:3000"}`,
  ),
  title: "Strange Grounds — Backcountry Conditions Intelligence",
  description:
    "Every data source, one briefing. AI-powered conditions analysis for backcountry travel.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Strange Grounds",
  },
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
        <Toaster position="bottom-right" richColors />
        <Script
          data-domain="strange-grounds.vercel.app"
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
        <Analytics />
      </body>
    </html>
  );
}
