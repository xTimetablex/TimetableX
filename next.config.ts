import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['192.168.2.62', '192.168.0.114'],
};

export default nextConfig;
