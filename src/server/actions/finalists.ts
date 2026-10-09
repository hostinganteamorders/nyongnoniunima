'use server'

import { requireAdmin, getAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { hallOfFameSchema, alumniAchievementSchema, finalistUpdateSchema, titleholderSchema } from '@/lib/validations/registration'
import { revalidatePath } from 'next/cache'
import { isUsingLocalDb, localQuery, localInsert, localUpdate, localDelete } from '@/lib/db/local'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

const TITLEHOLDER_CATEGORY_ORDER: Record<string, number> = {
  'Juara Utama': 1,
  'Wakil I': 2,
  'Wakil II': 3,
  'Harapan I': 4,
  'Harapan II': 5,
  'Berbakat': 10,
  'Favorit': 11,
  'Persahabatan': 12,
  'Digital': 13,
  'Intelegensia': 14,
  'Other': 99,
}

function sortTitleholders<T extends { tahun: number; category: string; nyong_name?: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.tahun !== b.tahun) return b.tahun - a.tahun
    const byCategory = (TITLEHOLDER_CATEGORY_ORDER[a.category] || 99) - (TITLEHOLDER_CATEGORY_ORDER[b.category] || 99)
    if (byCategory !== 0) return byCategory
    const aNyong = a.nyong_name ? 1 : 0
    const bNyong = b.nyong_name ? 1 : 0
    if (aNyong !== bNyong) return bNyong - aNyong
    return 0
  })
}

// Map applicants' faculty/study_program UUID ids to readable names (public pages render them as display text)
async function resolveFacultyNames<T extends { faculty?: string | null; study_program?: string | null }>(rows: T[]): Promise<T[]> {
  if (rows.length === 0) return rows
  try {
    let faculties: { id: string; name: string }[] = []
    let programs: { id: string; name: string }[] = []
    if (isUsingLocalDb()) {
      faculties = localQuery<{ id: string; name: string }>('faculties', {}) || []
      programs = localQuery<{ id: string; name: string }>('study_programs', {}) || []
    } else {
      const supabase = await createServerSupabaseClient()
      const [f, p] = await Promise.all([
        supabase.from('faculties').select('id, name'),
        supabase.from('study_programs').select('id, name'),
      ]) as [{ data: { id: string; name: string }[] | null }, { data: { id: string; name: string }[] | null }]
      faculties = f.data || []
      programs = p.data || []
    }
    const fmap = new Map(faculties.map((x) => [x.id, x.name]))
    const pmap = new Map(programs.map((x) => [x.id, x.name]))
    return rows.map((r) => ({
      ...r,
      faculty: r.faculty ? fmap.get(r.faculty) ?? r.faculty : r.faculty,
      study_program: r.study_program ? pmap.get(r.study_program) ?? r.study_program : r.study_program,
    }))
  } catch {
    return rows
  }
}

// Public: get all finalists with profile info
export async function getPublicFinalists() {
  if (isUsingLocalDb()) {
    const applicants = localQuery<any>('applicants', {
      where: { status: 'finalist' },
      orderBy: { column: 'created_at', direction: 'DESC' },
    }) || []
    const profiles: any[] = localQuery<any>('finalist_profiles', {}) || []

    const rows = applicants.map((a: any) => {
      const profile = profiles.find((p: any) => p.applicant_id === a.id)
      return {
        ...a,
        instagram: profile?.instagram || null,
        photo_url: profile?.photo_url || a.photo_url || null,
        bio: profile?.bio || null,
        umur: a.date_of_birth ? calculateAge(a.date_of_birth) : null,
      }
    })
    return resolveFacultyNames(rows)
  }

  const supabase = await createServerSupabaseClient()
  const { data: applicants } = await supabase
    .from('applicants')
    .select('*')
    .eq('status', 'finalist')
    .order('created_at', { ascending: false }) as any

  const ids = (applicants || []).map((a: any) => a.id)
  const { data: profiles } = ids.length > 0
    ? await supabase.from('finalist_profiles').select('*').in('applicant_id', ids) as any
    : { data: [] }

  return resolveFacultyNames(
    (applicants || []).map((a: any) => ({
      ...a,
      profile: (profiles || []).find((p: any) => p.applicant_id === a.id) || null,
      umur: a.date_of_birth ? calculateAge(a.date_of_birth) : null,
    })),
  )
}

