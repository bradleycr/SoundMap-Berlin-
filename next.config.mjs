import withPWA from 'next-pwa'
// import { withSentryConfig } from '@sentry/nextjs' // Temporarily disabled

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['localhost'],
    unoptimized: true,
  }
}

const config = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  cleanupOutdatedCaches: true, // Clean up old caches on deploy
  disable: process.env.NODE_ENV === 'development', // Disable PWA in development
  buildExcludes: [/app-build-manifest\.json$/], // Ignore problematic manifest
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.(?:mp3|wav|ogg|webm|aac)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'audio',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    {
      // Crucial rule for application code:
      // Always try the network first to get the latest app version.
      // Fallback to cache for offline support.
      urlPattern: ({ request }) => request.destination === 'script',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'scripts',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 2 * 24 * 60 * 60, // 2 days
        },
      },
    },
  ],
})(nextConfig)

// Export without Sentry for now - clean build first
export default config

// TODO: Re-enable Sentry after clean build works
// Enhanced Sentry configuration for SoundMap
// export default withSentryConfig(config, {
//   // Sentry build-time configuration
//   org: "aibuildersclub",
//   project: "soundmap",
//   // Only print logs for uploading source maps in CI
//   silent: !process.env.CI,
//   // Upload a larger set of source maps for prettier stack traces (increases build time)
//   widenClientFileUpload: true,
//   // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
//   tunnelRoute: "/monitoring",
//   // Automatically tree-shake Sentry logger statements to reduce bundle size
//   disableLogger: true,
//   // Enables automatic instrumentation of Vercel Cron Monitors
//   automaticVercelMonitors: true,
//   // Disable automatic client config since we use instrumentation-client.ts
//   autoInstrumentServerFunctions: false,
//   autoInstrumentMiddleware: false,
// });