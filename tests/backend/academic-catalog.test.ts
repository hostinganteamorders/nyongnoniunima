import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const project = process.cwd()
const expected = {
  FIKKM: ['Ilmu Keolahragaan', 'Pendidikan Kepelatihan Olahraga', 'Pendidikan Jasmani, Kesehatan dan Rekreasi', 'Ilmu Kesehatan Masyarakat'],
  FIPP: ['Pendidikan Guru Sekolah Dasar', 'Psikologi', 'Pendidikan Anak Usia Dini', 'Bimbingan Konseling', 'Pendidikan Khusus'],
  FISH: ['Pendidikan Geografi', 'Geografi', 'Ilmu Administrasi Negara', 'Sosiologi', 'Ilmu Hukum', 'Pendidikan IPS', 'Pendidikan Sejarah', 'PPKn'],
  FMIPAK: ['Pendidikan Kimia', 'Kimia', 'Pendidikan Biologi', 'Biologi', 'Pendidikan Fisika', 'Fisika', 'Pendidikan Geofisika', 'Ilmu Lingkungan', 'Pendidikan Matematika', 'Pendidikan IPA'],
  FEB: ['Akuntansi', 'Manajemen', 'Ilmu Ekonomi', 'Pendidikan Ekonomi', 'D3 Manajemen Perusahaan'],
  FBS: ['Bahasa dan Sastra Inggris', 'Pendidikan Bahasa dan Sastra Indonesia', 'Pendidikan Bahasa Inggris', 'Pendidikan Bahasa Jepang', 'Pendidikan Bahasa Jerman', 'Pendidikan Bahasa Prancis', 'Pendidikan Bahasa dan Sastra Mandarin', 'Pendidikan Seni Rupa'],
  FT: ['Pendidikan Kesejahteraan Keluarga', 'Teknik Sipil', 'Pendidikan Teknik Elektro', 'Teknik Mesin', 'Pendidikan Teknik Mesin', 'Teknik Informatika', 'Pendidikan Teknik Informatika dan Komunikasi'],
  FK: ['Kedokteran', 'Pendidikan Profesi Dokter'],
}
const facultySeeds = [
  ['fip', 'FIPP', 'FIP', 'Fakultas Ilmu Pendidikan dan Psikologi'],
  ['fbs', 'FBS', 'FBS', 'Fakultas Bahasa dan Seni'],
  ['fish', 'FISH', 'FISH', 'Fakultas Ilmu Sosial dan Hukum'],
  ['fmipa', 'FMIPAK', 'FMIPA', 'Fakultas MIPA dan Kebumian'],
  ['ft', 'FT', 'FT', 'Fakultas Teknik'],
  ['fe', 'FEB', 'FE', 'Fakultas Ekonomi dan Bisnis'],
  ['fok', 'FIKKM', 'FOK', 'Fakultas Ilmu Keolahragaan dan Kesehatan Masyarakat'],
  ['fk', 'FK', 'FK', 'Fakultas Kedokteran'],
]
let root: string
let db: Database.Database

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'academic-catalog-'))
  fs.mkdirSync(path.join(root, 'data'))
  db = new Database(path.join(root, 'data/nyong-noni.db'))
  db.pragma('foreign_keys = ON')
  vi.spyOn(process, 'cwd').mockReturnValue(root)
})
afterEach(() => {
  if (db?.open) db.close()
  vi.restoreAllMocks()
  vi.resetModules()
  fs.rmSync(root, { recursive: true, force: true })
})

async function reopen() {
  if (db.open) db.close()
  vi.resetModules()
  db = (await import('@/lib/db/local')).getLocalDb()
}

