/** @type {import('next').NextConfig} */
const nextConfig = {
      typescript: {
              ignoreBuildErrors: true,
      },
      eslint: {
              ignoreDuringBuilds: true,
      },
      env: {
              NEXT_PUBLIC_PAPERCLIP_API: process.env.NEXT_PUBLIC_PAPERCLIP_API || 'https://alllinesauto.taile32c4c.ts.net',
              NEXT_PUBLIC_PAPERCLIP_KEY: process.env.NEXT_PUBLIC_PAPERCLIP_KEY || '',
              NEXT_PUBLIC_PAPERCLIP_COMPANY: process.env.NEXT_PUBLIC_PAPERCLIP_COMPANY || 'b18b9b76-bb39-42b8-8349-c323bffd5e3b',
      },
      async rewrites() {
              return []
      },
}

module.exports = nextConfig
