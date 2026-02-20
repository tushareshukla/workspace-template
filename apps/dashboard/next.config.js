/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@workspace/types'],
  output: 'standalone',
}

module.exports = nextConfig
