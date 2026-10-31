'use server'

import { requireAdmin, getAdminClient } from '@/lib/supabase/admin'
import { createRegistrationSchema, type RegistrationInput } from '@/lib/validations/registration'
import { type SelectionStage } from '@/lib/selection'
import { getRegistrationRules } from '@/server/actions/registration-rules'
import { revalidatePath } from 'next/cache'
import { getLocalDb, isUsingLocalDb, localInsert, localQuery, localDelete } from '@/lib/db/local'
import { isRegistrationOpen } from '@/server/actions/unima'

interface ApplicantRecord {
  id: string
  full_name: string
  email: string | null
  phone: string
  date_of_birth: string | null
  address: string | null
  city: string | null
  province: string | null
  height_cm: number | null
  weight_kg: number | null
  occupation: string | null
  education: string | null
  photo_url: string | null
  instagram?: string | null
  status: string
  selection_year: number
  created_at: string
  updated_at: string
}

interface FinalistProfile {
  id: string
  created_at: string
  applicant_id: string
  instagram: string | null
  photo_url: string | null
  bio: string | null
  tahun: string
}

function insertApplicant(data: RegistrationInput, status: string, selection_year: number, requestId: string): Promise<{ data?: { id: string }; error?: string }>
function insertApplicant(data: RegistrationInput, status: string, selection_year: number): Promise<{ data?: ApplicantRecord; error?: string }>
async function insertApplicant(data: RegistrationInput, status: string, selection_year: number, requestId?: string): Promise<{ data?: ApplicantRecord | { id: string }; error?: string }> {
  try {
    const id = requestId ?? crypto.randomUUID()
    // Include omitted optional fields so an ID cannot be reused with a partial match.
    const payload = { ...data, ipk: data.ipk ?? null, instagram: data.instagram || null, tiktok: data.tiktok || null, facebook: data.facebook || null, selection_year }
    const matches = (record: Record<string, unknown>) => Object.entries(payload).every(([key, value]) => {
      const stored = record[key]
      if (key === 'consent') return stored === true || stored === 1
      if (value == null || value === '') return stored == null || stored === ''
      if (typeof value === 'number') return stored != null && stored !== '' && Number(stored) === value
      return stored === value
    })
    const reuseError = 'ID pengiriman sudah digunakan untuk data pendaftaran yang berbeda.'
    if (isUsingLocalDb()) {
      const db = getLocalDb()
      return db.transaction(() => {
        if (requestId) {
          const existing = db.prepare('SELECT * FROM applicants WHERE id = ?').get(id) as (ApplicantRecord & Record<string, unknown>) | undefined
          if (existing) return matches(existing) ? { data: existing } : { error: reuseError }
        }
        const announcement = db.prepare('SELECT published_at FROM selection_announcements WHERE year = ?').get(selection_year) as { published_at: string | null } | undefined
        if (announcement?.published_at) return { error: 'Seleksi tahun ini sudah dipublikasikan; pendaftaran ditutup' }
        const program = db.prepare('SELECT faculty_id, is_active FROM study_programs WHERE id = ?').get(data.study_program) as { faculty_id: string; is_active: number | boolean } | undefined
        if (!program) return { error: 'Program studi tidak ditemukan. Silakan pilih program studi yang tersedia.' }
        if (program.faculty_id !== data.faculty) return { error: 'Program studi tidak sesuai dengan fakultas yang dipilih.' }
        if (program.is_active !== true && program.is_active !== 1) return { error: 'Program studi tidak aktif. Silakan pilih program studi yang tersedia.' }
        return { data: localInsert<ApplicantRecord>('applicants', { ...payload, consent: Number(data.consent), user_id: null, status, id }) }
      }).immediate()
    }
    // The insert trigger checks publication under the same year lock as publish.
    const client = getAdminClient()
    const { data: program, error: programError } = await client.from('study_programs')
      .select('faculty_id,is_active').eq('id', data.study_program).maybeSingle()
    if (programError) throw programError
    const catalogError = !program ? 'Program studi tidak ditemukan. Silakan pilih program studi yang tersedia.'
      : program.faculty_id !== data.faculty ? 'Program studi tidak sesuai dengan fakultas yang dipilih.'
        : program.is_active !== true ? 'Program studi tidak aktif. Silakan pilih program studi yang tersedia.' : null
    if (catalogError) {
      // Catalog changes may acknowledge an exact committed replay, never create a new row.
      if (requestId) {
        const { data: existing, error: lookupError } = await client.from('applicants')
          .select(['id', ...Object.keys(payload)].join(',')).eq('id', id).maybeSingle<Record<string, unknown> & { id: string }>()
        if (lookupError) throw lookupError
        if (existing && existing.id === id && matches(existing)) return { data: { id } }
      }
      return { error: catalogError }
    }
    const { data: record, error } = await client.from('applicants')
      .insert({ ...payload, user_id: null, status, id }).select(requestId ? 'id' : '*').single()
    if (error) {
      if (!requestId) return { error: error.message }
      // Other unique constraints (such as email/NIM) are not idempotent success.
      if (requestId && error.code === '23505' && /unique constraint "applicants_pkey"/.test(error.message)) {
        const { data: existing, error: lookupError } = await client.from('applicants')
          .select(['id', ...Object.keys(payload)].join(',')).eq('id', id).maybeSingle<Record<string, unknown> & { id: string }>()
        if (lookupError) throw lookupError
        if (existing && existing.id === id && matches(existing)) return { data: { id } }
        return { error: reuseError }
      }
      throw error
    }
    if (!record) throw new Error('Missing insert response')
    return { data: record }
  } catch (error) {
    if (requestId) throw error
    return { error: error instanceof Error ? error.message : 'Gagal menyimpan pendaftaran' }
  }
}

