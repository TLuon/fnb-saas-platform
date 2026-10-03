/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@fnb/utils'],
  // Keep production builds from replacing files used by a running dev server.
  distDir: process.env.NODE_ENV === 'production' ? '.next-build' : '.next',
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'bufferutil': 'bufferutil',
        'utf-8-validate': 'utf-8-validate',
      });
    }
    return config;
  },
};

module.exports = nextConfig;
