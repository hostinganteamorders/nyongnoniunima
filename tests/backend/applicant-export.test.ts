import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type Database from 'better-sqlite3'
import type { ApplicantExportRow } from '@/server/applicant-export'

const auth = vi.hoisted(() => ({ requireAdmin: vi.fn(), getAdminClient: vi.fn(), authorized: false }))
vi.mock('@/lib/supabase/admin', () => auth)

let dir: string
let db: Database.Database
let local: typeof import('@/lib/db/local')
let getApplicantExportRows: typeof import('@/server/applicant-export').getApplicantExportRows

const fields = 'id,full_name,nim,email,phone,gender,place_of_birth,date_of_birth,faculty,study_program,semester,ipk,selection_year,status,selection_stage,created_at,height_cm,weight_kg,address,city,province,occupation,education,foreign_language,instagram,tiktok,facebook,essay'.split(',')
const privateFields = { user_id: 'secret-user', consent: true, ktp_url: '/secret-ktp', photo_url: '/secret-photo', cv_url: '/secret-cv', private_notes: 'secret-notes' }
const key = (prefix: string, n: number) => `${prefix}${String(n).padStart(4, '0')}`

function seed(id: string, overrides: Record<string, unknown> = {}) {
  const row = {
    id, full_name: `Name ${id}`, email: `${id}@example.com`, phone: '081234567890',
    date_of_birth: '2004-05-15', address: 'Address', city: 'Manado', province: 'Sulut',
    faculty: 'ft', study_program: 'ft_ti', status: 'verified', selection_year: 2026,
    created_at: '2026-01-01', instagram: '@registration', ktp_url: '/secret-ktp',
    ...overrides,
  }
  db.prepare(`INSERT INTO applicants (${Object.keys(row).join(',')}) VALUES (${Object.keys(row).map(() => '?').join(',')})`).run(...Object.values(row))
}

type RemoteRow = Record<string, unknown>
function remoteData(count = 1001): Record<string, RemoteRow[]> {
  return {
    applicants: Array.from({ length: count }, (_, n) => ({
      id: key('a', n), full_name: `Name ${n}`, email: `${n}@example.com`, city: 'Manado',
      status: 'verified', selection_year: 2000 + n, ipk: 0,
      faculty: key('f', n), study_program: key('s', n),
      created_at: n === count - 1 ? '2027-01-01' : '2026-01-01', ...privateFields,
    })),
    selection_entries: Array.from({ length: count }, (_, n) => ({ applicant_id: key('a', n), year: 2000 + n, stage: 'finalist', ...privateFields })),
    selection_announcements: Array.from({ length: count }, (_, n) => ({ year: 2000 + n, published_at: '2026-10-01', snapshot_json: 'secret-snapshot' })),
    finalist_profiles: Array.from({ length: count }, (_, n) => ({ id: key('p', n), applicant_id: key('a', n), instagram: `@profile${n}`, created_at: '2026-01-01', ...privateFields })),
    faculties: Array.from({ length: count }, (_, n) => ({ id: key('f', n), name: `Faculty ${n}` })),
    study_programs: Array.from({ length: count }, (_, n) => ({ id: key('s', n), name: `Archived program ${n}`, is_active: false })),
  }
}

function mockRemote(data = remoteData(), failure?: { table: string; page: number }, onPage?: (table: string, page: number) => RemoteRow[] | void) {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://export.invalid')
  const calls: { table: string; columns: string; orders: { column: string; ascending: boolean }[]; after?: { column: string; value: string | number }; size: number }[] = []
  const from = vi.fn((table: string) => {
    expect(auth.authorized).toBe(true)
    let columns = ''
    let size = 0
    let after: { column: string; value: string | number } | undefined
    const orders: { column: string; ascending: boolean }[] = []
    const query = {
      select: vi.fn((selection: string) => { columns = selection; return query }),
      order: vi.fn((column: string, options: { ascending: boolean }) => {
        orders.push({ column, ascending: options.ascending })
        return query
      }),
      gt: vi.fn((column: string, value: string | number) => { after = { column, value }; return query }),
      limit: vi.fn((count: number) => { size = count; return query }),
      then: (resolve: (value: { data: RemoteRow[] | null; error: { message: string } | null }) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve().then(() => {
        expect(auth.authorized).toBe(true)
        const page = calls.filter(c => c.table === table).length
        calls.push({ table, columns, orders: [...orders], after, size })
        if (failure?.table === table && failure.page === page) {
          return { data: null, error: { message: `Failed ${table} page ${page}` } }
        }
        const override = onPage?.(table, page)
        const rows = data[table].filter(row => !after || (row[after.column] as string | number) > after.value).sort((a, b) => {
          for (const { column, ascending } of orders) {
            const x = a[column] as string | number
            const y = b[column] as string | number
            const result = x < y ? -1 : x > y ? 1 : 0
            if (result) return ascending ? result : -result
          }
          return 0
        })
        // Deliberately return private extras despite the select, to test output whitelisting.
        return { data: override ?? rows.slice(0, size), error: null }
      }).then(resolve, reject),
    }
    return query
  })
  auth.getAdminClient.mockImplementation(() => {
    expect(auth.authorized).toBe(true)
    return { from }
  })
  return { calls, from }
}

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  auth.authorized = false
  auth.requireAdmin.mockImplementation(async () => { auth.authorized = true; return {} })
  auth.getAdminClient.mockImplementation(() => { throw new Error('Unexpected remote access') })
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'applicant-export-'))
  vi.spyOn(process, 'cwd').mockReturnValue(dir)
  local = await import('@/lib/db/local')
  db = local.getLocalDb()
  ;({ getApplicantExportRows } = await import('@/server/applicant-export'))
})

