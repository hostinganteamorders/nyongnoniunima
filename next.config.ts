import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // Vercel Image Optimization mengembalikan 402 (OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED)
    // di plan ini — nonaktifkan agar gambar disajikan mentah dari /images.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  serverExternalPackages: ['better-sqlite3'],
  outputFileTracingIncludes: {
    '/*': ['./data/**/*'],
  },
}

export default nextConfig
