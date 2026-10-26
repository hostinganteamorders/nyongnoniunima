import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ local: vi.fn(), query: vi.fn(), client: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/db/local', () => ({ isUsingLocalDb: mocks.local, localQuery: mocks.query }))
vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: mocks.client }))
vi.mock('@/lib/supabase/admin', () => ({ requireAdmin: vi.fn(), getAdminClient: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { getFaculties, getStudyPrograms } from '@/server/actions/unima'

const programs = [
  { id: 'active-int', faculty_id: 'ft', is_active: 1 },
  { id: 'active-bool', faculty_id: 'fip', is_active: true },
  { id: 'archived-int', faculty_id: 'ft', is_active: 0 },
  { id: 'archived-bool', faculty_id: 'fip', is_active: false },
  { id: 'missing-flag', faculty_id: 'ft' },
]

beforeEach(() => {
  vi.resetAllMocks()
  mocks.local.mockReturnValue(true)
  mocks.query.mockReturnValue(programs)
  mocks.client.mockResolvedValue({ from: mocks.from })
})

describe('local study program reads', () => {
  it('preserves archived programs by default, including faculty-filtered historical callers', async () => {
    expect(await getStudyPrograms()).toEqual(programs)
    expect(await getStudyPrograms('ft')).toEqual(programs.filter(program => program.faculty_id === 'ft'))
    expect(mocks.query).toHaveBeenCalledWith('study_programs', { orderBy: { column: 'name', direction: 'ASC' } })
  })

  it('accepts only explicit integer or boolean active flags when requested', async () => {
    expect(await getStudyPrograms(undefined, true)).toEqual(programs.slice(0, 2))
    expect(await getStudyPrograms('ft', true)).toEqual([programs[0]])
    expect(await getStudyPrograms(undefined, false)).toEqual(programs)
  })

  it('propagates database read failures', async () => {
    mocks.query.mockImplementation(() => { throw new Error('catalog read failed') })
    await expect(getStudyPrograms(undefined, true)).rejects.toThrow('catalog read failed')
  })
})

describe('remote study program reads', () => {
  let builder: { select: ReturnType<typeof vi.fn>; order: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn>; then: PromiseLike<unknown>['then'] }

  beforeEach(() => {
    mocks.local.mockReturnValue(false)
    builder = {
      select: vi.fn(() => builder), order: vi.fn(() => builder), eq: vi.fn(() => builder),
      then: (resolve, reject) => Promise.resolve({ data: programs, error: null }).then(resolve, reject),
    }
    mocks.from.mockReturnValue(builder)
  })

  it('does not apply an active filter for historical default callers', async () => {
    expect(await getStudyPrograms()).toEqual(programs)
    expect(builder.eq).not.toHaveBeenCalled()
    await getStudyPrograms('ft')
    expect(builder.eq).toHaveBeenCalledExactlyOnceWith('faculty_id', 'ft')
    expect(builder.order).toHaveBeenCalledWith('name')
  })

  it('requests the PostgreSQL boolean active flag and optional faculty', async () => {
    await getStudyPrograms(undefined, true)
    expect(builder.eq).toHaveBeenCalledExactlyOnceWith('is_active', true)
    builder.eq.mockClear()
    await getStudyPrograms('ft', true)
    expect(builder.eq.mock.calls).toEqual([['faculty_id', 'ft'], ['is_active', true]])
  })

  it('propagates database read errors instead of returning an empty catalog', async () => {
    builder.then = (resolve, reject) => Promise.resolve({ data: null, error: { message: 'catalog read failed' } }).then(resolve, reject)
    await expect(getStudyPrograms(undefined, true)).rejects.toThrow('catalog read failed')
  })

  it('does not apply any active filter to faculties', async () => {
    await getFaculties()
    expect(mocks.from).toHaveBeenCalledWith('faculties')
    expect(builder.eq).not.toHaveBeenCalled()
  })
})
