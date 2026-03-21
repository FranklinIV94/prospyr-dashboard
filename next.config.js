/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_PAPERCLIP_API: process.env.PAPERCLIP_API_URL || 'https://paperclipapi.com',
    NEXT_PUBLIC_PAPERCLIP_KEY: process.env.PAPERCLIP_API_KEY || 'pcp_6720463d6b390b53e7c7dd28f1b3c64a618b24b899445e43',
    NEXT_PUBLIC_PAPERCLIP_COMPANY: process.env.PAPERCLIP_COMPANY_ID || 'b18b9b76-bb39-42b8-8349-c323bffd5e3b',
  },
}
module.exports = nextConfig
