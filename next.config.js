/** @type {import('next').NextConfig} */
const nextConfig = {
  // Expose server-side env vars to client (prefixed with NEXT_PUBLIC_)
  env: {
    PAPERCLIP_API: process.env.PAPERCLIP_API || 'http://localhost:3100',
  },
  // Allow requests to any Paperclip API endpoint
  async rewrites() {
    return []
  },
}

module.exports = nextConfig
