import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // No output: 'export'
  images: {
    unoptimized: true, // optional, if you need images in the mobile view
  },
};

export default nextConfig;