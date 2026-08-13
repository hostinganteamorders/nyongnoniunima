export const TITLE_PAIRS: [string, string][] = [
  ['Nyong UNIMA', 'Noni UNIMA'],
  ['Wakil 1 Nyong', 'Wakil 1 Noni'],
  ['Wakil 2 Nyong', 'Wakil 2 Noni'],
  ['Harapan 1 Nyong', 'Harapan 1 Noni'],
  ['Harapan 2 Nyong', 'Harapan 2 Noni'],
  ['Nyong Berbakat', 'Noni Berbakat'],
  ['Nyong Favorit', 'Noni Favorit'],
  ['Nyong Fotogenik', 'Noni Fotogenik'],
  ['Nyong Duta Lingkungan', 'Noni Duta Lingkungan'],
  ['Nyong Duta Sosial', 'Noni Duta Sosial'],
  ['Nyong Duta Budaya', 'Noni Duta Budaya'],
  ['Nyong Duta Bahasa', 'Noni Duta Bahasa'],
  ['Nyong Duta Seni', 'Noni Duta Seni'],
  ['Nyong Persahabatan', 'Noni Persahabatan'],
  ['Nyong Intelegensia', 'Noni Intelegensia'],
]

export const PAIR_LABELS: Record<string, string> = {
  'Nyong UNIMA': 'Nyong UNIMA',
  'Noni UNIMA': 'Noni UNIMA',
  'Wakil 1 Nyong': 'Wakil I Nyong Noni UNIMA 2025',
  'Wakil 1 Noni': 'Wakil I Nyong Noni UNIMA 2025',
  'Wakil 2 Nyong': 'Wakil II Nyong Noni UNIMA 2025',
  'Wakil 2 Noni': 'Wakil II Nyong Noni UNIMA 2025',
  'Harapan 1 Nyong': 'Harapan I Nyong Noni UNIMA 2025',
  'Harapan 1 Noni': 'Harapan I Nyong Noni UNIMA 2025',
  'Harapan 2 Nyong': 'Harapan II Nyong Noni UNIMA 2025',
  'Harapan 2 Noni': 'Harapan II Nyong Noni UNIMA 2025',
  'Nyong Berbakat': 'Berbakat Nyong Noni UNIMA 2025',
  'Noni Berbakat': 'Berbakat Nyong Noni UNIMA 2025',
  'Nyong Favorit': 'Favorit Nyong Noni UNIMA 2025',
  'Noni Favorit': 'Favorit Nyong Noni UNIMA 2025',
  'Nyong Fotogenik': 'Fotogenik Nyong Noni UNIMA 2025',
  'Noni Fotogenik': 'Fotogenik Nyong Noni UNIMA 2025',
  'Nyong Duta Lingkungan': 'Duta Lingkungan Nyong Noni UNIMA 2025',
  'Noni Duta Lingkungan': 'Duta Lingkungan Nyong Noni UNIMA 2025',
  'Nyong Duta Sosial': 'Duta Sosial Nyong Noni UNIMA 2025',
  'Noni Duta Sosial': 'Duta Sosial Nyong Noni UNIMA 2025',
  'Nyong Duta Budaya': 'Duta Budaya Nyong Noni UNIMA 2025',
  'Noni Duta Budaya': 'Duta Budaya Nyong Noni UNIMA 2025',
  'Nyong Duta Bahasa': 'Duta Bahasa Nyong Noni UNIMA 2025',
  'Noni Duta Bahasa': 'Duta Bahasa Nyong Noni UNIMA 2025',
  'Nyong Duta Seni': 'Duta Seni Nyong Noni UNIMA 2025',
  'Noni Duta Seni': 'Duta Seni Nyong Noni UNIMA 2025',
  'Nyong Persahabatan': 'Persahabatan Nyong Noni UNIMA 2025',
  'Noni Persahabatan': 'Persahabatan Nyong Noni UNIMA 2025',
  'Nyong Intelegensia': 'Intelegensia Nyong Noni UNIMA 2025',
  'Noni Intelegensia': 'Intelegensia Nyong Noni UNIMA 2025',
}

export const GENDER_TITLES = {
  nyong: ['Nyong UNIMA', 'Wakil 1 Nyong', 'Wakil 2 Nyong', 'Harapan 1 Nyong', 'Harapan 2 Nyong', 'Nyong Favorit'],
  noni: ['Noni UNIMA', 'Wakil 1 Noni', 'Wakil 2 Noni', 'Harapan 1 Noni', 'Harapan 2 Noni', 'Noni Favorit'],
} as const

export function isCombinedTitle(title: string) {
  return (
    title.includes('Duta') ||
    title.includes('Berbakat') ||
    title.includes('Fotogenik') ||
    title.includes('Persahabatan') ||
    title.includes('Intelegensia')
  )
}

export function genderBadge(title: string) {
  if (isCombinedTitle(title)) return 'Nyong Noni'
  return title.includes('Nyong') ? 'Nyong' : 'Noni'
}

export function shortGelar(title: string) {
  if (title.includes('Wakil 1')) return 'Wakil I'
  if (title.includes('Wakil 2')) return 'Wakil II'
  if (title.includes('Harapan 1')) return 'Harapan I'
  if (title.includes('Harapan 2')) return 'Harapan II'
  if (title.includes('Favorit')) return 'Favorit'
  return title
}

export function titleLabel(title: string) {
  const label = PAIR_LABELS[title]
  if (!label) return title
  if (isCombinedTitle(title)) return label
  return label.replace('Nyong Noni UNIMA', `${genderBadge(title)} UNIMA`)
}