// Public: get single finalist
export async function getPublicFinalist(id: string) {
  if (isUsingLocalDb()) {
    const applicants = localQuery<any>('applicants', { where: { id } }) || []
    if (!applicants.length) return null
    const a = applicants[0]
    const profiles = localQuery<any>('finalist_profiles', { where: { applicant_id: id } }) || []
    const profile = profiles[0] || null
    const [row] = await resolveFacultyNames([{ ...a, umur: a.date_of_birth ? calculateAge(a.date_of_birth) : null, photo_url: profile?.photo_url || a.photo_url || null, profile }])
    return row || null
  }

  const supabase = await createServerSupabaseClient()
  const { data: applicant } = await supabase.from('applicants').select('*').eq('id', id).single() as any
  if (!applicant) return null

  const { data: profile } = await supabase.from('finalist_profiles').select('*').eq('applicant_id', id).single() as any
  const [row] = await resolveFacultyNames([{ ...applicant, umur: calculateAge(applicant.date_of_birth), photo_url: profile?.photo_url || applicant.photo_url || null, profile: profile || null }])
  return row || null
}

// Public: hall of fame
export async function getHallOfFame() {
  if (isUsingLocalDb()) {
    return localQuery<any>('hall_of_fame', { orderBy: { column: 'tahun', direction: 'DESC' } }) || []
  }

  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('hall_of_fame').select('*').order('tahun', { ascending: false }) as any
  return data || []
}

// Public: alumni achievements
export async function getAlumniAchievements() {
  if (isUsingLocalDb()) {
    return localQuery<any>('alumni_achievements', { orderBy: { column: 'tahun', direction: 'DESC' } }) || []
  }
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('alumni_achievements').select('*').order('tahun', { ascending: false }) as any
  return data || []
}

export async function getTitleholders(tahun?: number) {
  if (isUsingLocalDb()) {
    const data = localQuery<any>('titleholders', { orderBy: { column: 'tahun', direction: 'DESC' } }) || []
    const filtered = tahun ? data.filter((item: any) => item.tahun === tahun) : data
    return sortTitleholders(filtered)
  }

  const supabase = await createServerSupabaseClient()
  let query = supabase.from('titleholders').select('*').order('tahun', { ascending: false }).order('sort_order', { ascending: true })
  if (tahun) query = query.eq('tahun', tahun)
  const { data } = await query as any
  return sortTitleholders(data || [])
}

export async function getReigningPair() {
  const currentYear = new Date().getFullYear()
  const currentYearPairs = await getTitleholders(currentYear)
  if (currentYearPairs.length > 0) {
    return currentYearPairs.find((item: any) => item.category === 'Juara Utama') || currentYearPairs[0]
  }

  const latestPairs = await getTitleholders()
  return latestPairs.find((item: any) => item.category === 'Juara Utama') || latestPairs[0] || null
}

