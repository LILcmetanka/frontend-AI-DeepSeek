import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Standalone-сборка: образ несёт только нужные файлы и next-server.
  output: 'standalone',
};

export default nextConfig;
