import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Typecheck in CI/local; skipping on Render avoids OOM on small build instances.
    ignoreBuildErrors: process.env.RENDER === "true",
  },
  async redirects() {
    return [{ source: "/calendar", destination: "/holidays", permanent: true }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
