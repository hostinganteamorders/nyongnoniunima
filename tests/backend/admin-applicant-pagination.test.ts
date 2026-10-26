import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getApplicants } from '@/server/actions/applicants'

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), getAdminClient: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ requireAdmin: mocks.requireAdmin, getAdminClient: mocks.getAdminClient }))
vi.mock('@/lib/db/local', () => ({ isUsingLocalDb: () => false }))
vi.mock('@/server/actions/unima', () => ({ isRegistrationOpen: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

type Row = Record<string, string | number | null>
type Page = { table: string; columns?: string; key?: string; ascending?: boolean; limit?: number; cursor?: string | number }
const tables = ['applicants', 'selection_entries', 'selection_announcements', 'finalist_profiles'] as const
let rows: Record<string, Row[]>
let pages: Page[]
let beforeRead: (page: Page) => void
let response: (page: Page) => { data: Row[] | null | undefined; error: { message: string } | null } | undefined

function id(index: number) {
  return `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`
}

function applicants(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: id(index), full_name: `Legacy free-text name ${index}`, status: 'verified', selection_year: 2026,
    created_at: index < 2 ? '2026-10-03T00:00:00Z' : '2026-10-01T00:00:00Z',
    instagram: '@registration', photo_url: '/registration.jpg', email: `private-${index}@example.com`,
    faculty: 'Legacy Faculty', study_program: 'Legacy Program', ktp_url: '/private/ktp.pdf', cv_url: '/private/cv.pdf',
  }))
}

beforeEach(() => {
  vi.resetAllMocks()
  rows = Object.fromEntries(tables.map(table => [table, []]))
  pages = []
  beforeRead = () => {}
  response = () => undefined
  mocks.requireAdmin.mockResolvedValue({})
  mocks.getAdminClient.mockReturnValue({ from: mocks.from })
  mocks.from.mockImplementation((table: string) => {
    const page: Page = { table }
    const builder = {
      select: vi.fn((columns: string) => { page.columns = columns; return builder }),
      order: vi.fn((key: string, options: { ascending: boolean }) => { page.key = key; page.ascending = options.ascending; return builder }),
      limit: vi.fn((limit: number) => { page.limit = limit; return builder }),
      gt: vi.fn((_key: string, cursor: string | number) => { page.cursor = cursor; return builder }),
      then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
        return Promise.resolve().then(() => {
          pages.push({ ...page })
          beforeRead(page)
          const override = response(page)
          if (override) return override
          const key = page.key!
          const data = [...rows[table]]
            .filter(row => page.cursor === undefined || row[key]! > page.cursor)
            .sort((a, b) => a[key] === b[key] ? 0 : (a[key]! < b[key]! ? -1 : 1) * (page.ascending ? 1 : -1))
            .slice(0, Math.min(page.limit ?? 1000, 1000))
          return { data: page.columns === '*' ? data : data.map(row => Object.fromEntries(page.columns!.split(',').map(column => [column.trim(), row[column.trim()]]))), error: null }
        }).then(resolve, reject)
      },
    }
    return builder
  })
})

