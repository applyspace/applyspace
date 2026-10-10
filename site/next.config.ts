import path from 'node:path';
import type { NextConfig } from 'next';

// The site is served on the same origin as the app (applyspace.app): the app's
// proxy rewrites marketing routes to this project. Its build assets live under
// `/_site` so they never collide with the app's own `/_next` and `/public`.
const ASSET_PREFIX = '/_site';

const nextConfig: NextConfig = {
  assetPrefix: process.env.NODE_ENV === 'production' ? ASSET_PREFIX : undefined,
  turbopack: { root: path.resolve(__dirname) },
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io', pathname: '/images/**' }],
  },
  async rewrites() {
    return [{ source: `${ASSET_PREFIX}/_next/:path*`, destination: '/_next/:path*' }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;
