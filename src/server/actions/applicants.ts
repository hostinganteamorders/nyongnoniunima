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
  email: string
  phone: string
  date_of_birth: string
  address: string
  city: string
  province: string
  height_cm: number
  weight_kg: number
  occupation: string
  education: string
  photo_url: string | null
  instagram?: string | null
  status: string
  selection_year: number
  created_at: string
  updated_at: string
}

interface FinalistProfile {
  applicant_id: string
  instagram: string | null
  photo_url: string | null
  bio: string | null
  tahun: string
}

async function insertApplicant(data: RegistrationInput, status: string, selection_year: number): Promise<{ data?: ApplicantRecord; error?: string }> {
  try {
    if (isUsingLocalDb()) {
      const db = getLocalDb()
      const record = db.transaction(() => {
        const announcement = db.prepare('SELECT published_at FROM selection_announcements WHERE year = ?').get(selection_year) as { published_at: string | null } | undefined
        if (announcement?.published_at) throw new Error('Seleksi tahun ini sudah dipublikasikan; pendaftaran ditutup')
        return localInsert<ApplicantRecord>('applicants', { ...data, consent: Number(data.consent), user_id: null, status, selection_year, id: crypto.randomUUID() })
      }).immediate()
      return { data: record }
    }
    // The insert trigger checks publication under the same year lock as publish.
    const { data: record, error } = await getAdminClient().from('applicants')
      .insert({ ...data, user_id: null, status, selection_year }).select().single()
    if (error) return { error: error.message }
    return { data: record }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Gagal menyimpan pendaftaran' }
  }
}

export async function submitRegistration(formData: FormData) {
  if (!(await isRegistrationOpen())) {
    return { error: 'Pendaftaran sedang ditutup. Silakan tunggu pengumuman pembukaan pendaftaran resmi berikutnya.' }
  }

  const rawData = Object.fromEntries(formData.entries())
  const normalized = { ...rawData, consent: rawData.consent === 'true' }
  let rules: Awaited<ReturnType<typeof getRegistrationRules>>
  try { rules = await getRegistrationRules() } catch (error) {
    return { error: error instanceof Error ? error.message : 'Pengaturan pendaftaran belum tersedia' }
  }
  const parsed = createRegistrationSchema(rules.auditionStart).safeParse(normalized)

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    const messages = Object.entries(fieldErrors).map(([field, errors]) => `${field}: ${(errors as string[]).join(', ')}`)
    return { error: messages.join('; ') }
  }

  const result = await insertApplicant(parsed.data, 'pending', rules.year)
  if (result.error) return result
  revalidatePath('/register')
  return result
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
    const results = await Promise.all([
      client.from('applicants').select('*').order('created_at', { ascending: false }),
      client.from('selection_entries').select('applicant_id, year, stage, semifinalist_at'),
      client.from('selection_announcements').select('year, published_at').not('published_at', 'is', null),
      client.from('finalist_profiles').select('*').order('created_at', { ascending: false }),
    ])
    for (const result of results) if (result.error) throw new Error(result.error.message)
    ;[applicants, entries, announcements, profiles] = results.map(r => r.data || []) as [typeof applicants, typeof entries, typeof announcements, typeof profiles]
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
