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
  experimental: {
    // Unggah foto (mode lokal / fallback server action) butuh body > 1MB default.
    // Di Vercel ada batas keras 4.5MB — unggah besar memakai signed URL langsung
    // ke Supabase Storage (lihat src/lib/uploads.ts), jadi tidak melewati fungsi ini.
    serverActions: { bodySizeLimit: '10mb' },
    middlewareClientMaxBodySize: '10mb',
  },
}

export default nextConfig
