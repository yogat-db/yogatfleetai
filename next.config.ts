import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  // Explicitly set the Turbopack root to your project directory
  turbopack: {
    root: path.join(__dirname), // This points to /Users/omotayooyelade/yogat
  },

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'kcwxffjlndxaevmhmhrj.supabase.co', // your Supabase project
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Uncomment if you need to use unoptimized images in development
    // unoptimized: process.env.NODE_ENV === 'development',
  },

  // Other typical Next.js settings
  reactStrictMode: true,
  poweredByHeader: false,
}

export default nextConfig

