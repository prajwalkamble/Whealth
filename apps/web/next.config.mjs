/** @type {import('next').NextConfig} */
const nextConfig = {
  // A build and `next dev` cannot share .next -- building over a running dev
  // server corrupts it, and the failures afterwards point anywhere but here.
  // Setting NEXT_DIST_DIR lets a verification build run beside a dev server
  // someone is using: `NEXT_DIST_DIR=.next-build pnpm build`.
  distDir: process.env.NEXT_DIST_DIR || ".next",

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "randomuser.me",
      },
    ],
  },

  eslint: {
    // `next lint` cannot read a flat eslint.config.mjs in Next 15 -- it fails
    // with "Cannot serialize key \"parse\" in \"parser\"" and is removed in
    // Next 16 regardless. Linting runs as its own step: `pnpm lint`.
    ignoreDuringBuilds: true,
  },

  experimental: {
    serverActions: {
      // Vercel caps request bodies at 4.5 MB whatever this says; the receipt
      // scanner shrinks images to stay under 4 MB before uploading.
      bodySizeLimit: "4.5mb",
    },
  },
};

export default nextConfig;
