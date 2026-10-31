import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUDITION_START, registrationSchema } from '@/lib/validations/registration'

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), getAdminClient: vi.fn(), isRegistrationOpen: vi.fn(), from: vi.fn(), rpc: vi.fn(), anonymousClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ requireAdmin: mocks.requireAdmin, getAdminClient: mocks.getAdminClient }))
vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: mocks.anonymousClient }))
vi.mock('@/lib/db/local', () => ({ isUsingLocalDb: () => false }))
vi.mock('@/server/actions/unima', () => ({ isRegistrationOpen: mocks.isRegistrationOpen }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

function query(result: { data?: unknown; error?: { message: string; code?: string } | null }) {
  const builder: Record<string, any> = { then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: null, error: null, ...result }).then(resolve) }
  for (const method of ['select', 'insert', 'update', 'eq', 'gt', 'limit', 'in', 'or', 'not', 'order', 'single', 'maybeSingle']) builder[method] = vi.fn(() => builder)
  return builder
}

const VALID_REGISTRATION = {
  full_name: 'John Doe', email: 'john@example.com', phone: '081234567890', date_of_birth: '2004-05-15',
  place_of_birth: 'Manado', gender: 'Laki-laki', nim: '20123456', faculty: 'ft', study_program: 'ft_ti', semester: '4', ipk: '3.5',
  address: 'Jl. Contoh No. 123, Kelurahan, Kecamatan', city: 'Manado', province: 'Sulawesi Utara', height_cm: '175', weight_kg: '60',
  occupation: 'Mahasiswa', education: 'Sarjana S1', foreign_language: 'English',
  essay: 'I want to join Nyong Noni UNIMA because I am passionate about culture and tourism promotion in North Sulawesi.', consent: 'true',
}
const PRIMARY_KEY_CONFLICT = { code: '23505', message: 'duplicate key value violates unique constraint "applicants_pkey"' }
const ACTIVE_PROGRAM = { faculty_id: 'ft', is_active: true }

function registrationForm() {
  const form = new FormData()
  for (const [key, value] of Object.entries(VALID_REGISTRATION)) form.set(key, value)
  form.set('submission_id', crypto.randomUUID())
  return form
}

function mockReplay(form: FormData, overrides: Record<string, unknown> = {}, program: typeof ACTIVE_PROGRAM | null = ACTIVE_PROGRAM) {
  const normalized = registrationSchema.parse({ ...Object.fromEntries(form.entries()), consent: true })
  const existing = {
    ...normalized, ipk: normalized.ipk ?? null, instagram: normalized.instagram || null, tiktok: normalized.tiktok || null,
    facebook: normalized.facebook || null, id: form.get('submission_id'), selection_year: 2026, ...overrides,
  }
  const insert = query({ error: PRIMARY_KEY_CONFLICT })
  const lookup = query({ data: existing })
  let calls = 0
  mocks.from.mockImplementation((table: string) => {
    if (table === 'settings') return query({ data: null })
    if (table === 'study_programs') return query({ data: program })
    if (program?.is_active && program.faculty_id === VALID_REGISTRATION.faculty && ++calls === 1) return insert
    return lookup
  })
  return { insert, lookup, existing }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.rpc.mockReset().mockResolvedValue({ error: null })
  mocks.requireAdmin.mockResolvedValue({})
  mocks.getAdminClient.mockReturnValue({ from: mocks.from, rpc: mocks.rpc })
  mocks.isRegistrationOpen.mockResolvedValue(true)
  mocks.anonymousClient.mockImplementation(() => { throw new Error('Anonymous DB access is forbidden in these actions') })
})

afterEach(() => vi.restoreAllMocks())