export async function submitRegistration(formData: FormData): Promise<{ data?: { id: string }; error?: string }> {
  try {
    const token = formData.get('submission_id')
    if (token !== null && (typeof token !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token))) {
      return { error: 'ID pengiriman tidak valid. Muat ulang formulir pendaftaran.' }
    }
    const requestId = typeof token === 'string' ? token.toLowerCase() : crypto.randomUUID()
    if (!(await isRegistrationOpen())) {
      return { error: 'Pendaftaran sedang ditutup. Silakan tunggu pengumuman pembukaan pendaftaran resmi berikutnya.' }
    }

    const rawData = Object.fromEntries(formData.entries())
    const normalized = { ...rawData, consent: rawData.consent === 'true' }
    const rules = await getRegistrationRules()
    const parsed = createRegistrationSchema(rules.auditionStart).safeParse(normalized)

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      const messages = Object.entries(fieldErrors).map(([field, errors]) => `${field}: ${(errors as string[]).join(', ')}`)
      return { error: messages.join('; ') }
    }

    const result = await insertApplicant(parsed.data, 'pending', rules.year, requestId)
    if (result.error) return { error: result.error }
    if (!result.data) throw new Error('Missing insert response')
    return { data: { id: result.data.id } }
  } catch (error) {
    const reference = crypto.randomUUID()
    const metadata: Record<string, string> = { reference }
    if (error && typeof error === 'object') {
      for (const key of ['name', 'code', 'digest'] as const) {
        const value = (error as Record<string, unknown>)[key]
        if (typeof value === 'string' && /^[\w.-]{1,80}$/.test(value)) metadata[key] = value
      }
    }
    console.error('Registration error', metadata)
    return { error: `Pendaftaran belum dapat dikonfirmasi. Coba kirim ulang dengan ID pengiriman yang sama. Referensi: ${reference}` }
  }
}

export async function getApplicants() {
  await requireAdmin()

  let applicants: ApplicantRecord[]
  let entries: { applicant_id: string; year: number; stage: SelectionStage; semifinalist_at: string | null }[]
  let announcements: { year: number; published_at: string | null }[]
  let profiles: FinalistProfile[]
  if (isUsingLocalDb()) {
    applicants = localQuery<ApplicantRecord>('applicants', {
      orderBy: { column: 'created_at', direction: 'DESC' },
    })
    entries = localQuery('selection_entries')
    announcements = localQuery('selection_announcements')
    profiles = localQuery('finalist_profiles', { orderBy: { column: 'created_at', direction: 'DESC' } })
  } else {
    const client = getAdminClient()
    async function readAll<T>(table: string, columns: string, key: keyof T & string): Promise<T[]> {
      const rows: T[] = []
      let cursor: string | number | undefined
      while (true) {
        let query = client.from(table).select(columns).order(key, { ascending: true }).limit(500)
        if (cursor !== undefined) query = query.gt(key, cursor)
        const { data, error } = await query
        if (error) throw new Error(error.message)
        if (!data) throw new Error(`Missing ${table} response`)
        const page = data as unknown as T[]
        rows.push(...page)
        if (page.length < 500) return rows
        cursor = page[page.length - 1][key] as string | number
      }
    }
    ;[applicants, entries, announcements, profiles] = await Promise.all([
      readAll<typeof applicants[number]>('applicants', '*', 'id'),
      readAll<typeof entries[number]>('selection_entries', 'applicant_id, year, stage, semifinalist_at', 'applicant_id'),
      readAll<typeof announcements[number]>('selection_announcements', 'year, published_at', 'year'),
      readAll<FinalistProfile>('finalist_profiles', '*', 'id'),
    ])
    applicants.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || a.id.localeCompare(b.id))
    profiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || a.id.localeCompare(b.id))
  }
  const publishedYears = new Set(announcements.filter(n => n.published_at).map(n => n.year))
  const entryMap = new Map(entries.map(e => [e.applicant_id, e]))
  return applicants.map(a => {
    const entry = entryMap.get(a.id)
    const profile = profiles.find(p => p.applicant_id === a.id) ?? null
    const published = entry?.stage === 'finalist' && entry.year === a.selection_year && publishedYears.has(entry.year)
    return {
      ...a,
      // Compatibility for the existing admin profile editor, never persisted.
      status: published ? 'finalist' : a.status,
      stage: entry?.stage ?? null,
      selection_stage: entry?.stage ?? null,
      selection_published: publishedYears.has(a.selection_year),
      semifinalist_at: entry?.semifinalist_at ?? null,
      profile,
      bio: profile?.bio ?? null,
      instagram: profile?.instagram || a.instagram || null,
      photo_url: profile?.photo_url || a.photo_url || null,
      tahun: profile?.tahun || String(a.selection_year),
    }
  })
}

