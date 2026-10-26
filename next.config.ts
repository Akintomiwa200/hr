import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node-zklib"],
  poweredByHeader: false,
  typescript: {
    // Typecheck in CI/local; skipping on Render avoids OOM on small build instances.
    ignoreBuildErrors: process.env.RENDER === "true",
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
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
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
