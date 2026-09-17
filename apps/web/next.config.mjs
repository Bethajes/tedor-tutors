/** @type {import('next').NextConfig} */
const API_TARGET = process.env.API_UPSTREAM ?? 'http://localhost:4000';

const nextConfig = {
  transpilePackages: ['@tedor/ui', '@tedor/api-client', '@tedor/validation', '@tedor/types'],
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${API_TARGET}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;