describe('remote manual semifinalist creation', () => {
  const validInput = { full_name: 'John Doe', phone: '081234567890', faculty: 'ft', gender: 'Laki-laki', selection_year: 2026 }

  it.each([validInput, {}])('requires admin before validation or accessing either client for %j', async input => {
    const { createManualSemifinalist } = await import('@/server/actions/selection')
    const { revalidatePath } = await import('next/cache')
    const error = new Error('Unauthorized')
    mocks.requireAdmin.mockRejectedValueOnce(error)

    await expect(createManualSemifinalist(input as never)).rejects.toBe(error)
    expect(mocks.requireAdmin).toHaveBeenCalledOnce()
    expect(mocks.getAdminClient).not.toHaveBeenCalled()
    expect(mocks.anonymousClient).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it.each([
    { full_name: undefined },
    { full_name: null },
    { full_name: '  ab  ' },
    { full_name: 'a'.repeat(201) },
    { phone: undefined },
    { phone: null },
    { phone: '' },
    { phone: 'not a phone' },
    { phone: '+12025550123' },
    { phone: '0'.repeat(31) },
    { faculty: undefined },
    { faculty: null },
    { faculty: '' },
    { gender: undefined },
    { gender: null },
    { gender: 'Other' },
    { selection_year: undefined },
    { selection_year: null },
    { selection_year: '2026' },
    { selection_year: 2026.5 },
    { selection_year: 1999 },
    { selection_year: 2101 },
    { status: 'finalist' },
    { study_program: 'ft_ti' },
    { unexpected: true },
  ])('rejects invalid or extra fields before client access: %j', async overrides => {
    const { createManualSemifinalist } = await import('@/server/actions/selection')
    const { revalidatePath } = await import('next/cache')

    await expect(createManualSemifinalist({ ...validInput, ...overrides } as never)).rejects.toMatchObject({ name: 'ZodError' })
    expect(mocks.requireAdmin).toHaveBeenCalledOnce()
    expect(mocks.getAdminClient).not.toHaveBeenCalled()
    expect(mocks.anonymousClient).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it.each(['Laki-laki', 'Perempuan'])('creates %s through exactly one RPC with only validated fields and no direct table writes', async gender => {
    const { createManualSemifinalist } = await import('@/server/actions/selection')

    await expect(createManualSemifinalist({ ...validInput, full_name: '  John Doe  ', phone: '  081234567890  ', gender })).resolves.toBeUndefined()
    expect(mocks.requireAdmin).toHaveBeenCalledOnce()
    expect(mocks.getAdminClient).toHaveBeenCalledOnce()
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('create_manual_semifinalist', {
      p_full_name: 'John Doe', p_phone: '081234567890', p_faculty: 'ft', p_gender: gender, p_year: 2026,
    })
    expect(mocks.requireAdmin.mock.invocationCallOrder[0]).toBeLessThan(mocks.getAdminClient.mock.invocationCallOrder[0])
    expect(mocks.getAdminClient.mock.invocationCallOrder[0]).toBeLessThan(mocks.rpc.mock.invocationCallOrder[0])
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.anonymousClient).not.toHaveBeenCalled()
  })

  it('propagates an RPC error without falling back to table writes or invalidating caches', async () => {
    const { createManualSemifinalist } = await import('@/server/actions/selection')
    const { revalidatePath } = await import('next/cache')
    mocks.rpc.mockResolvedValueOnce({ error: { message: 'Manual semifinalist transaction failed' } })

    await expect(createManualSemifinalist(validInput)).rejects.toThrow('Manual semifinalist transaction failed')
    expect(mocks.requireAdmin).toHaveBeenCalledOnce()
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('create_manual_semifinalist', {
      p_full_name: 'John Doe', p_phone: '081234567890', p_faculty: 'ft', p_gender: 'Laki-laki', p_year: 2026,
    })
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.anonymousClient).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })
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
    const record = query({ data: { id: 'registered', email: 'private@example.com', nim: 'private', selection_year: 2027 } })
    const settings = (value: unknown) => {
      mocks.from.mockImplementation((table: string) => {
        if (table === 'study_programs') return query({ data: ACTIVE_PROGRAM })
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
    expect(record.select).toHaveBeenCalledWith('id')
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
    mocks.from.mockImplementation((table: string) => table === 'settings' ? query({ data: null })
      : table === 'study_programs' ? query({ data: ACTIVE_PROGRAM }) : record)
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
    const rows = [{ id: 'published', status: 'verified', selection_year: 2026, created_at: '2026-10-02' }, { id: 'draft', status: 'verified', selection_year: 2026, created_at: '2026-10-01' }]
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

describe('remote public registration idempotency', () => {
  it.each([
    null,
    { faculty_id: 'ft', is_active: false },
    { faculty_id: 'fip', is_active: true },
  ])('acknowledges an exact historical replay for invalid catalog entry %j without inserting', async program => {
    const form = registrationForm()
    const { insert, lookup } = mockReplay(form, {}, program)
    const { submitRegistration } = await import('@/server/actions/applicants')
    expect(await submitRegistration(form)).toEqual({ data: { id: form.get('submission_id') } })
    expect(insert.insert).not.toHaveBeenCalled()
    expect(lookup.insert).not.toHaveBeenCalled()
    expect(lookup.eq).toHaveBeenCalledExactlyOnceWith('id', form.get('submission_id'))
    expect(lookup.select).toHaveBeenCalledWith(expect.stringContaining('selection_year'))
    expect(lookup.select).not.toHaveBeenCalledWith('*')
  })

  it.each([...Object.keys(VALID_REGISTRATION), 'instagram', 'tiktok', 'facebook', 'selection_year', 'id'])('rejects an archived replay with mismatched %s without inserting', async key => {
    const form = registrationForm()
    const value = key === 'consent' ? false : key === 'selection_year' ? 2025 : 'different'
    const { insert, lookup } = mockReplay(form, { [key]: value }, { faculty_id: 'ft', is_active: false })
    const { submitRegistration } = await import('@/server/actions/applicants')
    const result = await submitRegistration(form)
    expect(result.data).toBeUndefined()
    expect(result.error).toMatch(/tidak aktif/)
    expect(insert.insert).not.toHaveBeenCalled()
    expect(lookup.insert).not.toHaveBeenCalled()
    expect(lookup.update).not.toHaveBeenCalled()
  })

  it('does not acknowledge an archived replay when the existing-row lookup fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const form = registrationForm()
    const { lookup } = mockReplay(form, {}, { faculty_id: 'ft', is_active: false })
    lookup.maybeSingle.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'private lookup error' } })
    const { submitRegistration } = await import('@/server/actions/applicants')
    const result = await submitRegistration(form)
    expect(result.data).toBeUndefined()
    expect(result.error).toMatch(/belum dapat dikonfirmasi/)
    expect(result.error).not.toContain('private')
    expect(log).toHaveBeenCalledOnce()
    expect(lookup.insert).not.toHaveBeenCalled()
  })

  it('accepts only an exact ID/year/payload match and returns no stored private fields', async () => {
    const form = registrationForm()
    const { insert, lookup } = mockReplay(form, { semester: '4', height_cm: '175.00', weight_kg: '60.0', ipk: '3.50', consent: true })
    const { submitRegistration } = await import('@/server/actions/applicants')
    expect(await submitRegistration(form)).toEqual({ data: { id: form.get('submission_id') } })
    expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({ id: form.get('submission_id') }))
    expect(lookup.eq).toHaveBeenCalledExactlyOnceWith('id', form.get('submission_id'))
    expect(lookup.select).toHaveBeenCalledWith(expect.stringContaining('selection_year'))
    expect(lookup.select).not.toHaveBeenCalledWith('*')
  })

  it.each([...Object.keys(VALID_REGISTRATION), 'instagram', 'tiktok', 'facebook', 'selection_year', 'id'])('rejects a conflict with mismatched %s without any update', async key => {
    const form = registrationForm()
    const value = key === 'consent' ? false : key === 'selection_year' ? 2025 : 'different'
    const { insert, lookup } = mockReplay(form, { [key]: value })
    const { submitRegistration } = await import('@/server/actions/applicants')
    const result = await submitRegistration(form)
    expect(result.data).toBeUndefined()
    expect(result.error).toMatch(/ID pengiriman sudah digunakan/)
    expect(insert.insert).toHaveBeenCalledTimes(1)
    expect(lookup.insert).not.toHaveBeenCalled()
    expect(lookup.update).not.toHaveBeenCalled()
  })

  it('accepts blank and omitted optional values against stored nulls for semester two', async () => {
    const form = registrationForm()
    form.set('semester', '2')
    form.delete('ipk')
    form.set('instagram', '')
    mockReplay(form, { consent: 1, ipk: null, instagram: null, tiktok: '', facebook: null })
    const { submitRegistration } = await import('@/server/actions/applicants')
    expect(await submitRegistration(form)).toEqual({ data: { id: form.get('submission_id') } })
  })

  it.each([
    { code: '23505', message: 'duplicate key value violates unique constraint "applicants_email_key"' },
    { code: '23505', message: 'duplicate key value violates unique constraint "applicants_nim_key"' },
    { code: '23505', message: 'duplicate key with no known constraint' },
    { code: 'XX000', message: PRIMARY_KEY_CONFLICT.message },
  ])('does not treat non-primary-key insert errors as a replay: %j', async error => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const insert = query({ error })
    mocks.from.mockImplementation((table: string) => table === 'settings' ? query({ data: null })
      : table === 'study_programs' ? query({ data: ACTIVE_PROGRAM }) : insert)
    const { submitRegistration } = await import('@/server/actions/applicants')
    const result = await submitRegistration(registrationForm())
    expect(result.data).toBeUndefined()
    expect(result.error).toMatch(/belum dapat dikonfirmasi/)
    expect(insert.eq).not.toHaveBeenCalled()
    expect(mocks.from.mock.calls.filter(([table]) => table === 'applicants')).toHaveLength(1)
    expect(log).toHaveBeenCalledOnce()
  })

  it('never reports success for a missing conflict row', async () => {
    const form = registrationForm()
    const { lookup } = mockReplay(form)
    lookup.maybeSingle.mockResolvedValue({ data: null, error: null })
    const { submitRegistration } = await import('@/server/actions/applicants')
    expect((await submitRegistration(form)).error).toMatch(/ID pengiriman sudah digunakan/)
  })

  it('controls lookup failures without disclosing database details', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const form = registrationForm()
    const { lookup } = mockReplay(form)
    lookup.maybeSingle.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'private@example.com lookup failure' } })
    const { submitRegistration } = await import('@/server/actions/applicants')
    const result = await submitRegistration(form)
    expect(result.error).toMatch(/belum dapat dikonfirmasi/)
    expect(result.error).not.toContain('private@example.com')
  })

  it('recovers on manual same-ID retry when an insert committed but its response threw', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const form = registrationForm()
    const first = query({})
    const duplicate = query({ error: PRIMARY_KEY_CONFLICT })
    let committed: Record<string, unknown>
    first.insert.mockImplementation((payload: Record<string, unknown>) => { committed = payload; return first })
    first.single.mockRejectedValueOnce(new TypeError('connection lost after commit'))
    let calls = 0
    mocks.from.mockImplementation((table: string) => {
      if (table === 'settings') return query({ data: null })
      if (table === 'study_programs') return query({ data: ACTIVE_PROGRAM })
      calls++
      return calls === 1 ? first : calls === 2 ? duplicate : query({ data: committed })
    })
    const { submitRegistration } = await import('@/server/actions/applicants')
    expect((await submitRegistration(form)).error).toMatch(/belum dapat dikonfirmasi/)
    expect(calls).toBe(1)
    expect(await submitRegistration(form)).toEqual({ data: { id: form.get('submission_id') } })
    expect(calls).toBe(3)
    expect(first.insert).toHaveBeenCalledOnce()
    expect(duplicate.insert).toHaveBeenCalledOnce()
  })

  it('preserves the full applicant record and cache invalidation for admin creation', async () => {
    const { revalidatePath } = await import('next/cache')
    const row = { ...registrationSchema.parse({ ...VALID_REGISTRATION, consent: true }), id: crypto.randomUUID(), selection_year: 2026, status: 'pending' }
    const insert = query({ data: row })
    mocks.from.mockImplementation((table: string) => table === 'settings' ? query({ data: null })
      : table === 'study_programs' ? query({ data: ACTIVE_PROGRAM }) : insert)
    const { createApplicant } = await import('@/server/actions/applicants')
    expect(await createApplicant(row)).toEqual({ data: row })
    expect(insert.select).toHaveBeenCalledWith('*')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/applicants')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/finalists')
  })
})

