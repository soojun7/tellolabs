import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "@remotion/lambda",
    "@remotion/lambda-client",
    "@remotion/renderer",
    "@remotion/bundler",
    "@remotion/streaming",
    "@remotion/compositor-darwin-arm64",
    "remotion",
  ],
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
