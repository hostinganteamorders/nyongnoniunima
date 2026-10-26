import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AUDITION_START } from '@/lib/validations/registration'

const mocks = vi.hoisted(() => ({
  local: vi.fn(),
  query: vi.fn(),
  db: vi.fn(),
  prepare: vi.fn(),
  run: vi.fn(),
  admin: vi.fn(),
  client: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
  upsert: vi.fn(),
  revalidate: vi.fn(),
}))

vi.mock('@/lib/db/local', () => ({
  isUsingLocalDb: mocks.local,
  localQuery: mocks.query,
  getLocalDb: mocks.db,
}))
vi.mock('@/lib/supabase/admin', () => ({ requireAdmin: mocks.admin, getAdminClient: mocks.client }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }))

import { getRegistrationRules, saveAuditionDate } from '@/server/actions/registration-rules'

let settings: Record<string, unknown>

beforeEach(() => {
  vi.resetAllMocks()
  settings = {}
  mocks.local.mockReturnValue(true)
  mocks.query.mockImplementation((_table, { where: { key } }) => key in settings ? [{ value: settings[key] }] : [])
  mocks.admin.mockResolvedValue({ user: { id: 'admin' } })
  mocks.db.mockReturnValue({ prepare: mocks.prepare })
  mocks.prepare.mockReturnValue({ run: mocks.run })
  mocks.run.mockImplementation((_id, key, value) => { settings[key] = value })
  mocks.client.mockReturnValue({ from: mocks.from })
  mocks.from.mockReturnValue({ select: mocks.select, upsert: mocks.upsert })
  mocks.select.mockReturnValue({ eq: mocks.eq })
  mocks.eq.mockImplementation((_column, key) => ({ maybeSingle: () => mocks.single(key) }))
  mocks.single.mockImplementation((key) => Promise.resolve({ data: key in settings ? { value: settings[key] } : null, error: null }))
  mocks.upsert.mockResolvedValue({ error: null })
})

describe.each([true, false])('getRegistrationRules (local=%s)', (local) => {
  beforeEach(() => { mocks.local.mockReturnValue(local) })

  it('defaults to the existing audition date when settings are absent', async () => {
    await expect(getRegistrationRules()).resolves.toEqual({ year: 2026, auditionStart: AUDITION_START })
    expect(mocks.admin).not.toHaveBeenCalled()
  })

  it.each([2027, '2027', '"2027"'])('reads numeric or JSON string year %s and returns only public rules', async (year) => {
    settings = { selection_year: year, audition_start_2027: JSON.stringify('2027-09-15') }
    await expect(getRegistrationRules()).resolves.toEqual({ year: 2027, auditionStart: '2027-09-15' })
    expect(mocks.admin).not.toHaveBeenCalled()
    if (!local) {
      expect(mocks.from).toHaveBeenCalledWith('settings')
      expect(mocks.select).toHaveBeenCalledWith('value')
      expect(mocks.eq.mock.calls).toEqual([['key', 'selection_year'], ['key', 'audition_start_2027']])
    }
  })

  it.each(['invalid', 'true', '1999', '2101', '2027.5', '{}', 'null', '""', '"2027.0"', '" 2027 "'])('falls back to the default year for invalid setting %s', async (year) => {
    settings.selection_year = year
    await expect(getRegistrationRules()).resolves.toEqual({ year: 2026, auditionStart: AUDITION_START })
  })

  it('honors an explicitly configured date in the default year', async () => {
    settings.audition_start_2026 = '2026-11-01'
    await expect(getRegistrationRules()).resolves.toEqual({ year: 2026, auditionStart: '2026-11-01' })
  })

  it('never reuses the default audition date in another year', async () => {
    settings.selection_year = '2027'
    await expect(getRegistrationRules()).rejects.toThrow('Atur tanggal audisi untuk tahun 2027')
  })

  it.each(['2027-02-29', '2028-10-26', '', 20271026])('fails closed for invalid or mismatched configured date %s', async (date) => {
    settings = { selection_year: '2027', audition_start_2027: date }
    await expect(getRegistrationRules()).rejects.toThrow('Atur tanggal audisi untuk tahun 2027')
  })

  it('does not hide invalid configuration behind the default date', async () => {
    settings.audition_start_2026 = '2026-02-30'
    await expect(getRegistrationRules()).rejects.toThrow('Atur tanggal audisi untuk tahun 2026')
  })
})

