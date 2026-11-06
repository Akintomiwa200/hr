import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node-zklib"],
  poweredByHeader: false,
  typescript: {
    // Netlify's build worker is capped at about 2 GB and its Next type-check
    // worker OOMs before compilation. Keep type checks available as `pnpm
    // typecheck`, and skip only the duplicate in-build check on constrained
    // hosted builders.
    ignoreBuildErrors:
      process.env.RENDER === "true" || process.env.NETLIFY === "true",
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
