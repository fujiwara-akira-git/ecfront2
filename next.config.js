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
}

module.exports = nextConfig
