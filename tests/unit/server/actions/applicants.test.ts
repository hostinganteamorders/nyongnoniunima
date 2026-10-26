import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { RegistrationInput } from '@/lib/validations/registration'

const mockLocalInsert = vi.fn((table: string, data: any) => ({ ...data, id: 'mock-id' })) as any
const mockLocalQuery = vi.fn(() => []) as any
const mockLocalDelete = vi.fn(() => true) as any
const mockIsRegistrationOpen = vi.fn(() => true) as any
const mockRequireAdmin = vi.fn(async () => ({ user: { id: 'admin-1' }, supabase: null }))
const mockRun = vi.fn(() => ({ changes: 1 }))
const mockPrepare = vi.fn((sql: string) => ({
  get: vi.fn(() => sql.startsWith('SELECT status') ? { status: 'pending', selection_year: 2026 } : undefined),
  run: mockRun,
}))
const mockDb = { prepare: mockPrepare, transaction: vi.fn((fn: () => void) => ({ immediate: fn })) }

vi.mock('@/lib/db/local', () => ({
  isUsingLocalDb: () => true,
  localInsert: mockLocalInsert,
  localQuery: mockLocalQuery,
  getLocalDb: () => mockDb,
  localDelete: mockLocalDelete,
}))

vi.mock('@/server/actions/unima', () => ({
  isRegistrationOpen: mockIsRegistrationOpen,
}))

