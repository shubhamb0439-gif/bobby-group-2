import { fileURLToPath } from "node:url";
import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: { root: path.dirname(fileURLToPath(import.meta.url)) },
  images: {
    // AVIF first (smallest), WebP fallback; optimised variants are cached for 30 days
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    // static files in /public rarely change: let browsers and Vercel's CDN keep them
    const longCache = [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }];
    return [
      { source: "/spices/:path*", headers: longCache },
      { source: "/certs/:path*", headers: longCache },
      { source: "/logo.png", headers: longCache },
      // 3D models and journey textures: the heaviest assets on the site, so cache them hard
      { source: "/models/:path*", headers: longCache },
      { source: "/textures/:path*", headers: longCache },
    ];
  },
};

export default nextConfig;