afterEach(() => {
  db?.close()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('SQLite applicant export', () => {
  it('exports all rows beyond 1000 with stable newest/id order and read-only minimal queries', async () => {
    const count = 1031
    db.transaction(() => {
      for (let n = count - 1; n >= 0; n--) {
        const id = key('a', n)
        db.prepare('INSERT INTO faculties (id, name, code) VALUES (?, ?, ?)').run(key('f', n), `Faculty ${n}`, key('f', n))
        db.prepare('INSERT INTO study_programs (id, faculty_id, name, code, is_active) VALUES (?, ?, ?, ?, 0)').run(key('s', n), key('f', n), `Archived ${n}`, key('s', n))
        seed(id, { faculty: key('f', n), study_program: key('s', n), ipk: 0, semester: 0, created_at: n === count - 1 ? '2027-01-01' : '2026-01-01' })
        db.prepare('INSERT INTO selection_entries (applicant_id, year, stage) VALUES (?, 2026, ?)').run(id, 'semifinalist')
        db.prepare('INSERT INTO finalist_profiles (id, applicant_id, instagram, tahun) VALUES (?, ?, ?, ?)').run(key('p', n), id, `@profile${n}`, '2026')
      }
    })()
    db.pragma('query_only = ON')
    const prepare = vi.spyOn(db, 'prepare')
    const rows = await getApplicantExportRows()
    expect(rows).toHaveLength(count)
    expect(rows.map(a => a.id)).toEqual([key('a', count - 1), ...Array.from({ length: count - 1 }, (_, n) => key('a', n))])
    expect(rows[0]).toMatchObject({ faculty: 'Faculty 1030', study_program: 'Archived 1030', ipk: 0, semester: 0, selection_stage: 'semifinalist', instagram: '@profile1030' })
    expect(rows.at(-1)?.instagram).toBe('@profile1029')
    for (const row of rows) expect(Object.keys(row).sort()).toEqual([...fields].sort())
    expect(prepare.mock.calls).toHaveLength(6)
    for (const [sql] of prepare.mock.calls) {
      expect(sql).toMatch(/^SELECT /)
      expect(sql).not.toMatch(/\*|LIMIT|user_id|consent|_url|snapshot|bio/)
    }
    expect(auth.getAdminClient).not.toHaveBeenCalled()
  })

  it('preserves legacy status and projects only matching published finalists, keeping stage codes', async () => {
    const cases = [
      ['semi', 'verified', 2026, 'semifinalist', 2026, 'verified'],
      ['draft', 'verified', 2026, 'finalist_draft', 2026, 'verified'],
      ['published', 'verified', 2026, 'finalist', 2026, 'finalist'],
      ['unpublished', 'verified', 2025, 'finalist', 2025, 'verified'],
      ['mismatch', 'pending', 2025, 'finalist', 2026, 'pending'],
      ['legacy', 'finalist', 2024, null, null, 'finalist'],
      ['rejected', 'rejected', 2026, 'not_selected_faculty', 2026, 'rejected'],
      ['university', 'verified', 2026, 'not_selected_university', 2026, 'verified'],
    ] as const
    for (const [id, status, year, stage, entryYear] of cases) {
      seed(id, { status, selection_year: year })
      if (stage) db.prepare('INSERT INTO selection_entries (applicant_id, year, stage) VALUES (?, ?, ?)').run(id, entryYear, stage)
    }
    db.prepare('INSERT INTO selection_announcements (year, published_at) VALUES (2026, ?), (2025, NULL)').run('2026-10-01')
    const before = db.prepare('SELECT * FROM applicants ORDER BY id').all()
    db.pragma('query_only = ON')
    const rows = await getApplicantExportRows()
    for (const [id, , , stage, , status] of cases) {
      expect(rows.find(a => a.id === id)).toMatchObject({ status, selection_stage: stage })
    }
    expect(db.prepare('SELECT * FROM applicants ORDER BY id').all()).toEqual(before)
  })

  it('resolves archived catalog IDs, preserves old free text, and uses only the latest profile override', async () => {
    const archived = db.prepare('SELECT id, faculty_id, name FROM study_programs WHERE is_active = 0 ORDER BY id LIMIT 1').get() as { id: string; faculty_id: string; name: string }
    const faculty = db.prepare('SELECT name FROM faculties WHERE id = ?').get(archived.faculty_id) as { name: string }
    seed('archived', { faculty: archived.faculty_id, study_program: archived.id })
    seed('old', { faculty: 'Old Faculty', study_program: 'Old Program', instagram: '@original' })
    seed('blank', { instagram: '' })
    const profile = db.prepare('INSERT INTO finalist_profiles (id, applicant_id, instagram, tahun, created_at) VALUES (?, ?, ?, ?, ?)')
    profile.run('old-profile', 'archived', '@older', '2026', '2026-01-01')
    profile.run('latest-b', 'archived', '@tie-later-id', '2026', '2026-10-01')
    profile.run('latest-a', 'archived', '@latest', '2026', '2026-10-01')
    profile.run('old-nonempty', 'old', '@must-not-use', '2026', '2026-01-01')
    profile.run('new-empty', 'old', '', '2026', '2026-10-01')
    db.pragma('query_only = ON')
    const rows = await getApplicantExportRows()
    expect(rows.find(a => a.id === 'archived')).toMatchObject({ faculty: faculty.name, study_program: archived.name, instagram: '@latest' })
    expect(rows.find(a => a.id === 'old')).toMatchObject({ faculty: 'Old Faculty', study_program: 'Old Program', instagram: '@original' })
    expect(rows.find(a => a.id === 'blank')?.instagram).toBeNull()
  })

  it('matches the admin name/email/original-city search case-insensitively without trimming spaces', async () => {
    seed('name', { full_name: 'Alice Example', email: 'one@example.com', city: 'Manado' })
    seed('email', { full_name: 'Bob', email: 'ALICE@example.com', city: 'Tomohon' })
    seed('city', { full_name: 'Carol', email: 'three@example.com', city: 'ALICE City' })
    seed('other', { full_name: 'Other', email: 'four@example.com', city: 'Bitung', faculty: 'Alice Faculty' })
    db.pragma('query_only = ON')
    expect((await getApplicantExportRows('aLiCe')).map(a => a.id)).toEqual(['city', 'email', 'name'])
    expect((await getApplicantExportRows('alice ')).map(a => a.id)).toEqual(['city', 'name'])
    expect(await getApplicantExportRows(' alice ')).toEqual([])
    expect(await getApplicantExportRows('no matches')).toEqual([])
    expect(await getApplicantExportRows('')).toEqual(await getApplicantExportRows())
  })

  it('returns an empty export for an empty applicant table', async () => {
    db.pragma('query_only = ON')
    expect(await getApplicantExportRows()).toEqual([])
  })

  it.each(['faculties', 'study_programs'])('rejects a missing %s catalog rather than returning unresolved partial data', async table => {
    seed('one')
    db.pragma('foreign_keys = OFF')
    db.exec(`DROP TABLE ${table}`)
    db.pragma('query_only = ON')
    await expect(getApplicantExportRows()).rejects.toThrow(`no such table: ${table}`)
  })
})

describe('paginated remote applicant export', () => {
  it('paginates all six sources beyond 1000, uses minimal selects, and never leaks extra private fields', async () => {
    const { calls } = mockRemote()
    const rows = await getApplicantExportRows()
    expect(rows).toHaveLength(1001)
    expect(rows[0]).toMatchObject({ id: 'a1000', status: 'finalist', selection_stage: 'finalist', faculty: 'Faculty 1000', study_program: 'Archived program 1000', instagram: '@profile1000', ipk: 0 })
    expect(rows.map(a => a.id)).toEqual(['a1000', ...Array.from({ length: 1000 }, (_, n) => key('a', n))])
    for (const row of rows) expect(Object.keys(row).sort()).toEqual([...fields].sort())
    expect(JSON.stringify(rows)).not.toMatch(/secret|snapshot|user_id|consent|photo_url|ktp_url|private_notes/)
    for (const table of Object.keys(remoteData())) {
      const pages = calls.filter(c => c.table === table)
      const [column, prefix] = table === 'selection_announcements' ? ['year', '']
        : table === 'selection_entries' ? ['applicant_id', 'a']
          : ['id', { applicants: 'a', finalist_profiles: 'p', faculties: 'f', study_programs: 's' }[table]]
      expect(pages.map(c => c.after)).toEqual([
        undefined,
        { column, value: column === 'year' ? 2499 : key(prefix!, 499) },
        { column, value: column === 'year' ? 2999 : key(prefix!, 999) },
      ])
      expect(pages.every(c => c.size === 500)).toBe(true)
      expect(pages.every(c => JSON.stringify(c.orders) === JSON.stringify([{ column, ascending: true }]))).toBe(true)
      expect(pages.every(c => c.columns.split(',').includes(column))).toBe(true)
      expect(pages.every(c => !/\*|user_id|consent|_url|snapshot|bio/.test(c.columns))).toBe(true)
    }
    expect(calls.find(c => c.table === 'finalist_profiles')?.columns.split(',').sort()).toEqual(['applicant_id', 'instagram', 'created_at', 'id'].sort())
  })

  it('fetches the final empty page for an exact page-size multiple', async () => {
    const { calls } = mockRemote(remoteData(1000))
    expect(await getApplicantExportRows()).toHaveLength(1000)
    expect(calls.filter(c => c.table === 'applicants').map(c => c.after?.value)).toEqual([undefined, 'a0499', 'a0999'])
  })

  it.each(Object.keys(remoteData()))('rejects the entire export when the last %s page fails', async table => {
    const { calls } = mockRemote(remoteData(), { table, page: 2 })
    await expect(getApplicantExportRows()).rejects.toThrow(`Failed ${table} page 2`)
    expect(calls.filter(c => c.table === table)).toHaveLength(3)
  })

  it.each(['faculties', 'study_programs'])('rejects a missing remote %s catalog', async table => {
    mockRemote(remoteData(1), { table, page: 0 })
    await expect(getApplicantExportRows()).rejects.toThrow(`Failed ${table} page 0`)
  })

  it('normalizes absent nullable fields and searches only after all remote pages are read', async () => {
    const data = remoteData()
    data.applicants[1000].city = 'Original CITY'
    const { calls } = mockRemote(data)
    const rows = await getApplicantExportRows('original city')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: 'a1000', city: 'Original CITY', nim: null, phone: null, semester: null, weight_kg: null })
    expect(calls.filter(c => c.table === 'applicants')).toHaveLength(3)
  })

  it('sorts profiles by newest creation/id after all keyset pages, retaining latest empty-profile fallback', async () => {
    const data = remoteData()
    data.applicants[1].instagram = '@registration'
    data.finalist_profiles.push(
      { id: 'p9999', applicant_id: 'a0000', instagram: '@tie-later-id', created_at: '2028-01-01' },
      { id: 'p9998', applicant_id: 'a0000', instagram: '@latest', created_at: '2028-01-01' },
      { id: 'p9997', applicant_id: 'a0001', instagram: '', created_at: '2029-01-01' },
    )
    const { calls } = mockRemote(data)
    const rows = await getApplicantExportRows()
    expect(rows.find(a => a.id === 'a0000')?.instagram).toBe('@latest')
    expect(rows.find(a => a.id === 'a0001')?.instagram).toBe('@registration')
    expect(calls.filter(c => c.table === 'finalist_profiles')).toHaveLength(3)
  })

  it('sorts applicants with null creation dates last after loading in id order', async () => {
    const data = remoteData(3)
    data.applicants[1].created_at = null
    mockRemote(data)
    expect((await getApplicantExportRows()).map(a => a.id)).toEqual(['a0002', 'a0000', 'a0001'])
  })

  it('does not skip remaining applicants when a previously read row is deleted between pages', async () => {
    const data = remoteData()
    const originalIds = data.applicants.map(a => a.id).sort()
    mockRemote(data, undefined, (table, page) => {
      if (table === 'applicants' && page === 1) data.applicants.shift()
    })
    const rows = await getApplicantExportRows()
    expect(data.applicants).toHaveLength(1000)
    expect(rows.map(a => a.id).sort()).toEqual(originalIds)
    expect(rows.some(a => a.id === 'a0500')).toBe(true)
  })

  it('does not duplicate applicants or include an insert behind the cursor between pages', async () => {
    const data = remoteData()
    const originalIds = data.applicants.map(a => a.id).sort()
    mockRemote(data, undefined, (table, page) => {
      if (table === 'applicants' && page === 1) {
        data.applicants.push({ ...data.applicants[0], id: 'a0000-before' })
      }
    })
    const rows = await getApplicantExportRows()
    expect(data.applicants).toHaveLength(1002)
    expect(rows.map(a => a.id).sort()).toEqual(originalIds)
    expect(new Set(rows.map(a => a.id)).size).toBe(rows.length)
  })

  it('can include an insert ahead of the cursor: pagination is not an exact snapshot', async () => {
    const data = remoteData()
    mockRemote(data, undefined, (table, page) => {
      if (table === 'applicants' && page === 1) {
        data.applicants.push({ ...data.applicants[0], id: 'a0750-after' })
      }
    })
    const rows = await getApplicantExportRows()
    expect(rows).toHaveLength(1002)
    expect(rows.map(a => a.id).sort()).toEqual(data.applicants.map(a => a.id).sort())
    expect(new Set(rows.map(a => a.id)).size).toBe(rows.length)
  })

  it.each([
    { name: 'missing key', table: 'applicants', page: 0, records: [{}] },
    { name: 'empty key', table: 'applicants', page: 0, records: [{ id: '' }] },
    { name: 'null key', table: 'applicants', page: 0, records: [{ id: null }] },
    { name: 'numeric id', table: 'applicants', page: 0, records: [{ id: 123 }] },
    { name: 'string year', table: 'selection_announcements', page: 0, records: [{ year: '2026' }] },
    { name: 'nonfinite year', table: 'selection_announcements', page: 0, records: [{ year: Infinity }] },
    { name: 'fractional year', table: 'selection_announcements', page: 0, records: [{ year: 2026.5 }] },
    { name: 'duplicate key', table: 'applicants', page: 0, records: [{ id: 'a0000' }, { id: 'a0000' }] },
    { name: 'out-of-order keys', table: 'applicants', page: 1, records: [{ id: 'a0501' }, { id: 'a0500' }] },
    { name: 'nonadvancing page', table: 'applicants', page: 1, records: [{ id: 'a0499' }] },
    { name: 'backward page', table: 'applicants', page: 1, records: [{ id: 'a0000' }] },
    { name: 'replayed full page', table: 'applicants', page: 1, records: Array.from({ length: 500 }, (_, n) => ({ id: key('a', n) })) },
    { name: 'nonadvancing numeric cursor', table: 'selection_announcements', page: 1, records: [{ year: 2499 }] },
    { name: 'missing final-page profile key', table: 'finalist_profiles', page: 2, records: [{ applicant_id: 'a1000' }] },
  ])('rejects $name rather than returning partial rows or looping', async ({ table, page, records }) => {
    const { calls } = mockRemote(remoteData(), undefined, (source, currentPage) => {
      if (source === table && currentPage === page) return records
    })
    await expect(getApplicantExportRows()).rejects.toThrow(`Invalid export cursor: ${table}`)
    expect(calls.filter(c => c.table === table)).toHaveLength(page + 1)
  })
})