vi.mock('@/lib/supabase/admin', () => ({
  requireAdmin: mockRequireAdmin,
  getAdminClient: vi.fn(() => ({})),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const VALID_APPLICANT: RegistrationInput = {
  full_name: 'John Doe',
  email: 'john@example.com',
  phone: '081234567890',
  date_of_birth: '2004-05-15',
  place_of_birth: 'Manado',
  gender: 'Laki-laki',
  nim: '20123456',
  faculty: 'fip',
  study_program: 'fip_pgsd',
  semester: 4,
  ipk: 3.5,
  address: 'Jl. Contoh No. 123, Kelurahan, Kecamatan',
  city: 'Manado',
  province: 'Sulawesi Utara',
  height_cm: 175,
  weight_kg: 60,
  occupation: 'Mahasiswa',
  education: 'Sarjana S1',
  foreign_language: 'English',
  essay: 'I want to join Nyong Noni UNIMA because I am passionate about culture and tourism promotion in North Sulawesi.',
  consent: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockLocalQuery.mockReset().mockReturnValue([])
  mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' }, supabase: null })
  mockIsRegistrationOpen.mockReturnValue(true)
})

describe('createApplicant', () => {
  it('validates correct data successfully', async () => {
    const { createApplicant } = await import('@/server/actions/applicants')
    const result = await createApplicant(VALID_APPLICANT)
    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
  })

  it('returns error for missing required fields', async () => {
    const { createApplicant } = await import('@/server/actions/applicants')
    const result = await createApplicant({
      full_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      place_of_birth: '',
      gender: undefined as any,
      nim: '',
      faculty: '',
      study_program: '',
      semester: undefined as any,
      address: '',
      city: '',
      province: '',
      height_cm: 0 as any,
      weight_kg: 0 as any,
      occupation: '',
      education: '',
      foreign_language: '',
      essay: '',
      consent: undefined as any,
    })
    expect(result.error).toBeDefined()
    expect(typeof result.error).toBe('string')
    expect(result.error!.length).toBeGreaterThan(0)
  })

  it('returns error for invalid email', async () => {
    const { createApplicant } = await import('@/server/actions/applicants')
    const result = await createApplicant({ ...VALID_APPLICANT, email: 'not-an-email' })
    expect(result.error).toBeDefined()
    expect(result.error).toContain('email')
  })

  it('returns error for height below minimum', async () => {
    const { createApplicant } = await import('@/server/actions/applicants')
    const result = await createApplicant({ ...VALID_APPLICANT, height_cm: 100 })
    expect(result.error).toBeDefined()
    expect(result.error).toContain('Tinggi')
  })

  it('rejects direct finalist creation without writing', async () => {
    const { createApplicant } = await import('@/server/actions/applicants')
    const result = await createApplicant({ ...VALID_APPLICANT, status: 'finalist' })
    expect(result.error).toMatch(/finalis.*publikasi/)
    expect(mockLocalInsert).not.toHaveBeenCalled()
  })

  it('accepts a verified status without promoting to finalist', async () => {
    const { createApplicant } = await import('@/server/actions/applicants')
    const result = await createApplicant({ ...VALID_APPLICANT, status: 'verified' })
    expect(result.error).toBeUndefined()
    expect(result.data?.status).toBe('verified')
  })
})

describe('submitRegistration', () => {
  it('submits valid FormData successfully', async () => {
    const { submitRegistration } = await import('@/server/actions/applicants')
    const fd = new FormData()
    fd.append('full_name', 'John Doe')
    fd.append('email', 'john@example.com')
    fd.append('phone', '081234567890')
    fd.append('date_of_birth', '2004-05-15')
    fd.append('place_of_birth', 'Manado')
    fd.append('gender', 'Laki-laki')
    fd.append('nim', '20123456')
    fd.append('faculty', 'fip')
    fd.append('study_program', 'fip_pgsd')
    fd.append('semester', '4')
    fd.append('ipk', '3.5')
    fd.append('address', 'Jl. Contoh No. 123, Kelurahan, Kecamatan')
    fd.append('city', 'Manado')
    fd.append('province', 'Sulawesi Utara')
    fd.append('height_cm', '175')
    fd.append('weight_kg', '60')
    fd.append('occupation', 'Mahasiswa')
    fd.append('education', 'Sarjana S1')
    fd.append('foreign_language', 'English')
    fd.append('essay', 'I want to join Nyong Noni UNIMA because I am passionate about culture and tourism promotion in North Sulawesi.')
    fd.append('consent', 'true')
    const result = await submitRegistration(fd)
    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
  })

  it('returns error for invalid FormData', async () => {
    const { submitRegistration } = await import('@/server/actions/applicants')
    const fd = new FormData()
    fd.append('full_name', '')
    fd.append('email', 'bad')
    const result = await submitRegistration(fd)
    expect(result.error).toBeDefined()
  })

  it('returns error for missing required fields', async () => {
    const { submitRegistration } = await import('@/server/actions/applicants')
    const fd = new FormData()
    const result = await submitRegistration(fd)
    expect(result.error).toBeDefined()
  })

  it('rejects submission when registration is closed', async () => {
    mockIsRegistrationOpen.mockReturnValue(false)
    const { submitRegistration } = await import('@/server/actions/applicants')
    const fd = new FormData()
    fd.append('full_name', 'John Doe')
    fd.append('email', 'john@example.com')
    const result = await submitRegistration(fd)
    expect(result.error).toBeDefined()
    expect(result.error).toMatch(/ditutup/i)
    expect(mockLocalInsert).not.toHaveBeenCalled()
  })
})

describe('getApplicants', () => {
  it('returns applicants list', async () => {
    mockLocalQuery.mockReturnValueOnce([{ id: '1', full_name: 'Alice' }])
    const { getApplicants } = await import('@/server/actions/applicants')
    const result = await getApplicants()
    expect(result).toHaveLength(1)
    expect(result[0].full_name).toBe('Alice')
  })

  it('returns empty array when no applicants', async () => {
    mockLocalQuery.mockReturnValueOnce([])
    const { getApplicants } = await import('@/server/actions/applicants')
    const result = await getApplicants()
    expect(result).toHaveLength(0)
  })

  it('merges profile data and only projects published stages as finalist in the admin DTO', async () => {
    const records = [
      { id: 'published', full_name: 'Published', status: 'verified', selection_year: 2026, photo_url: '/registration.png' },
      { id: 'draft', full_name: 'Draft', status: 'verified', selection_year: 2026 },
      { id: 'unannounced', full_name: 'Unannounced', status: 'verified', selection_year: 2025 },
      { id: 'legacy', full_name: 'Legacy', status: 'finalist', selection_year: 2024 },
    ]
    mockLocalQuery.mockImplementation((table: string) => {
      if (table === 'applicants') return records
      if (table === 'selection_entries') return [
        { applicant_id: 'published', year: 2026, stage: 'finalist', semifinalist_at: '2026-10-01' },
        { applicant_id: 'draft', year: 2026, stage: 'finalist_draft', semifinalist_at: '2026-10-02' },
        { applicant_id: 'unannounced', year: 2025, stage: 'finalist', semifinalist_at: '2025-10-01' },
      ]
      if (table === 'selection_announcements') return [{ year: 2026, published_at: '2026-10-03' }, { year: 2025, published_at: null }]
      if (table === 'finalist_profiles') return [{ applicant_id: 'published', bio: 'Biography', instagram: '@published', photo_url: '/profile.png', tahun: '2026' }]
      return []
    })
    const { getApplicants, getApplicantStats } = await import('@/server/actions/applicants')
    const result = await getApplicants()
    expect(result[0]).toMatchObject({ status: 'finalist', stage: 'finalist', selection_stage: 'finalist', semifinalist_at: '2026-10-01', bio: 'Biography', instagram: '@published', photo_url: '/profile.png', tahun: '2026' })
    expect(result[0].profile).toMatchObject({ bio: 'Biography' })
    expect(result[1]).toMatchObject({ status: 'verified', selection_stage: 'finalist_draft' })
    expect(result[2].status).toBe('verified')
    expect(result[3].status).toBe('finalist')
    expect(records[0].status).toBe('verified')
    expect(await getApplicantStats()).toEqual({ total: 4, pending: 0, verified: 2, rejected: 0, finalist: 2 })
  })
})

describe('updateApplicantStatus', () => {
  it('rejects direct finalist promotion', async () => {
    const { updateApplicantStatus } = await import('@/server/actions/applicants')
    await expect(updateApplicantStatus('test-id', 'finalist')).rejects.toThrow(/finalis.*publikasi/)
    expect(mockPrepare).not.toHaveBeenCalled()
  })

  it('updates to verified status', async () => {
    const { updateApplicantStatus } = await import('@/server/actions/applicants')
    await expect(updateApplicantStatus('test-id', 'verified')).resolves.not.toThrow()
    expect(mockPrepare).toHaveBeenCalledWith('UPDATE applicants SET status = ?, updated_at = ? WHERE id = ?')
    expect(mockRun).toHaveBeenCalledWith('verified', expect.any(String), 'test-id')
  })

  it('rejects invalid runtime status values before reading the DB', async () => {
    const { updateApplicantStatus } = await import('@/server/actions/applicants')
    await expect(updateApplicantStatus('test-id', 'admin' as never)).rejects.toThrow(/Status tidak valid/)
    expect(mockPrepare).not.toHaveBeenCalled()
  })

  it('keeps legacy finalists immutable through this action', async () => {
    mockPrepare.mockReturnValueOnce({ get: vi.fn(() => ({ status: 'finalist', selection_year: 2026 })), run: mockRun })
    const { updateApplicantStatus } = await import('@/server/actions/applicants')
    await expect(updateApplicantStatus('test-id', 'pending')).rejects.toThrow(/tidak dapat diubah/)
    expect(mockRun).not.toHaveBeenCalled()
  })
})

describe('deleteApplicant', () => {
  it('deletes applicant by id', async () => {
    const { deleteApplicant } = await import('@/server/actions/applicants')
    await expect(deleteApplicant('test-id')).resolves.not.toThrow()
    expect(mockLocalDelete).toHaveBeenCalledWith('applicants', 'test-id')
  })
})

describe('getApplicantStats', () => {
  beforeEach(() => {
    mockLocalQuery.mockImplementation((table: string) => table === 'applicants' ? [
      { status: 'pending' },
      { status: 'pending' },
      { status: 'verified' },
      { status: 'finalist' },
      { status: 'rejected' },
    ] : [])
  })

  it('returns correct stats breakdown', async () => {
    const { getApplicantStats } = await import('@/server/actions/applicants')
    const stats = await getApplicantStats()
    expect(stats.total).toBe(5)
    expect(stats.pending).toBe(2)
    expect(stats.verified).toBe(1)
    expect(stats.finalist).toBe(1)
    expect(stats.rejected).toBe(1)
  })

  it('handles empty applicant list', async () => {
    mockLocalQuery.mockReturnValueOnce([])
    const { getApplicantStats } = await import('@/server/actions/applicants')
    const stats = await getApplicantStats()
    expect(stats.total).toBe(0)
    expect(stats.pending).toBe(0)
    expect(stats.verified).toBe(0)
    expect(stats.finalist).toBe(0)
    expect(stats.rejected).toBe(0)
  })
})

describe('admin authorization', () => {
  it('guards every admin applicant entry point before reads or writes', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'))
    const { getApplicants, getApplicantStats, updateApplicantStatus, createApplicant, deleteApplicant } = await import('@/server/actions/applicants')
    for (const call of [() => getApplicants(), () => getApplicantStats(), () => updateApplicantStatus('id', 'verified'), () => createApplicant(VALID_APPLICANT), () => deleteApplicant('id')]) {
      await expect(call()).rejects.toThrow('Unauthorized')
    }
    expect(mockLocalQuery).not.toHaveBeenCalled()
    expect(mockPrepare).not.toHaveBeenCalled()
    expect(mockLocalInsert).not.toHaveBeenCalled()
    expect(mockLocalDelete).not.toHaveBeenCalled()
  })
})
