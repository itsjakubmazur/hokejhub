import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@hokejhub/core"],
  // Reuse visited dynamic pages for 30 s so back/forward and tab hopping are instant.
  experimental: { staleTimes: { dynamic: 30 } },
};

export default nextConfig;
