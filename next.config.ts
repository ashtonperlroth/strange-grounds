import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/setup": ["./supabase/migrations/*"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://plausible.io",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.maptiler.com https://s3.amazonaws.com https://*.supabase.co",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.maptiler.com https://api.weather.gov https://nominatim.openstreetmap.org https://*.open-meteo.com https://wcc.sc.egov.usda.gov https://waterservices.usgs.gov https://services3.arcgis.com https://avalanche.org https://api.avalanche.org https://catalogue.dataspace.copernicus.eu https://identity.dataspace.copernicus.eu https://sh.dataspace.copernicus.eu https://overpass-api.de https://plausible.io https://*.ingest.sentry.io",
              "font-src 'self'",
              "frame-src 'none'",
              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? "",
  project: process.env.SENTRY_PROJECT ?? "",
  silent: !process.env.CI,
});