describe('saveAuditionDate', () => {
  it('authenticates before validating or accessing persistence', async () => {
    mocks.admin.mockRejectedValue(new Error('Unauthorized'))
    await expect(saveAuditionDate(1999, 'invalid')).rejects.toThrow('Unauthorized')
    expect(mocks.local).not.toHaveBeenCalled()
    expect(mocks.db).not.toHaveBeenCalled()
    expect(mocks.client).not.toHaveBeenCalled()
    expect(mocks.revalidate).not.toHaveBeenCalled()
  })

  it.each([1999, 2101, 2027.5, NaN, '2027' as unknown as number])('rejects invalid year %s without persisting', async (year) => {
    await expect(saveAuditionDate(year, '2027-10-26')).rejects.toThrow('Tahun seleksi tidak valid')
    expect(mocks.admin).toHaveBeenCalledOnce()
    expect(mocks.db).not.toHaveBeenCalled()
    expect(mocks.client).not.toHaveBeenCalled()
  })

  it.each(['2027-02-29', '2027-04-31', '2027-1-01', '2027-10-26T00:00:00Z', '', null as unknown as string])('rejects invalid date %s without persisting', async (date) => {
    await expect(saveAuditionDate(2027, date)).rejects.toThrow()
    expect(mocks.db).not.toHaveBeenCalled()
    expect(mocks.client).not.toHaveBeenCalled()
  })

  it('rejects dates belonging to another selection year', async () => {
    await expect(saveAuditionDate(2027, '2028-10-26')).rejects.toThrow('Tahun tanggal audisi harus sesuai tahun seleksi')
    expect(mocks.db).not.toHaveBeenCalled()
    expect(mocks.client).not.toHaveBeenCalled()
  })

  it('upserts a JSON date locally and makes it available to the public getter', async () => {
    settings.selection_year = '2027'
    await saveAuditionDate(2027, '2027-10-26')
    expect(mocks.prepare).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT(key) DO UPDATE'))
    expect(mocks.run).toHaveBeenCalledWith(expect.any(String), 'audition_start_2027', '"2027-10-26"')
    await expect(getRegistrationRules()).resolves.toEqual({ year: 2027, auditionStart: '2027-10-26' })
    await saveAuditionDate(2027, '2027-11-01')
    await expect(getRegistrationRules()).resolves.toEqual({ year: 2027, auditionStart: '2027-11-01' })
    expect(mocks.revalidate).toHaveBeenCalledWith('/register')
    expect(mocks.revalidate).toHaveBeenCalledWith('/admin/selection')
  })

  it.each([2000, 2100])('accepts supported boundary year %s', async (year) => {
    await expect(saveAuditionDate(year, `${year}-01-01`)).resolves.toBeUndefined()
  })

  it('upserts a JSON date with the admin Supabase client', async () => {
    mocks.local.mockReturnValue(false)
    await saveAuditionDate(2028, '2028-02-29')
    expect(mocks.admin).toHaveBeenCalledOnce()
    expect(mocks.from).toHaveBeenCalledWith('settings')
    expect(mocks.upsert).toHaveBeenCalledWith({
      key: 'audition_start_2028', value: '"2028-02-29"', updated_at: expect.any(String),
    }, { onConflict: 'key' })
    expect(mocks.db).not.toHaveBeenCalled()
    expect(mocks.revalidate).toHaveBeenCalledWith('/register')
  })

  it('propagates Supabase write failures without revalidation', async () => {
    mocks.local.mockReturnValue(false)
    mocks.upsert.mockResolvedValue({ error: { message: 'Write failed' } })
    await expect(saveAuditionDate(2027, '2027-10-26')).rejects.toThrow('Write failed')
    expect(mocks.revalidate).not.toHaveBeenCalled()
  })

  it('propagates settings read errors instead of silently using defaults', async () => {
    mocks.local.mockReturnValue(false)
    mocks.single.mockResolvedValue({ data: null, error: { message: 'Read failed' } })
    await expect(getRegistrationRules()).rejects.toThrow('Read failed')
  })
})