export async function updateApplicantStatus(
  id: string,
  status: 'pending' | 'verified' | 'rejected' | 'finalist'
) {
  await requireAdmin()
  if (!['pending', 'verified', 'rejected'].includes(status)) throw new Error('Status tidak valid; finalis hanya melalui publikasi seleksi')
  const updatedAt = new Date().toISOString()

  if (isUsingLocalDb()) {
    const db = getLocalDb()
    db.transaction(() => {
      const applicant = db.prepare('SELECT status, selection_year FROM applicants WHERE id = ?').get(id) as { status: string; selection_year: number } | undefined
      if (!applicant) throw new Error('Peserta tidak ditemukan')
      const announcement = db.prepare('SELECT published_at FROM selection_announcements WHERE year = ?').get(applicant.selection_year) as { published_at: string | null } | undefined
      if (announcement?.published_at) throw new Error('Seleksi tahun ini sudah dipublikasikan')
      if (applicant.status === 'finalist' || db.prepare('SELECT 1 FROM selection_entries WHERE applicant_id = ?').get(id)) throw new Error('Status peserta seleksi tidak dapat diubah melalui aksi ini')
      db.prepare('UPDATE applicants SET status = ?, updated_at = ? WHERE id = ?').run(status, updatedAt, id)
    }).immediate()
    revalidatePath('/admin/applicants')
    return
  }

  const { error } = await getAdminClient().rpc('mutate_selection', { p_operation: 'applicant_status', p_applicant_id: id, p_stage: status })

  if (error) throw new Error(error.message)
  revalidatePath('/admin/applicants')
}

export async function deleteApplicant(id: string) {
  await requireAdmin()

  if (isUsingLocalDb()) {
    const db = getLocalDb()
    db.transaction(() => {
      const published = db.prepare(`SELECT 1 FROM selection_entries e JOIN selection_announcements n ON n.year = e.year
        WHERE e.applicant_id = ? AND e.stage = 'finalist' AND n.published_at IS NOT NULL`).get(id)
      if (published) throw new Error('Finalis terpublikasi tidak dapat dihapus')
      localDelete('applicants', id)
    }).immediate()
    revalidatePath('/admin/applicants')
    return
  }

  const { error } = await getAdminClient().rpc('mutate_selection', { p_operation: 'delete', p_applicant_id: id })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/applicants')
}

export async function createApplicant(data: RegistrationInput & { status?: string }) {
  await requireAdmin()
  if (data.status !== undefined && !['pending', 'verified', 'rejected'].includes(data.status)) return { error: 'Status tidak valid; finalis hanya melalui publikasi seleksi' }
  let rules: Awaited<ReturnType<typeof getRegistrationRules>>
  try { rules = await getRegistrationRules() } catch (error) {
    return { error: error instanceof Error ? error.message : 'Pengaturan pendaftaran belum tersedia' }
  }
  const parsed = createRegistrationSchema(rules.auditionStart).safeParse(data)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    const messages = Object.entries(fieldErrors)
      .map(([field, errors]) => `${field}: ${(errors as string[]).join(', ')}`)
    return { error: messages.join('; ') }
  }

  const result = await insertApplicant(parsed.data, data.status || 'pending', rules.year)
  if (result.error) return result
  revalidatePath('/admin/applicants')
  revalidatePath('/admin/finalists')
  return result
}

export async function getApplicantStats() {
  const items = await getApplicants()
  return {
    total: items.length,
    pending: items.filter((a) => a.status === 'pending').length,
    verified: items.filter((a) => a.status === 'verified').length,
    rejected: items.filter((a) => a.status === 'rejected').length,
    finalist: items.filter((a) => a.status === 'finalist').length,
  }
}
