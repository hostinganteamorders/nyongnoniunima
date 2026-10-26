'use server'

import { revalidatePath } from 'next/cache'
import { getLocalDb, isUsingLocalDb, localQuery } from '@/lib/db/local'
import { parseSelectionYear, validateSelectionYear } from '@/lib/selection'
import { getAdminClient, requireAdmin } from '@/lib/supabase/admin'
import { AUDITION_START, auditionDateSchema } from '@/lib/validations/registration'

async function readSetting(key: string): Promise<unknown> {
  if (isUsingLocalDb()) {
    return localQuery<{ value: string }>('settings', { where: { key } })[0]?.value
  }
  const { data, error } = await getAdminClient().from('settings').select('value').eq('key', key).maybeSingle()
  if (error) throw new Error(error.message)
  return data?.value
}

export async function getRegistrationRules(): Promise<{ year: number; auditionStart: string }> {
  const defaultYear = Number(AUDITION_START.slice(0, 4))
  const year = parseSelectionYear(await readSetting('selection_year'), defaultYear)
  let configuredDate = await readSetting(`audition_start_${year}`)
  if (typeof configuredDate === 'string') {
    try { configuredDate = JSON.parse(configuredDate) } catch { /* Also accept a plain date string. */ }
  }
  const auditionStart = configuredDate == null && year === defaultYear ? AUDITION_START : configuredDate
  const result = auditionDateSchema.safeParse(auditionStart)
  if (!result.success || Number(result.data.slice(0, 4)) !== year) {
    throw new Error(`Atur tanggal audisi untuk tahun ${year} sebelum membuka pendaftaran`)
  }
  return { year, auditionStart: result.data }
}

export async function saveAuditionDate(year: number, date: string): Promise<void> {
  await requireAdmin()
  validateSelectionYear(year)
  const auditionStart = auditionDateSchema.parse(date)
  if (Number(auditionStart.slice(0, 4)) !== year) throw new Error('Tahun tanggal audisi harus sesuai tahun seleksi')

  const key = `audition_start_${year}`
  const value = JSON.stringify(auditionStart)
  if (isUsingLocalDb()) {
    getLocalDb().prepare(`INSERT INTO settings (id, key, value) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`).run(crypto.randomUUID(), key, value)
  } else {
    const { error } = await getAdminClient().from('settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) throw new Error(error.message)
  }
  revalidatePath('/register')
  revalidatePath('/admin/selection')
}
