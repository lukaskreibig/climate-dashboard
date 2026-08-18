import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // TypeScript build errors are enforced; lint cleanup remains separate
    // because archived legacy scene files still trip the strict ESLint setup.
    ignoreDuringBuilds: true,
  },
  images: {
    /**
     * The optimiser is switched off, and that is the point rather than a
     * regression. The photographs are encoded to AVIF and WebP once, by
     * scripts/gen-photo-variants.mjs, and served as files through the <picture>
     * in components/StoryPhoto.tsx.
     *
     * It used to encode on demand, and libaom is expensive out of all
     * proportion to what it produces: a single 2800 px AVIF took the server
     * process from 55 MB to 312 MB, four warmed photographs pushed the tree
     * 442 MB above idle, and the container has 512 MB and was being killed for
     * it. After the move, two full page loads cost 4 MB.
     *
     * `unoptimized` rather than a comment saying not to use next/image: if one
     * ever comes back, it should hand over the original file, not quietly bring
     * the 400 MB encode back with it. lib/__tests__/photoVariants.test.ts fails
     * if next/image is imported at all.
     */
    unoptimized: true,
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
