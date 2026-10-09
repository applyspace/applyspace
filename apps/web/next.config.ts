import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Packaged as an Electron app: we need the self-contained Next server
  // (`.next/standalone/server.js`) so Electron can fork it in prod.
  // See apps/desktop/src/main/nextServer.ts.
  output: 'standalone',

  // Anchor Next's dependency tracer at the monorepo root so it follows
  // pnpm's symlinked workspace packages (`@apply/core`, `@apply/db`) and their
  // transitive deps (next, react, drizzle-orm, …) into `.next/standalone/node_modules/`.
  // Without this, pnpm's flat-with-symlinks layout confuses the tracer and
  // `node_modules/` ends up empty → `require('next')` fails at runtime.
  outputFileTracingRoot: path.resolve(__dirname, '../..'),

  // Next's dependency tracer walks `fs.existsSync` calls and can copy dev
  // artifacts into `.next/standalone/`. Explicitly exclude the local cookie
  // files — they should never ship in the packaged Electron app.
  outputFileTracingExcludes: {
    '*': [
      '**/.local/**',
      '**/apps/web/data/**',
    ],
  },

  // `@apply/core` ships TypeScript source (types and constants, no build step).
  transpilePackages: ['@apply/core'],

  // Cap the static-generation worker pool — Next would otherwise spawn one per
  // CPU core (11 on this machine) and each worker loads the server bundle +
  // Server Components. 11 × ~2-4 GB overshoots our 18 GB
  // physical RAM and the OOM killer takes one down mid-generation (SIGKILL).
  // 2 workers keep the build under ~8 GB total and add only a few seconds.
  experimental: {
    cpus: 2,
  },

  // The public demo lives on `demo.*` (demo.applyspace.app): `/demo` serves the
  // Offers page there. The main domain and previews have no demo route.
  async rewrites() {
    return [
      {
        source: '/demo',
        has: [{ type: 'host', value: 'demo\\..+' }],
        destination: '/offers',
      },
    ];
  },

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
