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
    // Try to read prerender manifest produced by Next to get all prerendered routes.
    const fs = require('fs')
    const manifestPath = path.resolve(__dirname, '.next', 'prerender-manifest.json')

    // Extra local-only routes to always include (easy to edit)
    const extraLocalCacheControlRoutes = ['/', '/auth/signup', '/_not-found']

    let manifestRoutes = []
    try {
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
        manifestRoutes = Object.keys(manifest.routes || {})
      }
    } catch (e) {
      // fallback to empty manifestRoutes; we'll still use extraLocalCacheControlRoutes
      console.warn('[next.config] could not read prerender-manifest.json, falling back to extraLocalCacheControlRoutes')
    }

    // merge manifest routes with extra routes and dedupe
    const allRoutes = Array.from(new Set([...manifestRoutes, ...extraLocalCacheControlRoutes]))

    return allRoutes.map((r) => ({
      source: r,
      headers: [
        {
          key: 'Cache-Control',
          value: 'private, no-cache, no-store, max-age=0, must-revalidate',
        },
      ],
    }))
  },
}

module.exports = nextConfig
