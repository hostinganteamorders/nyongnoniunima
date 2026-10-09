import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { RegistrationInput } from '@/lib/validations/registration'

const mockLocalInsert = vi.fn((table: string, data: any) => ({ ...data, id: 'mock-id' })) as any
const mockLocalQuery = vi.fn(() => []) as any
const mockLocalUpdate = vi.fn() as any
const mockLocalDelete = vi.fn(() => true) as any

vi.mock('@/lib/db/local', () => ({
  isUsingLocalDb: () => true,
  localInsert: mockLocalInsert,
  localQuery: mockLocalQuery,
  localUpdate: mockLocalUpdate,
  localDelete: mockLocalDelete,
}))

vi.mock('@/lib/supabase/admin', () => ({
  requireAdmin: vi.fn(() => Promise.resolve({ user: { id: 'admin-1' }, supabase: null })),
  getAdminClient: vi.fn(() => ({})),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const VALID_APPLICANT: RegistrationInput = {
  full_name: 'John Doe',
  email: 'john@example.com',
  phone: '081234567890',
  date_of_birth: '2000-01-01',
  place_of_birth: 'Manado',
  gender: 'Laki-laki',
  nim: '20123456',
  faculty: 'fip',
  study_program: 'fip_pgsd',
  semester: 4,
  address: 'Jl. Contoh No. 123, Kelurahan, Kecamatan',
  city: 'Manado',
  province: 'Sulawesi Utara',
  height_cm: 170,
  weight_kg: 60,
  occupation: 'Mahasiswa',
  education: 'Sarjana S1',
  essay: 'I want to join Nyong Noni UNIMA because I am passionate about culture and tourism promotion in North Sulawesi.',
  consent: true,
}

beforeEach(() => {
  vi.clearAllMocks()
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

  it('accepts custom status override', async () => {
    const { createApplicant } = await import('@/server/actions/applicants')
    const result = await createApplicant({ ...VALID_APPLICANT, status: 'finalist' })
    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
  })
})

describe('submitRegistration', () => {
  it('submits valid FormData successfully', async () => {
    const { submitRegistration } = await import('@/server/actions/applicants')
    const fd = new FormData()
    fd.append('full_name', 'John Doe')
    fd.append('email', 'john@example.com')
    fd.append('phone', '081234567890')
    fd.append('date_of_birth', '2000-01-01')
    fd.append('place_of_birth', 'Manado')
    fd.append('gender', 'Laki-laki')
    fd.append('nim', '20123456')
    fd.append('faculty', 'fip')
    fd.append('study_program', 'fip_pgsd')
    fd.append('semester', '4')
    fd.append('address', 'Jl. Contoh No. 123, Kelurahan, Kecamatan')
    fd.append('city', 'Manado')
    fd.append('province', 'Sulawesi Utara')
    fd.append('height_cm', '170')
    fd.append('weight_kg', '60')
    fd.append('occupation', 'Mahasiswa')
    fd.append('education', 'Sarjana S1')
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
})

describe('updateApplicantStatus', () => {
  it('updates status successfully', async () => {
    const { updateApplicantStatus } = await import('@/server/actions/applicants')
    await expect(updateApplicantStatus('test-id', 'finalist')).resolves.not.toThrow()
    expect(mockLocalUpdate).toHaveBeenCalledWith('applicants', 'test-id', expect.objectContaining({ status: 'finalist' }))
  })

  it('updates to verified status', async () => {
    const { updateApplicantStatus } = await import('@/server/actions/applicants')
    await expect(updateApplicantStatus('test-id', 'verified')).resolves.not.toThrow()
    expect(mockLocalUpdate).toHaveBeenCalledWith('applicants', 'test-id', expect.objectContaining({ status: 'verified' }))
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
    mockLocalQuery.mockReturnValue([
      { status: 'pending' },
      { status: 'pending' },
      { status: 'verified' },
      { status: 'finalist' },
      { status: 'rejected' },
    ])
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
