import withPWA from 'next-pwa'

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
    // Opt-out of automatic vendor-chunk extraction that broke the build
    optimizePackageImports: [],
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
  disable: process.env.NODE_ENV === 'development',
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

export default config
