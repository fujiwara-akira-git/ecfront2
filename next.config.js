/** @type {import('next').NextConfig} */
const path = require('path')
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  // ensure Next uses this project folder as the tracing root
  outputFileTracingRoot: __dirname,
  webpack: (config) => {
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@/': path.resolve(__dirname) + '/',
      '@': path.resolve(__dirname),
    }
    return config
  },
  async headers() {
    // Only apply this override for local / non-Vercel environments.
    // On Vercel (process.env.VERCEL === '1') we keep default behavior.
    if (process.env.VERCEL === '1') return []

    // For HTML requests, set short/no-cache so local browsers don't keep old prerendered HTML.
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'header',
            key: 'accept',
            value: 'text/html',
          },
        ],
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, max-age=0, must-revalidate',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
