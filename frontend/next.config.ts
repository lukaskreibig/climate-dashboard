import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // TypeScript build errors are enforced; lint cleanup remains separate
    // because archived legacy scene files still trip the strict ESLint setup.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
