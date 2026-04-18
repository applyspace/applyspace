import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Packaged as an Electron app: we need the self-contained Next server
  // (`.next/standalone/server.js`) so Electron can fork it in prod.
  // See apps/desktop/src/main/nextServer.ts.
  output: 'standalone',

  // `@apply/db` is a workspace package that ships ESM; Next's default
  // externalization for server packages would skip it. Making it part of the
  // server bundle keeps Server-Component code paths happy.
  serverExternalPackages: ['better-sqlite3'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
