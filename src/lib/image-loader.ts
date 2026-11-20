// Loader kustom next/image: tanpa Vercel Image Optimization (402 di plan ini).
// Foto lokal /images/**.jpg|png dialihkan ke salinan WebP di /img-opt/** (lihat public/img-opt).
// URL lain (Supabase, /uploads, logo, svg, dll.) dikembalikan apa adanya.
const RASTER = /\.(jpe?g|png)$/i

export function optimizedImageSrc(src: string): string {
  if (!src.startsWith('/images/')) return src
  const path = src.split('?')[0]
  if (!RASTER.test(path)) return src
  const file = path.slice(path.lastIndexOf('/') + 1).toLowerCase()
  if (file.startsWith('logo-') || file.startsWith('orders.')) return src
  return '/img-opt/' + path.slice('/images/'.length).replace(RASTER, '.webp')
}

export default function imageLoader({ src }: { src: string; width: number; quality?: number }) {
  return optimizedImageSrc(src)
}
