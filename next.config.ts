import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/setup": ["./supabase/migrations/*"],
  },
};

export default nextConfig;
