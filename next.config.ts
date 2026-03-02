import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["geo-tz"],
  outputFileTracingIncludes: {
    "/api/setup": ["./supabase/migrations/*"],
  },
};

export default nextConfig;
