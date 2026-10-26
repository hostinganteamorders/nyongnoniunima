import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AUDITION_START } from '@/lib/validations/registration'

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), getAdminClient: vi.fn(), isRegistrationOpen: vi.fn(), from: vi.fn(), rpc: vi.fn(), anonymousClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ requireAdmin: mocks.requireAdmin, getAdminClient: mocks.getAdminClient }))
vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: mocks.anonymousClient }))
vi.mock('@/lib/db/local', () => ({ isUsingLocalDb: () => false }))
vi.mock('@/server/actions/unima', () => ({ isRegistrationOpen: mocks.isRegistrationOpen }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

function query(result: { data?: unknown; error?: { message: string } | null }) {
  const builder: Record<string, any> = { then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: null, error: null, ...result }).then(resolve) }
  for (const method of ['select', 'insert', 'update', 'eq', 'in', 'or', 'not', 'order', 'single', 'maybeSingle']) builder[method] = vi.fn(() => builder)
  return builder
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.rpc.mockReset().mockResolvedValue({ error: null })
  mocks.requireAdmin.mockResolvedValue({})
  mocks.getAdminClient.mockReturnValue({ from: mocks.from, rpc: mocks.rpc })
  mocks.isRegistrationOpen.mockResolvedValue(true)
  mocks.anonymousClient.mockImplementation(() => { throw new Error('Anonymous DB access is forbidden in these actions') })
})

describe('remote finalist write errors', () => {
  it('saves applicant and profile through one locked transaction RPC', async () => {
    const { updateFinalistData } = await import('@/server/actions/finalists')
    const result = await updateFinalistData({ applicant_id: 'id', full_name: 'Updated Name', bio: 'Bio', tahun: '2026', status: 'finalist' } as never)
    expect(result.error).toBeUndefined()
    expect(mocks.rpc).toHaveBeenCalledWith('mutate_selection', {
      p_operation: 'finalist_data', p_applicant_id: 'id', p_data: { full_name: 'Updated Name', bio: 'Bio', tahun: '2026', photo_url: null },
    })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('propagates a transactional save failure without reporting success', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'profile save failed' } })
    const { updateFinalistData } = await import('@/server/actions/finalists')
    expect(await updateFinalistData({ applicant_id: 'id', full_name: 'Updated Name', tahun: '2026' })).toEqual({ error: 'profile save failed' })
    expect(mocks.rpc).toHaveBeenCalledTimes(1)
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('requires a publication preview and forwards it to the transaction', async () => {
    const { publishFinalists } = await import('@/server/actions/selection')
    await expect(publishFinalists(2026)).rejects.toThrow(/Muat ulang/)
    expect(mocks.rpc).not.toHaveBeenCalled()
    const expected = { candidateIds: ['id'], title: 'Title', body: 'Body' }
    await publishFinalists(2026, expected)
    expect(mocks.rpc).toHaveBeenCalledWith('mutate_selection', { p_operation: 'publish', p_year: 2026, p_expected_ids: ['id'], p_expected_title: 'Title', p_expected_body: 'Body' })
  })
})