describe.each(['public', 'admin'])('remote %s catalog validation', source => {
  it.each([
    { program: null, message: /tidak ditemukan/ },
    { program: { faculty_id: 'ft', is_active: false }, message: /tidak aktif/ },
    { program: { faculty_id: 'ft' }, message: /tidak aktif/ },
    { program: { faculty_id: 'fip', is_active: true }, message: /tidak sesuai.*fakultas/ },
  ])('rejects $program without inserting', async ({ program, message }) => {
    const catalog = query({ data: program })
    const applicants = query({ data: null })
    mocks.from.mockImplementation((table: string) => table === 'settings' ? query({ data: null }) : table === 'study_programs' ? catalog : applicants)
    const { createApplicant, submitRegistration } = await import('@/server/actions/applicants')
    const result = source === 'admin'
      ? await createApplicant(registrationSchema.parse({ ...VALID_REGISTRATION, consent: true }))
      : await submitRegistration(registrationForm())
    expect(result.data).toBeUndefined()
    expect(result.error).toMatch(message)
    expect(catalog.select).toHaveBeenCalledExactlyOnceWith('faculty_id,is_active')
    expect(catalog.eq).toHaveBeenCalledExactlyOnceWith('id', VALID_REGISTRATION.study_program)
    expect(catalog.maybeSingle).toHaveBeenCalledOnce()
    expect(applicants.insert).not.toHaveBeenCalled()
    if (source === 'admin') expect(mocks.from.mock.calls.filter(([table]) => table === 'applicants')).toHaveLength(0)
  })

  it('propagates catalog read errors without attempting an insert or replay', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.from.mockImplementation((table: string) => query(table === 'settings' ? { data: null }
      : { error: { code: 'XX000', message: 'private catalog error' } }))
    const { createApplicant, submitRegistration } = await import('@/server/actions/applicants')
    const result = source === 'admin'
      ? await createApplicant(registrationSchema.parse({ ...VALID_REGISTRATION, consent: true }))
      : await submitRegistration(registrationForm())
    expect(result.data).toBeUndefined()
    expect(result.error).toBeTruthy()
    expect(mocks.from.mock.calls.filter(([table]) => table === 'applicants')).toHaveLength(0)
  })
})