// Admin: update finalist data (applicant + profile)
export async function updateFinalistData(data: {
  applicant_id: string
  full_name?: string
  email?: string
  phone?: string
  date_of_birth?: string
  address?: string
  city?: string
  province?: string
  height_cm?: number
  weight_kg?: number
  occupation?: string
  education?: string
  instagram?: string
  photo_url?: string
  bio?: string
  tahun: string
}) {
  await requireAdmin()
  const parsed = finalistUpdateSchema.safeParse(data)
  if (!parsed.success) {
    return { error: Object.entries(parsed.error.flatten().fieldErrors).map(([f, e]) => `${f}: ${(e as string[]).join(', ')}`).join('; ') }
  }

  const { applicant_id, instagram, photo_url, bio, tahun, ...applicantData } = parsed.data

  if (isUsingLocalDb()) {
    if (Object.keys(applicantData).length > 0) {
      localUpdate('applicants', applicant_id, { ...applicantData, updated_at: new Date().toISOString() })
    }
    const existing = localQuery<any>('finalist_profiles', { where: { applicant_id } })
    if (existing.length > 0) {
      localUpdate('finalist_profiles', existing[0].id, { instagram, photo_url, bio, tahun, updated_at: new Date().toISOString() })
    } else {
      localInsert('finalist_profiles', { applicant_id, instagram, photo_url, bio, tahun, id: crypto.randomUUID() })
    }
    revalidatePath('/admin/finalists')
    revalidatePath('/finalists')
    revalidatePath('/admin/applicants')
    return { data: parsed.data }
  }

  const adminClient = getAdminClient()
  if (Object.keys(applicantData).length > 0) {
    await adminClient.from('applicants').update({ ...applicantData, updated_at: new Date().toISOString() }).eq('id', applicant_id)
  }
  const existing = await adminClient.from('finalist_profiles').select('id').eq('applicant_id', applicant_id).single()
  if (existing.data) {
    await adminClient.from('finalist_profiles').update({ instagram, photo_url, bio, tahun, updated_at: new Date().toISOString() }).eq('applicant_id', applicant_id)
  } else {
    await adminClient.from('finalist_profiles').insert({ applicant_id, instagram, photo_url, bio, tahun })
  }
  revalidatePath('/admin/finalists')
  revalidatePath('/finalists')
  revalidatePath('/admin/applicants')
  return { data: parsed.data }
}

// Admin: upload finalist photo (PNG only)
export async function uploadFinalistPhoto(formData: FormData) {
  await requireAdmin()
  const file = formData.get('file') as File | null
  if (!file) return { error: 'File tidak ditemukan' }

  if (file.type !== 'image/png') return { error: 'Hanya file PNG yang diizinkan' }

  if (isUsingLocalDb()) {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'finalists')
    await mkdir(uploadDir, { recursive: true })
    const filename = `${crypto.randomUUID()}.png`
    await writeFile(path.join(uploadDir, filename), buffer)
    return { url: `/uploads/finalists/${filename}` }
  }

  const adminClient = getAdminClient()
  const filename = `${crypto.randomUUID()}.png`
  const { data, error } = await adminClient.storage
    .from('finalists')
    .upload(filename, file, { contentType: 'image/png' })
  if (error) return { error: error.message }
  const { data: { publicUrl } } = adminClient.storage.from('finalists').getPublicUrl(filename)
  return { url: publicUrl }
}

const TITLEHOLDER_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

export async function uploadTitleholderPhoto(formData: FormData) {
  await requireAdmin()
  const file = formData.get('file') as File | null
  if (!file) return { error: 'File tidak ditemukan' }
  const ext = TITLEHOLDER_IMAGE_TYPES[file.type]
  if (!ext) return { error: 'Hanya gambar JPG, PNG, WebP, atau AVIF yang diizinkan' }

  if (isUsingLocalDb()) {
    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'titleholders')
    await mkdir(uploadDir, { recursive: true })
    const filename = `${crypto.randomUUID()}.${ext}`
    await writeFile(path.join(uploadDir, filename), buffer)
    return { url: `/uploads/titleholders/${filename}` }
  }

  const adminClient = getAdminClient()
  const filename = `${crypto.randomUUID()}.${ext}`
  const { error } = await adminClient.storage
    .from('titleholders')
    .upload(filename, file, { contentType: file.type })
  if (error) return { error: error.message }
  const { data: { publicUrl } } = adminClient.storage.from('titleholders').getPublicUrl(filename)
  return { url: publicUrl }
}