describe('remote public reads and registration', () => {
  it('uses the service client and filters both list and detail through publication with a safe DTO', async () => {
    const rows = [
      { id: 'legacy', status: 'finalist', full_name: 'Legacy', selection_year: 2025, email: 'private', phone: 'private' },
      { id: 'published', status: 'verified', full_name: 'Published', selection_year: 2026, email: 'private' },
      { id: 'draft', status: 'verified', full_name: 'Draft', selection_year: 2026, email: 'private' },
    ]
    mocks.from.mockImplementation((table: string) => {
      if (table === 'selection_entries') return query({ data: [{ applicant_id: 'published', year: 2026, stage: 'finalist' }, { applicant_id: 'draft', year: 2026, stage: 'finalist_draft' }] })
      if (table === 'selection_announcements') return query({ data: [{ year: 2026, published_at: '2026-10-01' }] })
      if (table === 'applicants') return query({ data: rows })
      return query({ data: [] })
    })
    const { getPublicFinalists, getPublicFinalist } = await import('@/server/actions/finalists')
    const result = await getPublicFinalists()
    expect(result.map(a => a.id)).toEqual(['legacy', 'published'])
    expect(JSON.stringify(result)).not.toMatch(/private|email|phone|status/)
    expect(await getPublicFinalist('draft')).toBeNull()
    expect(await getPublicFinalist('unknown')).toBeNull()
    expect(await getPublicFinalist('')).toBeNull()
    expect(await getPublicFinalist('published')).toMatchObject({ id: 'published' })
    expect(mocks.anonymousClient).not.toHaveBeenCalled()
  })

  it('registers via service-role insert after validation/open gate, with pending status and active year', async () => {
    const record = query({ data: { id: 'registered' } })
    const settings = (value: unknown) => {
      mocks.from.mockImplementation((table: string) => {
        if (table !== 'settings') return record
        const builder = query({ data: null })
        builder.eq.mockImplementation((_column: string, key: string) => query({ data: key === 'selection_year' ? { value } : key === 'audition_start_2027' ? { value: '2027-10-26' } : null }))
        return builder
      })
    }
    settings(2027)
    const { submitRegistration } = await import('@/server/actions/applicants')
    const form = new FormData()
    const values = {
      full_name: 'John Doe', email: 'john@example.com', phone: '081234567890', date_of_birth: '2005-05-15',
      place_of_birth: 'Manado', gender: 'Laki-laki', nim: '20123456', faculty: 'ft', study_program: 'ft_ti', semester: '4', ipk: '3.5',
      address: 'Jl. Contoh No. 123, Kelurahan, Kecamatan', city: 'Manado', province: 'Sulawesi Utara', height_cm: '175', weight_kg: '60',
      occupation: 'Mahasiswa', education: 'Sarjana S1', foreign_language: 'English',
      essay: 'I want to join Nyong Noni UNIMA because I am passionate about culture and tourism promotion in North Sulawesi.', consent: 'true',
      status: 'finalist', selection_year: '2050',
    }
    for (const [key, value] of Object.entries(values)) form.set(key, value)
    expect(await submitRegistration(form)).toEqual({ data: { id: 'registered' } })
    expect(record.insert).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending', selection_year: 2027, user_id: null }))
    for (const value of ['2027', '"2027"']) {
      settings(value)
      await submitRegistration(form)
      expect(record.insert).toHaveBeenLastCalledWith(expect.objectContaining({ selection_year: 2027 }))
    }
    for (const value of [[2027], { year: 2027 }, true]) {
      settings(value)
      await submitRegistration(form)
      expect(record.insert).toHaveBeenLastCalledWith(expect.objectContaining({ selection_year: Number(AUDITION_START.slice(0, 4)) }))
    }
    mocks.from.mockImplementation((table: string) => table === 'settings' ? query({ data: null }) : record)
    await submitRegistration(form)
    expect(record.insert).toHaveBeenLastCalledWith(expect.objectContaining({ selection_year: Number(AUDITION_START.slice(0, 4)) }))
    mocks.getAdminClient.mockClear()
    mocks.isRegistrationOpen.mockResolvedValue(false)
    expect((await submitRegistration(form)).error).toMatch(/ditutup/)
    expect(mocks.getAdminClient).not.toHaveBeenCalled()
    mocks.isRegistrationOpen.mockResolvedValue(true)
    const inserts = record.insert.mock.calls.length
    expect((await submitRegistration(new FormData())).error).toBeDefined()
    expect(record.insert).toHaveBeenCalledTimes(inserts)
    expect(mocks.anonymousClient).not.toHaveBeenCalled()
  })

  it('propagates RPC failures instead of returning false success', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'RPC failure' } })
    const { updateApplicantStatus } = await import('@/server/actions/applicants')
    await expect(updateApplicantStatus('id', 'verified')).rejects.toThrow('RPC failure')
    expect(mocks.requireAdmin).toHaveBeenCalled()
    expect(mocks.rpc).toHaveBeenCalledWith('mutate_selection', { p_operation: 'applicant_status', p_applicant_id: 'id', p_stage: 'verified' })
  })

  it('merges published selection and profile data for admin loaders without changing the stored status', async () => {
    const rows = [{ id: 'published', status: 'verified', selection_year: 2026 }, { id: 'draft', status: 'verified', selection_year: 2026 }]
    mocks.from.mockImplementation((table: string) => {
      if (table === 'applicants') return query({ data: rows })
      if (table === 'selection_entries') return query({ data: [{ applicant_id: 'published', year: 2026, stage: 'finalist', semifinalist_at: '2026-10-01' }, { applicant_id: 'draft', year: 2026, stage: 'finalist_draft' }] })
      if (table === 'selection_announcements') return query({ data: [{ year: 2026, published_at: '2026-10-03' }] })
      if (table === 'finalist_profiles') return query({ data: [{ applicant_id: 'published', bio: 'Biography', instagram: '@name', photo_url: '/profile.png', tahun: '2026' }] })
      return query({ data: [] })
    })
    const { getApplicants, getApplicantStats } = await import('@/server/actions/applicants')
    const result = await getApplicants()
    expect(result[0]).toMatchObject({ status: 'finalist', selection_stage: 'finalist', bio: 'Biography', instagram: '@name', photo_url: '/profile.png', tahun: '2026' })
    expect(result[1]).toMatchObject({ status: 'verified', selection_stage: 'finalist_draft' })
    expect(rows[0].status).toBe('verified')
    expect(await getApplicantStats()).toEqual({ total: 2, pending: 0, verified: 1, rejected: 0, finalist: 1 })
    expect(mocks.requireAdmin).toHaveBeenCalledTimes(2)
    expect(mocks.anonymousClient).not.toHaveBeenCalled()
  })

  it('does not silently ignore dependent admin loader failures', async () => {
    mocks.from.mockImplementation((table: string) => query(table === 'selection_entries' ? { error: { message: 'selection lookup failed' } } : { data: [] }))
    const { getApplicants, getApplicantStats } = await import('@/server/actions/applicants')
    await expect(getApplicants()).rejects.toThrow('selection lookup failed')
    await expect(getApplicantStats()).rejects.toThrow('selection lookup failed')
  })
})