function assertCatalog() {
  expect(db.prepare('SELECT count(*) AS n FROM faculties').get()).toEqual({ n: 8 })
  expect(db.prepare('SELECT count(*) AS n FROM study_programs').get()).toEqual({ n: 52 })
  expect(db.prepare('SELECT count(*) AS n FROM study_programs WHERE is_active = 1').get()).toEqual({ n: 49 })
  for (const [code, names] of Object.entries(expected)) {
    const rows = db.prepare(`SELECT p.name FROM study_programs p JOIN faculties f ON f.id = p.faculty_id
      WHERE f.code = ? AND p.is_active = 1`).all(code) as { name: string }[]
    expect(rows.map(r => r.name).sort(), code).toEqual([...names].sort())
  }
  expect(db.prepare(`SELECT code, name FROM faculties WHERE code IN ('FIKKM', 'FMIPAK') ORDER BY code`).all()).toEqual([
    { code: 'FIKKM', name: 'Fakultas Ilmu Keolahragaan dan Kesehatan' },
    { code: 'FMIPAK', name: 'Fakultas Matematika, Ilmu Pengetahuan Alam dan Kebumian' },
  ])
  expect(db.prepare('SELECT code FROM study_programs WHERE is_active = 0 ORDER BY code').all()).toEqual([
    { code: 'IS' }, { code: 'PTB' }, { code: 'Sendratasik' },
  ])
  const newCodes = ['IKM', 'PSI', 'GEO', 'IAN', 'SOS', 'PIPS', 'PGF', 'IL', 'IE', 'D3MP',
    'BSI', 'PBJ', 'PBJER', 'PBP', 'PBSM', 'PSR', 'PKK', 'TS', 'TM']
  const activeCodes = (db.prepare('SELECT code FROM study_programs WHERE is_active = 1').all() as { code: string }[]).map(r => r.code)
  expect(activeCodes).toEqual(expect.arrayContaining(newCodes))
  expect(db.pragma('foreign_key_check')).toEqual([])
}

