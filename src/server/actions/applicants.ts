'use server'

import { requireAdmin } from '@/lib/supabase/admin'
import { registrationSchema, type RegistrationInput } from '@/lib/validations/registration'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { isUsingLocalDb, localInsert, localQuery, localUpdate, localDelete } from '@/lib/db/local'

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
  status: string
  created_at: string
  updated_at: string
}

export async function submitRegistration(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries())
  const normalized = { ...rawData, consent: rawData.consent === 'true' }
  const parsed = registrationSchema.safeParse(normalized)

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    const messages = Object.entries(fieldErrors).map(([field, errors]) => `${field}: ${(errors as string[]).join(', ')}`)
    return { error: messages.join('; ') }
  }

  if (isUsingLocalDb()) {
    const data = localInsert<ApplicantRecord>('applicants', {
      ...parsed.data,
      user_id: null,
      status: 'pending',
      id: crypto.randomUUID(),
    })
    revalidatePath('/register')
    return { data }
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('applicants')
    .insert({ ...parsed.data, user_id: user?.id ?? null, status: 'pending' })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/register')
  return { data }
}

export async function getApplicants() {
  await requireAdmin()

  if (isUsingLocalDb()) {
    return localQuery<ApplicantRecord>('applicants', {
      orderBy: { column: 'created_at', direction: 'DESC' },
    })
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('applicants')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function updateApplicantStatus(
  id: string,
  status: 'pending' | 'verified' | 'rejected' | 'finalist'
) {
  const updatedAt = new Date().toISOString()

  if (isUsingLocalDb()) {
    localUpdate('applicants', id, { status, updated_at: updatedAt })
    revalidatePath('/admin/applicants')
    return
  }

  const { getAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = getAdminClient()
  const { error } = await adminClient
    .from('applicants')
    .update({ status, updated_at: updatedAt })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/applicants')
}

export async function deleteApplicant(id: string) {
  await requireAdmin()

  if (isUsingLocalDb()) {
    localDelete('applicants', id)
    revalidatePath('/admin/applicants')
    return
  }

  const { getAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = getAdminClient()
  const { error } = await adminClient.from('applicants').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/applicants')
}

export async function createApplicant(data: RegistrationInput & { status?: string }) {
  await requireAdmin()
  const parsed = registrationSchema.safeParse(data)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    const messages = Object.entries(fieldErrors)
      .map(([field, errors]) => `${field}: ${(errors as string[]).join(', ')}`)
    return { error: messages.join('; ') }
  }

  if (isUsingLocalDb()) {
    const record = localInsert<ApplicantRecord>('applicants', {
      ...parsed.data,
      user_id: null,
      status: data.status || 'pending',
      id: crypto.randomUUID(),
    })
    revalidatePath('/admin/applicants')
    revalidatePath('/admin/finalists')
    return { data: record }
  }

  const { getAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = getAdminClient()
  const { data: result, error } = await adminClient
    .from('applicants')
    .insert({ ...parsed.data, user_id: null, status: data.status || 'pending' })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/admin/applicants')
  revalidatePath('/admin/finalists')
  return { data: result }
}

export async function getApplicantStats() {
  await requireAdmin()

  if (isUsingLocalDb()) {
    const applicants = localQuery<{ status: string }>('applicants', {})
    return {
      total: applicants.length,
      pending: applicants.filter((a) => a.status === 'pending').length,
      verified: applicants.filter((a) => a.status === 'verified').length,
      rejected: applicants.filter((a) => a.status === 'rejected').length,
      finalist: applicants.filter((a) => a.status === 'finalist').length,
    }
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.from('applicants').select('status')
  if (error) throw new Error(error.message)

  const items = data as Array<{ status: string }> | null
  return {
    total: items?.length ?? 0,
    pending: items?.filter((a) => a.status === 'pending').length ?? 0,
    verified: items?.filter((a) => a.status === 'verified').length ?? 0,
    rejected: items?.filter((a) => a.status === 'rejected').length ?? 0,
    finalist: items?.filter((a) => a.status === 'finalist').length ?? 0,
  }
}
