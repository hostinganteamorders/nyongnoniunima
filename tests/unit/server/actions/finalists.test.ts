import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockLocalQuery = vi.fn((table: string, opts?: any) => {
  if (table === 'applicants') {
    const all = [
      { id: '1', full_name: 'Alice', email: 'a@test.com', city: 'Manado', province: 'Sulut', height_cm: 165, occupation: 'Mahasiswa', education: 'S1', status: 'finalist', created_at: '2026-01-01', date_of_birth: '2000-05-10', photo_url: null },
      { id: '2', full_name: 'Bob', email: 'b@test.com', city: 'Tomohon', province: 'Sulut', height_cm: 170, occupation: 'Karyawan', education: 'SMA', status: 'finalist', created_at: '2026-01-02', date_of_birth: '1999-08-15', photo_url: null },
      { id: '3', full_name: 'Pending', status: 'pending', selection_year: 2026 },
      { id: '4', full_name: 'Draft', status: 'verified', selection_year: 2026 },
      { id: '5', full_name: 'Published', status: 'verified', selection_year: 2026 },
    ]
    if (opts?.where?.id) return all.filter(a => a.id === opts.where.id)
    if (opts?.where?.status) return all.filter(a => a.status === opts.where.status)
    return all
  }
  if (table === 'selection_entries') return [
    { applicant_id: '4', year: 2026, stage: 'finalist_draft' },
    { applicant_id: '5', year: 2026, stage: 'finalist' },
  ]
  if (table === 'selection_announcements') return [{ year: 2026, published_at: '2026-06-01' }]
  if (table === 'hall_of_fame') return [
    { id: 'h1', tahun: 2025, nyong_name: 'John', noni_name: 'Jane', kabupaten_kota: 'Manado' },
    { id: 'h2', tahun: 2024, nyong_name: 'Alex', noni_name: 'Sara', kabupaten_kota: 'Bitung' },
  ]
  if (table === 'alumni_achievements') return [
    { id: 'a1', alumni_name: 'John Doe', achievement_type: 'Dokter', description: 'Dokter di RSUD', tahun: '2025' },
  ]
  if (table === 'titleholders') return [
    { id: 't1', tahun: 2026, category: 'Juara Utama', nyong_name: 'John', noni_name: 'Jane', region: 'Manado', sort_order: 1, motto: 'Sulut Hebat' },
    { id: 't2', tahun: 2026, category: 'Wakil I', nyong_name: 'Alex', noni_name: 'Sara', region: 'Bitung', sort_order: 2 },
    { id: 't3', tahun: 2025, category: 'Juara Utama', nyong_name: 'Bimo', noni_name: 'Clara', region: 'Tomohon', sort_order: 1 },
  ]
  if (table === 'finalist_profiles') {
    if (opts?.where?.applicant_id === '1') return [
      { id: 'fp1', applicant_id: '1', instagram: '@alice', photo_url: '/photos/alice.jpg', bio: 'Finalist bio', tahun: '2026' },
    ]
    if (opts?.where?.applicant_id) return []
    return [{ id: 'fp1', applicant_id: '1', instagram: '@alice', photo_url: '/photos/alice.jpg', bio: 'Finalist bio', tahun: '2026' }]
  }
  return []
})
const mockLocalInsert = vi.fn((table: string, data: any) => ({ ...data, id: 'mock-id' }))
const mockLocalUpdate = vi.fn((table: string, id: string, data: any) => ({ id, ...data }))
const mockLocalDelete = vi.fn(() => true)
const mockRequireAdmin = vi.fn(async () => ({ user: { id: 'admin-1' }, supabase: null }))

