import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';
import { POSTHOG_PROXY_PATH } from './src/lib/analytics';

const baseConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['192.168.2.62', '192.168.0.114'],

  // Same-origin reverse proxy to PostHog EU, so analytics need no extra
  // (sub)domain and aren't dropped by blockers. The static/array rules must
  // come before the catch-all.
  async rewrites() {
    return [
      { source: `${POSTHOG_PROXY_PATH}/static/:path*`, destination: 'https://eu-assets.i.posthog.com/static/:path*' },
      { source: `${POSTHOG_PROXY_PATH}/array/:path*`, destination: 'https://eu-assets.i.posthog.com/array/:path*' },
      { source: `${POSTHOG_PROXY_PATH}/:path*`, destination: 'https://eu.i.posthog.com/:path*' },
    ];
  },
  // PostHog's endpoints end in a slash (e.g. /e/); a 308 redirect would break them.
  skipTrailingSlashRedirect: true,
  // Sentry registers an ESM loader hook at runtime that Next's file tracing can't
  // see, so standalone (Docker) builds miss the ESM builds it imports and log
  // "Failed to register diagnostics-channel injection hooks" (fewer server spans).
  // These globs copy the hook's full ESM import closure, including the
  // `build/esm/package.json` files that mark those folders as ESM.
  outputFileTracingIncludes: {
    '/**': [
      './node_modules/@sentry/server-runtime-injection/build/esm/**/*.js',
      './node_modules/@sentry/server-runtime-injection/build/esm/package.json',
      './node_modules/@sentry/server-utils/build/esm/**/*.js',
      './node_modules/@sentry/server-utils/build/esm/package.json',
      './node_modules/@sentry/core/build/esm/**/*.js',
      './node_modules/@sentry/core/build/esm/package.json',
      './node_modules/@sentry/conventions/dist/*.mjs',
      './node_modules/@opentelemetry/api/dist/**/*.mjs',
    ],
  },
};

const nextConfig = withSentryConfig(baseConfig, {
  org: 'vectrum-vs',
  project: 'timetablex',
  sentryUrl: 'https://de.sentry.io/',

  // Source maps are only uploaded when a token is present (Docker build secret in CI).
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Docker builds have no .git, so the release tag is passed in explicitly.
  release: { name: process.env.SENTRY_RELEASE },
  widenClientFileUpload: true,

  // Handled by src/app/sentry-tunnel/route.ts (handler mode).
  tunnelRoute: '/sentry-tunnel',

  silent: !process.env.CI,
});

export default nextConfig;
