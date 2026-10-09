import type { NextConfig } from "next";
import path from "node:path";

// Hosted build (Vercel): `/demo` serves the Offers page without an account.
// Left out of the desktop/standalone builds.
const IS_DEMO = process.env.APPLY_DEMO === '1' || Boolean(process.env.VERCEL);

const nextConfig: NextConfig = {
  // Packaged as an Electron app: we need the self-contained Next server
  // (`.next/standalone/server.js`) so Electron can fork it in prod.
  // See apps/desktop/src/main/nextServer.ts.
  output: 'standalone',

  // Anchor Next's dependency tracer at the monorepo root so it follows
  // pnpm's symlinked workspace packages (`@apply/db`) and their transitive
  // deps (next, react, drizzle-orm, …) into `.next/standalone/node_modules/`.
  // Without this, pnpm's flat-with-symlinks layout confuses the tracer and
  // `node_modules/` ends up empty → `require('next')` fails at runtime.
  outputFileTracingRoot: path.resolve(__dirname, '../..'),

  // Next's dependency tracer walks `fs.existsSync` calls and can copy dev
  // artifacts into `.next/standalone/`. Explicitly exclude the local dev DB
  // and cookie files — they should never ship in the packaged Electron app.
  outputFileTracingExcludes: {
    '*': [
      '**/.local/**',
      '**/apply.sqlite',
      '**/apps/web/data/**',
    ],
  },

  // Demo mode runs Drizzle migrations at runtime; make sure the SQL files are
  // part of the serverless bundle.
  outputFileTracingIncludes: {
    '/**': ['../../packages/db/drizzle/migrations/**/*'],
  },

  // `@apply/db` is a workspace package that ships ESM; Next's default
  // externalization for server packages would skip it. Making it part of the
  // server bundle keeps Server-Component code paths happy.
  serverExternalPackages: ['better-sqlite3'],

  // `@apply/core` ships TypeScript source (types and constants, no build step).
  transpilePackages: ['@apply/core'],

  // Cap the static-generation worker pool — Next would otherwise spawn one per
  // CPU core (11 on this machine) and each worker loads the server bundle +
  // better-sqlite3 + Server Components. 11 × ~2-4 GB overshoots our 18 GB
  // physical RAM and the OOM killer takes one down mid-generation (SIGKILL).
  // 2 workers keep the build under ~8 GB total and add only a few seconds.
  experimental: {
    cpus: 2,
  },

  async redirects() {
    if (!IS_DEMO) return [];
    // Once Supabase is configured, sign-in is real: the proxy sends signed-out
    // visitors from `/` to `/login`. Until then everything lands on the demo.
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
    return [
      { source: '/', destination: '/demo', permanent: false },
      { source: '/login', destination: '/demo', permanent: false },
    ];
  },

  async rewrites() {
    if (!IS_DEMO) return [];
    return [{ source: '/demo', destination: '/offers' }];
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