// Admin: hall of fame CRUD
export async function createHallOfFame(data: { tahun: number; nyong_name: string; noni_name: string; nyong_photo_url?: string; noni_photo_url?: string; kabupaten_kota: string }) {
  await requireAdmin()
  const parsed = hallOfFameSchema.safeParse(data)
  if (!parsed.success) {
    return { error: Object.entries(parsed.error.flatten().fieldErrors).map(([f, e]) => `${f}: ${(e as string[]).join(', ')}`).join('; ') }
  }

  if (isUsingLocalDb()) {
    const record = localInsert('hall_of_fame', { ...parsed.data, id: crypto.randomUUID() })
    revalidatePath('/hall-of-fame')
    revalidatePath('/admin/hall-of-fame')
    return { data: record }
  }

  const adminClient = getAdminClient()
  const { data: result, error } = await adminClient.from('hall_of_fame').insert(parsed.data).select().single()
  if (error) return { error: error.message }
  revalidatePath('/hall-of-fame')
  revalidatePath('/admin/hall-of-fame')
  return { data: result }
}

export async function deleteHallOfFame(id: string) {
  await requireAdmin()
  if (isUsingLocalDb()) { localDelete('hall_of_fame', id); revalidatePath('/admin/hall-of-fame'); return }
  const adminClient = getAdminClient()
  await adminClient.from('hall_of_fame').delete().eq('id', id)
  revalidatePath('/admin/hall-of-fame')
}

// Admin: alumni achievement CRUD
export async function createAlumniAchievement(data: { alumni_name: string; achievement_type: string; description: string; tahun: string; photo_url?: string; instagram?: string }) {
  await requireAdmin()
  const parsed = alumniAchievementSchema.safeParse(data)
  if (!parsed.success) {
    return { error: Object.entries(parsed.error.flatten().fieldErrors).map(([f, e]) => `${f}: ${(e as string[]).join(', ')}`).join('; ') }
  }

  if (isUsingLocalDb()) {
    const record = localInsert('alumni_achievements', { ...parsed.data, id: crypto.randomUUID() })
    revalidatePath('/alumni-achievements')
    revalidatePath('/admin/alumni-achievements')
    return { data: record }
  }

  const adminClient = getAdminClient()
  const { data: result, error } = await adminClient.from('alumni_achievements').insert(parsed.data).select().single()
  if (error) return { error: error.message }
  revalidatePath('/alumni-achievements')
  revalidatePath('/admin/alumni-achievements')
  return { data: result }
}

export async function deleteAlumniAchievement(id: string) {
  await requireAdmin()
  if (isUsingLocalDb()) { localDelete('alumni_achievements', id); revalidatePath('/admin/alumni-achievements'); return }
  const adminClient = getAdminClient()
  await adminClient.from('alumni_achievements').delete().eq('id', id)
  revalidatePath('/admin/alumni-achievements')
}

async function titleholderSideConflict(
  data: { tahun: number; category: string; nyong_name: string; noni_name: string },
  excludeId?: string,
): Promise<string | null> {
  const rows: { id: string; tahun: number; category: string; nyong_name: string; noni_name: string }[] = []

  if (isUsingLocalDb()) {
    rows.push(...localQuery<any>('titleholders') || [])
  } else {
    const adminClient = getAdminClient()
    const { data: existing, error } = await adminClient
      .from('titleholders')
      .select('id, tahun, category, nyong_name, noni_name')
      .eq('tahun', data.tahun)
      .eq('category', data.category)
    if (error) return null
    rows.push(...(existing || []))
  }

  const others = rows.filter(
    (r) => r.id !== excludeId && r.tahun === data.tahun && r.category === data.category,
  )
  if (data.nyong_name && others.some((r) => r.nyong_name)) {
    return `Nyong untuk kategori ${data.category} ${data.tahun} sudah ada — silakan edit baris yang tersedia`
  }
  if (data.noni_name && others.some((r) => r.noni_name)) {
    return `Noni untuk kategori ${data.category} ${data.tahun} sudah ada — silakan edit baris yang tersedia`
  }
  return null
}