vi.mock('@/lib/db/local', () => ({
  isUsingLocalDb: () => true,
  localInsert: mockLocalInsert,
  localQuery: mockLocalQuery,
  localUpdate: mockLocalUpdate,
  localDelete: mockLocalDelete,
  getLocalDb: () => ({ transaction: (fn: () => unknown) => ({ immediate: fn }) }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  requireAdmin: mockRequireAdmin,
  getAdminClient: vi.fn(() => ({})),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' }, supabase: null })
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-06-10T00:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getPublicFinalists', () => {
  it('returns legacy and published finalists using only the safe public DTO', async () => {
    const { getPublicFinalists } = await import('@/server/actions/finalists')
    const result = await getPublicFinalists()
    expect(result.map(row => row.id)).toEqual(['1', '2', '5'])
    expect(result[0].full_name).toBe('Alice')
    expect(Object.keys(result[0]).sort()).toEqual(['id', 'full_name', 'faculty', 'study_program', 'gender', 'photo_url', 'instagram', 'bio', 'umur', 'profile'].sort())
    expect(result[0].profile).toEqual({ tahun: '2026' })
    expect(result[0]).not.toHaveProperty('status')
    expect(result[0]).not.toHaveProperty('email')
    expect(result[0]).not.toHaveProperty('date_of_birth')
  })

  it('returns profile data when available', async () => {
    const { getPublicFinalists } = await import('@/server/actions/finalists')
    const result = await getPublicFinalists()
    expect(result[0].instagram).toBe('@alice')
    expect(result[0].bio).toBe('Finalist bio')
  })

  it('calculates umur from date_of_birth', async () => {
    const { getPublicFinalists } = await import('@/server/actions/finalists')
    const result = await getPublicFinalists()
    expect(result[0].umur).toBeGreaterThan(0)
  })
})

describe('getPublicFinalist', () => {
  it('returns single finalist with profile', async () => {
    const { getPublicFinalist } = await import('@/server/actions/finalists')
    const result = await getPublicFinalist('1')
    expect(result).not.toBeNull()
    expect(result!.full_name).toBe('Alice')
    expect(result!.photo_url).toBe('/photos/alice.jpg')
    expect(result!.profile).toBeDefined()
  })

  it('returns null for non-existent id', async () => {
    const { getPublicFinalist } = await import('@/server/actions/finalists')
    const result = await getPublicFinalist('non-existent')
    expect(result).toBeNull()
  })

  it('returns finalist even without profile', async () => {
    const { getPublicFinalist } = await import('@/server/actions/finalists')
    const result = await getPublicFinalist('2')
    expect(result).not.toBeNull()
    expect(result!.photo_url).toBeNull()
  })

  it('does not expose pending applicants or draft finalists by ID', async () => {
    const { getPublicFinalist } = await import('@/server/actions/finalists')
    expect(await getPublicFinalist('3')).toBeNull()
    expect(await getPublicFinalist('4')).toBeNull()
    expect(await getPublicFinalist('5')).toMatchObject({ id: '5', profile: { tahun: '2026' } })
  })
})

describe('getHallOfFame', () => {
  it('returns hall of fame entries', async () => {
    const { getHallOfFame } = await import('@/server/actions/finalists')
    const result = await getHallOfFame()
    expect(result).toHaveLength(2)
  })

  it('includes tahun, nyong and noni names', async () => {
    const { getHallOfFame } = await import('@/server/actions/finalists')
    const result = await getHallOfFame()
    expect(result[0].tahun).toBe(2025)
    expect(result[0].nyong_name).toBe('John')
    expect(result[0].noni_name).toBe('Jane')
  })

  it('returns empty array when no entries', async () => {
    mockLocalQuery.mockImplementationOnce(() => [])
    const { getHallOfFame } = await import('@/server/actions/finalists')
    const result = await getHallOfFame()
    expect(result).toHaveLength(0)
  })
})

describe('getAlumniAchievements', () => {
  it('returns alumni achievements', async () => {
    const { getAlumniAchievements } = await import('@/server/actions/finalists')
    const result = await getAlumniAchievements()
    expect(result).toHaveLength(1)
    expect(result[0].achievement_type).toBe('Dokter')
  })

  it('returns empty array when no achievements', async () => {
    mockLocalQuery.mockImplementationOnce(() => [])
    const { getAlumniAchievements } = await import('@/server/actions/finalists')
    const result = await getAlumniAchievements()
    expect(result).toHaveLength(0)
  })
})

describe('getTitleholders', () => {
  it('returns sorted titleholders', async () => {
    const { getTitleholders } = await import('@/server/actions/finalists')
    const result = await getTitleholders()
    expect(result).toHaveLength(3)
    expect(result[0].tahun).toBe(2026)
    expect(result[0].category).toBe('Juara Utama')
    expect(result[1].category).toBe('Wakil I')
  })

  it('filters titleholders by year', async () => {
    const { getTitleholders } = await import('@/server/actions/finalists')
    const result = await getTitleholders(2025)
    expect(result).toHaveLength(1)
    expect(result[0].tahun).toBe(2025)
  })
})

describe('getReigningPair', () => {
  it('returns the current year main pair when available', async () => {
    const { getReigningPair } = await import('@/server/actions/finalists')
    const result = await getReigningPair()
    expect(result).not.toBeNull()
    expect(result!.tahun).toBe(2026)
    expect(result!.category).toBe('Juara Utama')
  })
})

describe('updateFinalistData', () => {
  it('checks admin authorization before reading or writing', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden'))
    const { updateFinalistData } = await import('@/server/actions/finalists')
    await expect(updateFinalistData({ applicant_id: '1', tahun: '2026' })).rejects.toThrow('Forbidden')
    expect(mockLocalQuery).not.toHaveBeenCalled()
    expect(mockLocalUpdate).not.toHaveBeenCalled()
    expect(mockLocalInsert).not.toHaveBeenCalled()
  })

  it('updates finalist applicant fields and creates profile if missing', async () => {
    const { updateFinalistData } = await import('@/server/actions/finalists')
    const result = await updateFinalistData({ applicant_id: '2', tahun: '2026', full_name: 'Bob Updated' })
    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    expect(mockLocalUpdate).toHaveBeenCalledWith('applicants', '2', expect.objectContaining({ full_name: 'Bob Updated' }))
    expect(mockLocalInsert).toHaveBeenCalledWith('finalist_profiles', expect.objectContaining({ applicant_id: '2', tahun: '2026' }))
  })

  it('updates existing profile when it exists', async () => {
    const { updateFinalistData } = await import('@/server/actions/finalists')
    const result = await updateFinalistData({ applicant_id: '1', tahun: '2026', instagram: '@newhandle' })
    expect(result.error).toBeUndefined()
    expect(mockLocalUpdate).toHaveBeenCalledWith('finalist_profiles', 'fp1', expect.objectContaining({ instagram: '@newhandle' }))
  })

  it('returns validation error for invalid data', async () => {
    const { updateFinalistData } = await import('@/server/actions/finalists')
    const result = await updateFinalistData({ applicant_id: '', tahun: '' } as any)
    expect(result.error).toBeDefined()
  })

  it('allows omitted measurements without overwriting them', async () => {
    const { updateFinalistData } = await import('@/server/actions/finalists')
    const result = await updateFinalistData({ applicant_id: '2', tahun: '2026' })
    expect(result.error).toBeUndefined()
    expect(mockLocalUpdate).not.toHaveBeenCalledWith('applicants', expect.anything(), expect.anything())
  })

  it.each([
    { height_cm: 100, weight_kg: 20 },
    { height_cm: 250, weight_kg: 200 },
    { height_cm: 0.5, weight_kg: 0.5 },
  ])('saves positive measurements outside former bounds: %j', async (measurements) => {
    const { updateFinalistData } = await import('@/server/actions/finalists')
    const result = await updateFinalistData({ applicant_id: '2', tahun: '2026', ...measurements })
    expect(result.error).toBeUndefined()
    expect(mockLocalUpdate).toHaveBeenCalledWith('applicants', '2', expect.objectContaining(measurements))
  })

  describe.each(['height_cm', 'weight_kg'])('%s', (field) => {
    it.each(['', 0, -1, NaN, Infinity, -Infinity, null])('rejects invalid supplied measurement %s without writing', async (value) => {
      const { updateFinalistData } = await import('@/server/actions/finalists')
      const result = await updateFinalistData({ applicant_id: '2', tahun: '2026', [field]: value })
      expect(result.error).toBeDefined()
      expect(mockLocalUpdate).not.toHaveBeenCalled()
      expect(mockLocalInsert).not.toHaveBeenCalled()
    })
  })

  it('does not report success or save a profile when the applicant update failed', async () => {
    mockLocalUpdate.mockReturnValueOnce(null)
    const { updateFinalistData } = await import('@/server/actions/finalists')
    const result = await updateFinalistData({ applicant_id: '2', full_name: 'Updated Name', tahun: '2026' })
    expect(result.error).toMatch(/Gagal memperbarui peserta/)
    expect(mockLocalInsert).not.toHaveBeenCalled()
  })

  it('does not report success when the profile update failed', async () => {
    mockLocalUpdate.mockReturnValueOnce(null)
    const { updateFinalistData } = await import('@/server/actions/finalists')
    const result = await updateFinalistData({ applicant_id: '1', instagram: '@updated', tahun: '2026' })
    expect(result.error).toMatch(/Gagal memperbarui profil/)
  })
})

describe('createHallOfFame', () => {
  it('creates hall of fame entry with valid data', async () => {
    const { createHallOfFame } = await import('@/server/actions/finalists')
    const result = await createHallOfFame({ tahun: 2026, nyong_name: 'Test', noni_name: 'Test', kabupaten_kota: 'Manado' })
    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
  })

  it('rejects missing tahun', async () => {
    const { createHallOfFame } = await import('@/server/actions/finalists')
    const result = await createHallOfFame({ tahun: 0, nyong_name: '', noni_name: '', kabupaten_kota: '' } as any)
    expect(result.error).toBeDefined()
  })
})

describe('deleteHallOfFame', () => {
  it('deletes hall of fame entry', async () => {
    const { deleteHallOfFame } = await import('@/server/actions/finalists')
    await expect(deleteHallOfFame('h1')).resolves.not.toThrow()
    expect(mockLocalDelete).toHaveBeenCalledWith('hall_of_fame', 'h1')
  })
})

describe('createAlumniAchievement', () => {
  it('creates achievement with valid data', async () => {
    const { createAlumniAchievement } = await import('@/server/actions/finalists')
    const result = await createAlumniAchievement({ alumni_name: 'Test Alumni', achievement_type: 'Dokter', description: 'Dokter spesialis di RSUD Manado', tahun: '2026' })
    expect(result.error).toBeUndefined()
  })

  it('rejects empty achievement type', async () => {
    const { createAlumniAchievement } = await import('@/server/actions/finalists')
    const result = await createAlumniAchievement({ alumni_name: 'Test', achievement_type: '', description: 'Description long enough for validation', tahun: '2026' })
    expect(result.error).toBeDefined()
  })
})

describe('deleteAlumniAchievement', () => {
  it('deletes alumni achievement', async () => {
    const { deleteAlumniAchievement } = await import('@/server/actions/finalists')
    await expect(deleteAlumniAchievement('a1')).resolves.not.toThrow()
    expect(mockLocalDelete).toHaveBeenCalledWith('alumni_achievements', 'a1')
  })
})

describe('createTitleholder', () => {
  it('creates titleholder with valid data', async () => {
    const { createTitleholder } = await import('@/server/actions/finalists')
    const result = await createTitleholder({
      tahun: 2026,
      category: 'Berbakat',
      nyong_name: 'New Nyong',
      noni_name: 'New Noni',
      region: 'Manado',
    })
    expect(result.error).toBeUndefined()
    expect(mockLocalInsert).toHaveBeenCalledWith('titleholders', expect.objectContaining({
      category: 'Berbakat',
      sort_order: 10,
    }))
  })

  it('rejects invalid titleholder data', async () => {
    const { createTitleholder } = await import('@/server/actions/finalists')
    const result = await createTitleholder({ tahun: 1999, category: 'Invalid' } as any)
    expect(result.error).toBeDefined()
  })

  it('rejects a side that already exists in the same tahun+category', async () => {
    const { createTitleholder } = await import('@/server/actions/finalists')
    const result = await createTitleholder({
      tahun: 2026,
      category: 'Juara Utama',
      nyong_name: 'Another Nyong',
      noni_name: '',
    })
    expect(result.error).toContain('Nyong untuk kategori')
    expect(mockLocalInsert).not.toHaveBeenCalled()
  })
})

describe('updateTitleholder', () => {
  it('updates an existing titleholder', async () => {
    const { updateTitleholder } = await import('@/server/actions/finalists')
    const result = await updateTitleholder('t1', {
      tahun: 2026,
      category: 'Berbakat',
      nyong_name: 'John Updated',
      noni_name: 'Jane Updated',
      region: 'Manado',
    })
    expect(result.error).toBeUndefined()
    expect(mockLocalUpdate).toHaveBeenCalledWith('titleholders', 't1', expect.objectContaining({
      category: 'Berbakat',
      sort_order: 10,
    }))
  })

  it('rejects moving into a category whose side is already taken', async () => {
    const { updateTitleholder } = await import('@/server/actions/finalists')
    const result = await updateTitleholder('t1', {
      tahun: 2026,
      category: 'Wakil I',
      nyong_name: 'John Updated',
      noni_name: '',
      region: 'Manado',
    })
    expect(result.error).toContain('Nyong untuk kategori')
    expect(mockLocalUpdate).not.toHaveBeenCalled()
  })
})

describe('deleteTitleholder', () => {
  it('deletes a titleholder', async () => {
    const { deleteTitleholder } = await import('@/server/actions/finalists')
    await expect(deleteTitleholder('t1')).resolves.not.toThrow()
    expect(mockLocalDelete).toHaveBeenCalledWith('titleholders', 't1')
  })
})
