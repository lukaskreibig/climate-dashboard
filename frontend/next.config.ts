import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // TypeScript build errors are enforced; lint cleanup remains separate
    // because archived legacy scene files still trip the strict ESLint setup.
    ignoreDuringBuilds: true,
  },
  images: {
    // AVIF first, WebP for anything that cannot take it. These are photographs
    // of snow and rock, where AVIF is worth its slower encode: the encode
    // happens once per size and is cached, the download happens once per
    // reader. minimumCacheTTL keeps a variant for a year, which is safe
    // because a changed photo means a changed filename here.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31_536_000,
  },
};

export default nextConfig;
