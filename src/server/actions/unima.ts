'use server'

import { requireAdmin, getAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sponsorSchema, currentTitleholderSchema } from '@/lib/validations/registration'
import { revalidatePath } from 'next/cache'
import { isUsingLocalDb, localQuery, localInsert, localUpdate, localDelete } from '@/lib/db/local'

// ─── Faculties ───
export async function getFaculties() {
  if (isUsingLocalDb()) {
    return localQuery<any>('faculties', { orderBy: { column: 'name', direction: 'ASC' } }) || []
  }
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('faculties').select('*').order('name') as any
  return data || []
}

// ─── Study Programs ───
export async function getStudyPrograms(facultyId?: string) {
  if (isUsingLocalDb()) {
    let result = localQuery<any>('study_programs', { orderBy: { column: 'name', direction: 'ASC' } }) || []
    if (facultyId) result = result.filter((sp: any) => sp.faculty_id === facultyId)
    return result
  }
  const supabase = await createServerSupabaseClient()
  let query = supabase.from('study_programs').select('*').order('name')
  if (facultyId) query = query.eq('faculty_id', facultyId)
  const { data } = await query as any
  return data || []
}

// ─── Sponsors ───
export async function getSponsors() {
  if (isUsingLocalDb()) {
    return localQuery<any>('sponsors', { orderBy: { column: 'sort_order', direction: 'ASC' } }) || []
  }
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('sponsors').select('*').order('sort_order') as any
  return data || []
}

export async function createSponsor(data: { name: string; logo_url?: string; website?: string; type: string; sort_order?: number }) {
  await requireAdmin()
  const parsed = sponsorSchema.safeParse(data)
  if (!parsed.success) {
    return { error: Object.entries(parsed.error.flatten().fieldErrors).map(([f, e]) => `${f}: ${(e as string[]).join(', ')}`).join('; ') }
  }
  if (isUsingLocalDb()) {
    const record = localInsert('sponsors', { ...parsed.data, id: crypto.randomUUID() })
    revalidatePath('/admin/sponsors'); revalidatePath('/')
    return { data: record }
  }
  const adminClient = getAdminClient()
  const { data: result, error } = await adminClient.from('sponsors').insert(parsed.data).select().single()
  if (error) return { error: error.message }
  revalidatePath('/admin/sponsors'); revalidatePath('/')
  return { data: result }
}

export async function deleteSponsor(id: string) {
  await requireAdmin()
  if (isUsingLocalDb()) { localDelete('sponsors', id); revalidatePath('/admin/sponsors'); return }
  const adminClient = getAdminClient()
  await adminClient.from('sponsors').delete().eq('id', id)
  revalidatePath('/admin/sponsors')
}

// ─── Settings ───
export async function getSettings() {
  if (isUsingLocalDb()) {
    return localQuery<any>('settings', {}) || []
  }
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('settings').select('*') as any
  return data || []
}

export async function getSetting(key: string) {
  const all = await getSettings()
  const found = all.find((s: any) => s.key === key)
  try { return found ? JSON.parse(found.value) : null } catch { return found?.value || null }
}

export async function updateSetting(id: string, value: any) {
  await requireAdmin()
  const jsonValue = typeof value === 'string' ? value : JSON.stringify(value)
  if (isUsingLocalDb()) {
    localUpdate('settings', id, { value: jsonValue, updated_at: new Date().toISOString() })
    revalidatePath('/admin/settings'); return
  }
  const adminClient = getAdminClient()
  await adminClient.from('settings').update({ value: jsonValue, updated_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/admin/settings')
}

// ─── Current Titleholders ───
export async function getCurrentTitleholders() {
  if (isUsingLocalDb()) {
    return localQuery<any>('current_titleholders', { orderBy: { column: 'sort_order', direction: 'ASC' } }) || []
  }
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('current_titleholders').select('*').order('sort_order') as any
  return data || []
}

export async function createCurrentTitleholder(data: { title: string; name: string; faculty?: string; study_program?: string; photo_url?: string; instagram?: string; biography?: string; sort_order?: number }) {
  await requireAdmin()
  const parsed = currentTitleholderSchema.safeParse(data)
  if (!parsed.success) {
    return { error: Object.entries(parsed.error.flatten().fieldErrors).map(([f, e]) => `${f}: ${(e as string[]).join(', ')}`).join('; ') }
  }
  if (isUsingLocalDb()) {
    const record = localInsert('current_titleholders', { ...parsed.data, id: crypto.randomUUID() })
    revalidatePath('/admin/current-titleholders'); revalidatePath('/current-titleholders')
    return { data: record }
  }
  const adminClient = getAdminClient()
  const { data: result, error } = await adminClient.from('current_titleholders').insert(parsed.data).select().single()
  if (error) return { error: error.message }
  revalidatePath('/admin/current-titleholders'); revalidatePath('/current-titleholders')
  return { data: result }
}

export async function updateCurrentTitleholder(id: string, data: { title?: string; name?: string; faculty?: string; study_program?: string; photo_url?: string; instagram?: string; biography?: string; sort_order?: number }) {
  await requireAdmin()
  const parsed = currentTitleholderSchema.safeParse(data)
  if (!parsed.success) {
    return { error: Object.entries(parsed.error.flatten().fieldErrors).map(([f, e]) => `${f}: ${(e as string[]).join(', ')}`).join('; ') }
  }
  const updatedAt = new Date().toISOString()
  if (isUsingLocalDb()) {
    localUpdate('current_titleholders', id, { ...parsed.data, updated_at: updatedAt })
    revalidatePath('/admin/current-titleholders'); revalidatePath('/current-titleholders')
    return { data: parsed.data }
  }
  const adminClient = getAdminClient()
  const { data: result, error } = await adminClient.from('current_titleholders').update({ ...parsed.data, updated_at: updatedAt }).eq('id', id).select().single()
  if (error) return { error: error.message }
  revalidatePath('/admin/current-titleholders'); revalidatePath('/current-titleholders')
  return { data: result }
}

export async function deleteCurrentTitleholder(id: string) {
  await requireAdmin()
  if (isUsingLocalDb()) { localDelete('current_titleholders', id); revalidatePath('/admin/current-titleholders'); return }
  const adminClient = getAdminClient()
  await adminClient.from('current_titleholders').delete().eq('id', id)
  revalidatePath('/admin/current-titleholders')
}