function seedLegacy(customIds = false, aliases = false) {
  db.exec(`CREATE TABLE faculties (id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT NOT NULL UNIQUE, created_at TEXT DEFAULT '2020-01-01');
    CREATE TABLE study_programs (id TEXT PRIMARY KEY, faculty_id TEXT NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
      name TEXT NOT NULL, code TEXT NOT NULL UNIQUE, created_at TEXT DEFAULT '2020-01-01');
    CREATE TABLE applicants (id TEXT PRIMARY KEY, faculty TEXT, study_program TEXT, status TEXT DEFAULT 'finalist', created_at TEXT DEFAULT '2020-01-01');
    CREATE TABLE finalist_profiles (id TEXT PRIMARY KEY, applicant_id TEXT REFERENCES applicants(id), tahun TEXT, bio TEXT, created_at TEXT);
    CREATE TABLE titleholders (id TEXT PRIMARY KEY, faculty TEXT, study_program TEXT, category TEXT CHECK (category IN ('Duta Kesehatan', 'Juara Utama')));
    CREATE TABLE current_titleholders (id TEXT PRIMARY KEY, faculty TEXT, study_program TEXT, title TEXT CHECK (title IN ('Nyong Duta Kesehatan', 'Nyong UNIMA')));
    CREATE TABLE faculty_whatsapp_groups (year INTEGER, faculty_id TEXT REFERENCES faculties(id), invite_url TEXT, PRIMARY KEY (year, faculty_id));
    CREATE TABLE selection_entries (applicant_id TEXT PRIMARY KEY REFERENCES applicants(id), year INTEGER, stage TEXT, semifinalist_at TEXT);
    CREATE TABLE selection_announcements (year INTEGER PRIMARY KEY, title TEXT, body TEXT, published_at TEXT, snapshot_json TEXT);`)
  for (const [id, code, legacy, name] of facultySeeds) {
    db.prepare('INSERT INTO faculties (id, code, name) VALUES (?, ?, ?)').run(customIds ? `custom-${id}` : id, aliases ? legacy : code, name)
  }
  // Read the shipped 33-program seed, not the new catalog, to exercise a real upgrade.
  const oldSql = fs.readFileSync(path.join(project, 'supabase/migrations/00003_unima_schema.sql'), 'utf8')
  const seed = oldSql.slice(oldSql.indexOf('-- Seed study programs'), oldSql.indexOf('-- Seed default settings'))
  const programs = [...seed.matchAll(/\('([^']+)', '([^']+)', '([^']+)'\)/g)]
  expect(programs).toHaveLength(33)
  for (const [, legacy, name, code] of programs) {
    const faculty = facultySeeds.find(f => f[2] === legacy)!
    const id = `${faculty[0]}_${code.toLowerCase()}`
    db.prepare('INSERT INTO study_programs (id, faculty_id, name, code) VALUES (?, ?, ?, ?)')
      .run(customIds ? `custom-${id}` : id, customIds ? `custom-${faculty[0]}` : faculty[0], name, code)
  }
  const prefix = customIds ? 'custom-' : ''
  for (const [id, faculty, program] of [['social', 'fish', 'fish_is'], ['arts', 'fbs', 'fbs_sendratasik'], ['building', 'ft', 'ft_ptb']]) {
    db.prepare('INSERT INTO applicants (id, faculty, study_program) VALUES (?, ?, ?)').run(id, `${prefix}${faculty}`, `${prefix}${program}`)
    db.prepare('INSERT INTO finalist_profiles VALUES (?, ?, ?, ?, ?)').run(`profile-${id}`, id, '2026', 'Original bio', '2026-01-01')
    db.prepare('INSERT INTO selection_entries VALUES (?, 2026, ?, ?)').run(id, 'finalist', '2026-01-01')
  }
  const labels = ['FIKKM', 'FOK', 'Fakultas Ilmu Keolahragaan dan Kesehatan Masyarakat', 'Fakultas Olahraga dan Kesehatan',
    'FMIPAK', 'FMIPA', 'Fakultas MIPA dan Kebumian', 'Fakultas Matematika dan Ilmu Pengetahuan Alam', '00000000-0000-0000-0000-000000000001']
  for (const [i, label] of labels.entries()) {
    for (const table of ['applicants', 'titleholders', 'current_titleholders']) {
      db.prepare(`INSERT INTO ${table} (id, faculty, study_program) VALUES (?, ?, ?)`).run(`label-${i}`, ` ${label} `, 'Original program')
    }
  }
  db.prepare('INSERT INTO faculty_whatsapp_groups VALUES (2026, ?, ?)').run(`${prefix}fok`, 'https://chat.whatsapp.com/unchanged')
  db.prepare('INSERT INTO selection_announcements VALUES (2026, ?, ?, ?, ?)').run('Published', 'Body', '2026-01-01', '[{"faculty":"Fakultas MIPA dan Kebumian","study_program":"Ilmu Sosial"}]')
}

it('seeds exactly 49 active programs and three readable archives on a fresh SQLite DB', async () => {
  await reopen()
  assertCatalog()
  expect(db.prepare("SELECT id FROM study_programs WHERE code = 'PGSD'").get()).toEqual({ id: 'fip_pgsd' })
  const column = (db.pragma('table_info(study_programs)') as { name: string; notnull: number; dflt_value: string }[]).find(c => c.name === 'is_active')!
  expect(column).toMatchObject({ notnull: 1, dflt_value: '1' })
})

it.each([[false, false], [true, false], [true, true]])('upgrades the old 33 rows in place (custom IDs %s, legacy codes %s)', async (customIds, aliases) => {
  seedLegacy(customIds, aliases)
  const before = db.prepare('SELECT id, faculty_id, code, created_at FROM study_programs ORDER BY code').all() as { id: string; code: string }[]
  const facultyIds = db.prepare('SELECT id, created_at FROM faculties ORDER BY id').all()
  const unchangedTables = ['finalist_profiles', 'selection_entries', 'faculty_whatsapp_groups', 'selection_announcements']
  const originals = unchangedTables.map(t => db.prepare(`SELECT * FROM ${t}`).all())
  await reopen()
  assertCatalog()
  for (const row of before) expect(db.prepare('SELECT id, faculty_id, code, created_at FROM study_programs WHERE code = ?').get(row.code)).toEqual(row)
  expect(db.prepare('SELECT id, created_at FROM faculties ORDER BY id').all()).toEqual(facultyIds)
  for (const [i, table] of unchangedTables.entries()) expect(db.prepare(`SELECT * FROM ${table}`).all()).toEqual(originals[i])
  const archived = db.prepare(`SELECT a.id, p.code, p.name, p.is_active FROM applicants a
    JOIN study_programs p ON p.id = a.study_program WHERE a.id IN ('social', 'arts', 'building') ORDER BY a.id`).all()
  expect(archived).toEqual([
    { id: 'arts', code: 'Sendratasik', name: 'Pendidikan Seni Drama, Tari dan Musik', is_active: 0 },
    { id: 'building', code: 'PTB', name: 'Pendidikan Teknik Bangunan', is_active: 0 },
    { id: 'social', code: 'IS', name: 'Ilmu Sosial', is_active: 0 },
  ])
  for (const table of ['applicants', 'titleholders', 'current_titleholders']) {
    const labels = db.prepare(`SELECT faculty, study_program FROM ${table} WHERE id LIKE 'label-%' ORDER BY id`).all() as { faculty: string; study_program: string }[]
    expect(labels.map(r => r.faculty)).toEqual([
      ...Array(4).fill('Fakultas Ilmu Keolahragaan dan Kesehatan'),
      ...Array(4).fill('Fakultas Matematika, Ilmu Pengetahuan Alam dan Kebumian'),
      ' 00000000-0000-0000-0000-000000000001 ',
    ])
    expect(labels.every(r => r.study_program === 'Original program')).toBe(true)
  }
  // Explicit rerun, followed by a normal reopen: neither creates new IDs or rows.
  const catalog = db.prepare('SELECT * FROM study_programs ORDER BY code').all()
  db.exec("DELETE FROM schema_migrations WHERE version = '00011_academic_catalog'")
  await reopen()
  expect(db.prepare('SELECT * FROM study_programs ORDER BY code').all()).toEqual(catalog)
  db.exec("UPDATE study_programs SET name = 'User label', is_active = 0 WHERE code = 'TI'; UPDATE faculties SET name = 'User faculty' WHERE code = 'FIKKM'")
  await reopen()
  expect(db.prepare("SELECT name, is_active FROM study_programs WHERE code = 'TI'").get()).toEqual({ name: 'User label', is_active: 0 })
  expect(db.prepare("SELECT name FROM faculties WHERE code = 'FIKKM'").get()).toEqual({ name: 'User faculty' })
  for (const [i, table] of unchangedTables.entries()) expect(db.prepare(`SELECT * FROM ${table}`).all()).toEqual(originals[i])
})

it.each(['FOK', 'FIKKM', 'FMIPA', 'FMIPAK', 'Fakultas Ilmu Keolahragaan dan Kesehatan Masyarakat',
  'Fakultas Olahraga dan Kesehatan', 'Fakultas MIPA dan Kebumian', 'Fakultas Matematika dan Ilmu Pengetahuan Alam'])(
  'preserves exact faculty ID references even when the ID is a recognized label (%s)', async facultyId => {
    seedLegacy()
    db.transaction(() => {
      db.pragma('defer_foreign_keys = ON')
      db.prepare("UPDATE faculties SET id = ? WHERE id = 'fbs'").run(facultyId)
      db.prepare("UPDATE study_programs SET faculty_id = ? WHERE faculty_id = 'fbs'").run(facultyId)
      db.prepare("UPDATE applicants SET faculty = ? WHERE faculty = 'fbs'").run(facultyId)
      for (const table of ['applicants', 'titleholders', 'current_titleholders']) {
        db.prepare(`INSERT INTO ${table} (id, faculty, study_program) VALUES ('real-reference', ?, 'fbs_pbi')`).run(facultyId)
      }
      db.prepare('INSERT INTO faculty_whatsapp_groups VALUES (2027, ?, ?)').run(facultyId, 'https://chat.whatsapp.com/preserved')
    })()
    const unchanged = ['finalist_profiles', 'selection_entries', 'faculty_whatsapp_groups', 'selection_announcements']
    const before = unchanged.map(table => db.prepare(`SELECT * FROM ${table}`).all())
    for (let pass = 0; pass < 2; pass++) {
      await reopen()
      assertCatalog()
      for (const table of ['applicants', 'titleholders', 'current_titleholders']) {
        expect(db.prepare(`SELECT faculty, study_program FROM ${table} WHERE id = 'real-reference'`).get())
          .toEqual({ faculty: facultyId, study_program: 'fbs_pbi' })
        expect(db.prepare(`SELECT f.code FROM ${table} t JOIN faculties f ON f.id = t.faculty WHERE t.id = 'real-reference'`).get())
          .toEqual({ code: 'FBS' })
      }
      // Whitespace-wrapped labels are not exact IDs and must still normalize.
      expect(db.prepare("SELECT faculty FROM applicants WHERE id = 'label-0'").get())
        .toEqual({ faculty: 'Fakultas Ilmu Keolahragaan dan Kesehatan' })
      expect(db.prepare("SELECT faculty FROM applicants WHERE id = 'label-4'").get())
        .toEqual({ faculty: 'Fakultas Matematika, Ilmu Pengetahuan Alam dan Kebumian' })
      for (const [i, table] of unchanged.entries()) expect(db.prepare(`SELECT * FROM ${table}`).all()).toEqual(before[i])
      db.exec("DELETE FROM schema_migrations WHERE version = '00011_academic_catalog'")
    }
  },
)

it('allocates a UUID for an occupied new-program ID without replacing existing program IDs or references', async () => {
  seedLegacy()
  db.exec("UPDATE study_programs SET id = 'fip_psi' WHERE code = 'PGSD'; UPDATE study_programs SET id = 'fip_pgsd' WHERE code = 'PBio'")
  for (const table of ['applicants', 'titleholders', 'current_titleholders']) {
    db.prepare(`INSERT INTO ${table} (id, faculty, study_program) VALUES ('program-reference', 'fip', 'fip_psi')`).run()
  }
  const oldPrograms = db.prepare('SELECT id, faculty_id, code, created_at FROM study_programs ORDER BY code').all() as { code: string }[]
  const snapshot = db.prepare('SELECT * FROM selection_announcements').all()
  await reopen()
  assertCatalog()
  for (const row of oldPrograms) expect(db.prepare('SELECT id, faculty_id, code, created_at FROM study_programs WHERE code = ?').get(row.code)).toEqual(row)
  const psi = db.prepare("SELECT id FROM study_programs WHERE code = 'PSI'").get() as { id: string }
  expect(psi.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  expect(db.prepare("SELECT id FROM study_programs WHERE code = 'IKM'").get()).toEqual({ id: 'fok_ikm' })
  const programs = db.prepare('SELECT * FROM study_programs ORDER BY code').all()
  db.exec("DELETE FROM schema_migrations WHERE version = '00011_academic_catalog'")
  await reopen()
  expect(db.prepare('SELECT * FROM study_programs ORDER BY code').all()).toEqual(programs)
  for (const table of ['applicants', 'titleholders', 'current_titleholders']) {
    expect(db.prepare(`SELECT t.study_program, p.code FROM ${table} t JOIN study_programs p ON p.id = t.study_program WHERE t.id = 'program-reference'`).get())
      .toEqual({ study_program: 'fip_psi', code: 'PGSD' })
  }
  expect(db.prepare('SELECT * FROM selection_announcements').all()).toEqual(snapshot)
})

it('rejects a program-code collision in another faculty and rolls back the catalog transaction', async () => {
  seedLegacy()
  db.exec("UPDATE study_programs SET faculty_id = 'ft' WHERE code = 'PGSD'")
  const programs = db.prepare('SELECT * FROM study_programs ORDER BY code').all()
  const faculties = db.prepare('SELECT * FROM faculties ORDER BY code').all()
  await expect(reopen()).rejects.toThrow('PGSD belongs to another faculty')
  // Initialization threw, so inspect with a separate connection rather than its cached handle.
  db = new Database(path.join(root, 'data/nyong-noni.db'))
  expect(db.prepare('SELECT * FROM study_programs ORDER BY code').all()).toEqual(programs)
  expect(db.prepare('SELECT * FROM faculties ORDER BY code').all()).toEqual(faculties)
  expect(db.prepare("SELECT name FROM pragma_table_info('study_programs') WHERE name = 'is_active'").get()).toBeUndefined()
})

it('rejects ambiguous legacy/canonical faculties without merging them', async () => {
  seedLegacy()
  db.exec("INSERT INTO faculties (id, code, name) VALUES ('other-fip', 'FIP', 'Other faculty')")
  await expect(reopen()).rejects.toThrow('Ambiguous faculty codes: FIPP')
  db = new Database(path.join(root, 'data/nyong-noni.db'))
  expect(db.prepare('SELECT count(*) AS n FROM faculties').get()).toEqual({ n: 9 })
  expect(db.prepare('SELECT count(*) AS n FROM study_programs').get()).toEqual({ n: 33 })
})

it('keeps the setup catalog suffix identical to migration 00011', () => {
  const setup = fs.readFileSync(path.join(project, 'supabase/setup.sql'), 'utf8')
  const migration = fs.readFileSync(path.join(project, 'supabase/migrations/00011_academic_catalog.sql'), 'utf8')
  expect(setup.slice(setup.indexOf('-- Preserve catalog IDs'))).toBe(migration)
  const normalize = (sql: string) => sql.split('\n').filter(line => line.trim() && !line.trim().startsWith('--')).join('\n').trim()
  const selection = fs.readFileSync(path.join(project, 'supabase/migrations/00010_staged_selection.sql'), 'utf8')
  expect(normalize(setup.slice(setup.indexOf('-- Bagian 6:'), setup.indexOf('-- Bagian 7:')))).toBe(normalize(selection))
})