describe.each(['local', 'remote'])('%s export authorization', mode => {
  it.each(['Unauthorized', 'Forbidden'])('rejects %s before any database/client access', async message => {
    if (mode === 'remote') mockRemote(remoteData(1))
    auth.requireAdmin.mockRejectedValue(new Error(message))
    const getLocalDb = vi.spyOn(local, 'getLocalDb')
    const prepare = vi.spyOn(db, 'prepare')
    await expect(getApplicantExportRows('Alice')).rejects.toThrow(message)
    expect(getLocalDb).not.toHaveBeenCalled()
    expect(prepare).not.toHaveBeenCalled()
    expect(auth.getAdminClient).not.toHaveBeenCalled()
  })

  it('awaits authorization completion before opening any database or client', async () => {
    if (mode === 'remote') mockRemote(remoteData(1))
    let authorize!: () => void
    auth.requireAdmin.mockImplementation(() => new Promise<void>(resolve => {
      authorize = () => { auth.authorized = true; resolve() }
    }))
    const getLocalDb = vi.spyOn(local, 'getLocalDb')
    const prepare = vi.spyOn(db, 'prepare')
    const result: Promise<ApplicantExportRow[]> = getApplicantExportRows()
    expect(getLocalDb).not.toHaveBeenCalled()
    expect(prepare).not.toHaveBeenCalled()
    expect(auth.getAdminClient).not.toHaveBeenCalled()
    authorize()
    await result
    expect(auth.requireAdmin).toHaveBeenCalledOnce()
    expect(mode === 'local' ? getLocalDb : auth.getAdminClient).toHaveBeenCalledOnce()
  })
})
