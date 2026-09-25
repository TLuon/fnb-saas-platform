/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@fnb/utils'],
  // Keep production builds from replacing files used by a running dev server.
  distDir: process.env.NODE_ENV === 'production' ? '.next-build' : '.next',
};

module.exports = nextConfig;
