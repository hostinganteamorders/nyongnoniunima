export type SelectionStage = 'semifinalist' | 'finalist_draft' | 'finalist' | 'not_selected_faculty' | 'not_selected_university'

export interface SelectionApplicant {
  id: string
  full_name: string
  phone: string
  faculty: string | null
  study_program: string | null
  gender: string | null
  photo_url: string | null
  status: string
  selection_year: number
  stage: SelectionStage | null
  semifinalist_at: string | null
}

export interface SelectionAnnouncement {
  year: number
  title: string
  body: string
  published_at: string | null
  participants: Array<{ id: string; full_name: string; faculty: string; study_program: string; gender: string | null; photo_url: string | null }>
}

export interface SelectionAdminData {
  year: number
  activeYear: number
  years: number[]
  faculties: Array<{ id: string; name: string }>
  applicants: SelectionApplicant[]
  groups: Array<{ faculty_id: string; invite_url: string }>
  announcement: SelectionAnnouncement | null
}

export function validateSelectionYear(year: number): void {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error('Tahun seleksi tidak valid')
}

export function parseSelectionYear(value: unknown, fallback: number): number {
  if (typeof value === 'string') {
    try { value = JSON.parse(value) } catch { return fallback }
  }
  if (typeof value !== 'number' && typeof value !== 'string') return fallback
  if (typeof value === 'string' && !/^(20[0-9]{2}|2100)$/.test(value)) return fallback
  const year = Number(value)
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : fallback
}

export function normalizeIndonesianPhone(phone: string): string {
  if (typeof phone !== 'string' || !/^[+0-9 ()-]+$/.test(phone)) {
    throw new Error('Nomor WhatsApp Indonesia tidak valid')
  }
  const digits = phone.replace(/[ ()-]/g, '')
  if (!/^(?:08|628|\+628)[0-9]{8,11}$/.test(digits)) throw new Error('Nomor WhatsApp Indonesia tidak valid')
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits.replace(/^\+/, '')
}

export function isValidWhatsAppGroupUrl(url: string): boolean {
  return typeof url === 'string' && url === url.trim() && /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+(?:\?mode=[A-Za-z0-9_]+)?$/.test(url)
}

export function buildSemifinalistWhatsAppUrl({ name, phone, faculty, year, groupUrl }: {
  name: string; phone: string; faculty: string; year: number; groupUrl: string
}): string {
  validateSelectionYear(year)
  if (!isValidWhatsAppGroupUrl(groupUrl)) throw new Error('Tautan grup WhatsApp tidak valid')
  const normalized = normalizeIndonesianPhone(phone)
  const text = `Selamat ${name}!\n\nAnda dinyatakan lolos seleksi fakultas dan menjadi semifinalis seleksi universitas Nyong Noni UNIMA ${year} dari ${faculty}.\n\nSilakan bergabung ke grup WhatsApp resmi fakultas Anda:\n${groupUrl}\n\nInformasi jadwal dan persyaratan seleksi tingkat universitas akan disampaikan melalui grup tersebut. Mohon tidak menyebarkan tautan ini kepada pihak lain.\n\nSalam,\nPanitia Nyong Noni UNIMA ${year}`
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`
}

export function nextSelectionStage(status: string, current: SelectionStage | null, requested: SelectionStage | 'reset_finalist_draft'): SelectionStage {
  if (status === 'finalist' || current === 'finalist') throw new Error('Finalis terpublikasi tidak dapat diubah')
  if (requested === 'semifinalist' && current === null && status === 'verified') return 'semifinalist'
  if (requested === 'not_selected_faculty' && current === null && ['pending', 'verified'].includes(status)) return requested
  if (current === 'semifinalist' && status === 'verified' && ['finalist_draft', 'not_selected_university'].includes(requested)) return requested as SelectionStage
  if (requested === 'reset_finalist_draft' && current === 'finalist_draft' && status === 'verified') return 'semifinalist'
  throw new Error('Transisi tahap seleksi tidak valid; finalis hanya melalui publikasi')
}

// Whitelist snapshot fields even when reading historical JSON from storage.
export function selectionAnnouncement(row: { year: number; title: string; body: string; published_at: string | null; snapshot_json: string }): SelectionAnnouncement {
  const participants: SelectionAnnouncement['participants'] = row.published_at ? JSON.parse(row.snapshot_json) : []
  if (!Array.isArray(participants)) throw new Error('Snapshot pengumuman tidak valid')
  if (participants.some(p => !p || ['id', 'full_name', 'faculty', 'study_program'].some(k => typeof p[k as keyof typeof p] !== 'string')
    || (p.gender != null && typeof p.gender !== 'string') || (p.photo_url != null && typeof p.photo_url !== 'string'))) throw new Error('Snapshot peserta tidak valid')
  return {
    year: row.year, title: row.title, body: row.body, published_at: row.published_at,
    participants: participants.map(p => ({
      id: p.id, full_name: p.full_name, faculty: p.faculty, study_program: p.study_program,
      gender: p.gender ?? null, photo_url: p.photo_url ?? null,
    })),
  }
}
