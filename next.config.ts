import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  compress: true,
  // Skip dynamic API routes during static export
  staticPageGenerationTimeout: 60,
};

export default nextConfig;