export async function createTitleholder(data: Record<string, unknown>) {
  await requireAdmin()
  const parsed = titleholderSchema.safeParse({
    ...data,
    sort_order: TITLEHOLDER_CATEGORY_ORDER[data.category as string] || 99,
  })

  if (!parsed.success) {
    return { error: Object.entries(parsed.error.flatten().fieldErrors).map(([field, errors]) => `${field}: ${(errors as string[]).join(', ')}`).join('; ') }
  }

  const conflict = await titleholderSideConflict(parsed.data)
  if (conflict) return { error: conflict }

  if (isUsingLocalDb()) {
    const record = localInsert('titleholders', { ...parsed.data, id: crypto.randomUUID() })
    revalidatePath('/titleholders')
    revalidatePath('/admin/titleholders')
    revalidatePath('/')
    return { data: record }
  }

  const adminClient = getAdminClient()
  const { data: result, error } = await adminClient.from('titleholders').insert(parsed.data).select().single()
  if (error) return { error: error.message }
  revalidatePath('/titleholders')
  revalidatePath('/admin/titleholders')
  revalidatePath('/')
  return { data: result }
}

async function effectiveSortOrder(id: string, data: { category: string; sort_order: number }): Promise<number> {
  try {
    if (isUsingLocalDb()) {
      const existing = (localQuery<any>('titleholders', { where: { id } }) || []).find((row) => row.id === id)
      if (existing && existing.category === data.category && typeof existing.sort_order === 'number') return existing.sort_order
    } else {
      const adminClient = getAdminClient()
      const { data: existing } = await adminClient.from('titleholders').select('category, sort_order').eq('id', id).maybeSingle()
      if (existing && existing.category === data.category && typeof existing.sort_order === 'number') return existing.sort_order
    }
  } catch {
    // pertahankan sort_order hasil kategori bila gagal membaca baris lama
  }
  return data.sort_order
}

export async function updateTitleholder(id: string, data: Record<string, unknown>) {
  await requireAdmin()
  const parsed = titleholderSchema.safeParse({
    ...data,
    sort_order: TITLEHOLDER_CATEGORY_ORDER[data.category as string] || 99,
  })

  if (!parsed.success) {
    return { error: Object.entries(parsed.error.flatten().fieldErrors).map(([field, errors]) => `${field}: ${(errors as string[]).join(', ')}`).join('; ') }
  }

  const conflict = await titleholderSideConflict(parsed.data, id)
  if (conflict) return { error: conflict }

  const sort_order = await effectiveSortOrder(id, parsed.data)
  const writeData = { ...parsed.data, sort_order }
  const updatedAt = new Date().toISOString()

  if (isUsingLocalDb()) {
    localUpdate('titleholders', id, { ...writeData, updated_at: updatedAt })
    revalidatePath('/titleholders')
    revalidatePath('/admin/titleholders')
    revalidatePath('/')
    return { data: writeData }
  }

  const adminClient = getAdminClient()
  const { data: result, error } = await adminClient
    .from('titleholders')
    .update({ ...writeData, updated_at: updatedAt })
    .eq('id', id)
    .select()
    .single()
  if (error) return { error: error.message }
  revalidatePath('/titleholders')
  revalidatePath('/admin/titleholders')
  revalidatePath('/')
  return { data: result }
}

export async function deleteTitleholder(id: string) {
  await requireAdmin()

  if (isUsingLocalDb()) {
    localDelete('titleholders', id)
    revalidatePath('/titleholders')
    revalidatePath('/admin/titleholders')
    revalidatePath('/')
    return
  }

  const adminClient = getAdminClient()
  await adminClient.from('titleholders').delete().eq('id', id)
  revalidatePath('/titleholders')
  revalidatePath('/admin/titleholders')
  revalidatePath('/')
}
