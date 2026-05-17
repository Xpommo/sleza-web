/** @type {import('next').NextConfig} */
const nextConfig = {
  // Backend API URL — in production point this to your VPS
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
};
export default nextConfig;
