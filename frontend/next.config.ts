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
  async headers() {
    return [
      {
        // Next serves everything in public/ with `max-age=0`, so every consumer
        // revalidates. That is invisible for a photo one element shows once, and
        // expensive for the two satellite rasters, which a Mapbox source, the
        // preloader, the pixel inspector and the second warm map all want:
        // measured, four revalidations inside one page view pulled 1206 KB
        // where 302 would do, because a revalidation of a `max-age=0` asset
        // comes back as a full 200, not a 304.
        //
        // An hour is deliberately short. It closes the within-visit duplication
        // completely, which is the whole of the measured cost, without betting
        // that nobody will ever replace a photo under the same filename. A
        // returning reader tomorrow still revalidates and still gets a cheap
        // 304 off the ETag. Raise it if these files are ever content hashed.
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
