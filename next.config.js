/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    PAPERCLIP_API_URL: process.env.PAPERCLIP_API_URL || 'http://localhost:3100',
    PAPERCLIP_COMPANY_ID: process.env.PAPERCLIP_COMPANY_ID || 'b18b9b76-bb39-42b8-8349-c323bffd5e3b',
    PAPERCLIP_API_KEY: process.env.PAPERCLIP_API_KEY || '',
  },
}
module.exports = nextConfig
