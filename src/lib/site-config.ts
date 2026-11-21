export const SHOW_SCHEDULE_DATES = false

// Tahap yang sedang berlangsung di Pemilihan 2026 (1 = Audisi ... 6 = Grand Final).
// Ubah angka ini saat tahap berganti; tahap sebelumnya otomatis ditandai selesai.
export const CURRENT_TAHAP = 5

// Vote finalis: nominal per suara (Rupiah).
export const VOTE_PRICE_IDR = 2000

// Link resmi ORDERS (footer, intro, sponsor). Link lama ordersapp.tech otomatis diganti ke ini.
export const ORDERS_URL = 'https://www.teamorders2k25.com/'

export function resolveSponsorUrl(url?: string | null): string | null {
  if (!url) return null
  return /(^|\/\/|\.)ordersapp\.tech/i.test(url) ? ORDERS_URL : url
}
