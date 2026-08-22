/** @type {import('next').NextConfig} */
const nextConfig = {
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
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
