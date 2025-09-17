/** @type {import('next').NextConfig} */
const path = require('path')
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  // ensure Next uses this project folder as the tracing root
  outputFileTracingRoot: __dirname,
}

module.exports = nextConfig