describe('admin applicant keyset pagination', () => {
  it('loads more than 1000 applicants for UI search, preserving private fields and legacy catalog names', async () => {
    rows.applicants = applicants(1205).reverse()
    rows.applicants[0].full_name = 'Matching name beyond 1000'
    const result = await getApplicants()
    expect(result).toHaveLength(1205)
    expect(new Set(result.map(row => row.id)).size).toBe(1205)
    expect(result.filter(row => row.full_name.toLowerCase().includes('matching name'))).toEqual([
      expect.objectContaining({ id: id(1204), full_name: 'Matching name beyond 1000', email: 'private-1204@example.com',
        faculty: 'Legacy Faculty', study_program: 'Legacy Program', ktp_url: '/private/ktp.pdf', cv_url: '/private/cv.pdf',
        profile: null, bio: null, instagram: '@registration', photo_url: '/registration.jpg', tahun: '2026', selection_published: false }),
    ])
    expect(result.map(row => row.id)).toEqual(Array.from({ length: 1205 }, (_, index) => id(index)))
    expect(pages.filter(page => page.table === 'applicants')).toEqual([
      { table: 'applicants', columns: '*', key: 'id', ascending: true, limit: 500 },
      { table: 'applicants', columns: '*', key: 'id', ascending: true, limit: 500, cursor: id(499) },
      { table: 'applicants', columns: '*', key: 'id', ascending: true, limit: 500, cursor: id(999) },
    ])
    for (const page of pages) expect(page).toMatchObject({ ascending: true, limit: 500 })
  })

  it('restores newest-created ordering after keyset loading with ascending IDs for timestamp ties', async () => {
    rows.applicants = applicants(3)
    rows.applicants[2].created_at = '2026-10-04T00:00:00Z'
    expect((await getApplicants()).map(row => row.id)).toEqual([id(2), id(0), id(1)])
  })

  it('loads all dependent entries and profiles and uses the latest profile before projecting publication', async () => {
    rows.applicants = applicants(1205)
    rows.selection_entries = rows.applicants.map(row => ({ applicant_id: row.id, year: 2026, stage: 'finalist', semifinalist_at: '2026-10-01' })).reverse()
    rows.selection_entries[1].stage = 'finalist_draft'
    rows.selection_announcements = [{ year: 2026, published_at: '2026-10-03' }, { year: 2025, published_at: null }]
    rows.finalist_profiles = Array.from({ length: 1205 }, (_, index) => ({
      id: id(index), applicant_id: id(index), created_at: '2026-10-01T00:00:00Z',
      bio: 'Old biography', instagram: '@old', photo_url: '/old.jpg', tahun: '2025',
    }))
    rows.finalist_profiles.push(
      { id: id(1205), applicant_id: id(1204), created_at: '2026-10-04T00:00:00Z', bio: 'Latest biography', instagram: '@latest', photo_url: '/latest.jpg', tahun: '2026' },
      { id: id(1206), applicant_id: id(1204), created_at: '2026-10-04T00:00:00Z', bio: 'Losing tie', instagram: '@losing', photo_url: '/losing.jpg', tahun: '2026' },
    )
    rows.finalist_profiles.reverse()
    const result = await getApplicants()
    expect(result.find(row => row.id === id(1204))).toMatchObject({
      status: 'finalist', stage: 'finalist', selection_stage: 'finalist', selection_published: true,
      semifinalist_at: '2026-10-01', bio: 'Latest biography', instagram: '@latest', photo_url: '/latest.jpg', tahun: '2026',
      profile: { id: id(1205), bio: 'Latest biography' },
    })
    expect(result.find(row => row.id === id(1203))).toMatchObject({ status: 'verified', selection_stage: 'finalist_draft', selection_published: true })
    expect(rows.applicants[1204].status).toBe('verified')
    for (const [table, key] of [['selection_entries', 'applicant_id'], ['finalist_profiles', 'id']]) {
      expect(pages.filter(page => page.table === table).map(page => [page.key, page.cursor])).toEqual([
        [key, undefined], [key, id(499)], [key, id(999)],
      ])
    }
    expect(pages.find(page => page.table === 'selection_announcements')).toMatchObject({ key: 'year', ascending: true, limit: 500 })
  })

  it('continues paging announcements by their numeric unique key', async () => {
    // Synthetic years exercise pagination even though the current schema allows fewer than 500 years.
    rows.selection_announcements = Array.from({ length: 1005 }, (_, year) => ({ year, published_at: '2026-10-03' })).reverse()
    rows.applicants = [{ ...applicants(1)[0], selection_year: 1004 }]
    rows.selection_entries = [{ applicant_id: id(0), year: 1004, stage: 'finalist', semifinalist_at: null }]
    expect(await getApplicants()).toEqual([expect.objectContaining({ status: 'finalist', selection_published: true })])
    expect(pages.filter(page => page.table === 'selection_announcements').map(page => page.cursor)).toEqual([undefined, 499, 999])
  })

  it.each(tables)('rejects a second-page %s error instead of returning partial rows', async table => {
    rows.applicants = applicants(501)
    rows[table] = Array.from({ length: 501 }, (_, index) => ({ ...rows.applicants[index], applicant_id: id(index), year: index }))
    response = page => page.table === table && page.cursor !== undefined
      ? { data: [], error: { message: `${table} second page failed` } } : undefined
    await expect(getApplicants()).rejects.toThrow(`${table} second page failed`)
  })

  it.each(tables.flatMap(table => [null, undefined].flatMap(data => [false, true].map(later => ({ table, data, later })))))('rejects missing $table data (later page: $later, data: $data)', async ({ table, data, later }) => {
    rows[table] = Array.from({ length: 500 }, (_, index) => ({ id: id(index), applicant_id: id(index), year: index }))
    response = page => page.table === table && (page.cursor !== undefined) === later ? { data, error: null } : undefined
    await expect(getApplicants()).rejects.toThrow(`Missing ${table} response`)
  })

  it('does not skip unread applicants if the previous page cursor row is concurrently deleted', async () => {
    rows.applicants = applicants(1205)
    beforeRead = page => {
      if (page.table === 'applicants' && page.cursor === id(499)) {
        rows.applicants = rows.applicants.filter(row => row.id !== id(499))
      }
    }
    const result = await getApplicants()
    expect(result.map(row => row.id)).toEqual(Array.from({ length: 1205 }, (_, index) => id(index)))
    expect(rows.applicants).toHaveLength(1204)
  })

  it('waits for authorization before accessing the service client or any table', async () => {
    let deny!: (reason: Error) => void
    mocks.requireAdmin.mockReturnValue(new Promise((_resolve, reject) => { deny = reject }))
    const result = getApplicants()
    expect(mocks.getAdminClient).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalled()
    deny(new Error('Unauthorized'))
    await expect(result).rejects.toThrow('Unauthorized')
    expect(mocks.getAdminClient).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalled()
  })
})
