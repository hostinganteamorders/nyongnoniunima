import { afterEach, expect, it, vi } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

let root: string
let db: Database.Database | undefined
afterEach(() => {
  db?.close()
  vi.restoreAllMocks()
  vi.resetModules()
  if (root) fs.rmSync(root, { recursive: true, force: true })
})

it('adds selection_year to an existing SQLite DB without rebuilding status checks and preserves selection on reopen', async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'selection-migration-'))
  fs.mkdirSync(path.join(root, 'data'))
  db = new Database(path.join(root, 'data/nyong-noni.db'))
  db.exec(`CREATE TABLE applicants (id TEXT PRIMARY KEY, status TEXT CHECK (status IN ('pending', 'verified', 'rejected', 'finalist')), created_at TEXT);
    CREATE TABLE finalist_profiles (id TEXT PRIMARY KEY, applicant_id TEXT, tahun TEXT, created_at TEXT);
    INSERT INTO applicants VALUES ('valid', 'finalist', '2020-01-01'), ('invalid', 'finalist', '2021-01-01'), ('no-profile', 'verified', '2022-01-01'), ('partial', 'pending', '2023-01-01');
    INSERT INTO finalist_profiles VALUES ('p1', 'valid', '2025', '2025-01-01'), ('p2', 'invalid', 'garbage', '2025-01-01'), ('p3', 'partial', '2026abc', '2025-01-01');`)
  const oldSql = (db.prepare("SELECT sql FROM sqlite_master WHERE name = 'applicants'").get() as { sql: string }).sql
  db.close()
  vi.spyOn(process, 'cwd').mockReturnValue(root)
  vi.resetModules()
  db = (await import('@/lib/db/local')).getLocalDb()
  expect(db.prepare('SELECT id, selection_year FROM applicants ORDER BY id').all()).toEqual([
    { id: 'invalid', selection_year: 2021 }, { id: 'no-profile', selection_year: 2022 },
    { id: 'partial', selection_year: 2023 }, { id: 'valid', selection_year: 2025 },
  ])
  expect((db.prepare("SELECT sql FROM sqlite_master WHERE name = 'applicants'").get() as { sql: string }).sql).toContain(oldSql.slice(0, -1))
  db.prepare("INSERT INTO selection_entries VALUES ('no-profile', 2022, 'not_selected_university', '2022-10-01T00:00:00Z')").run()
  db.close()
  vi.resetModules()
  db = (await import('@/lib/db/local')).getLocalDb()
  expect(db.prepare("SELECT * FROM selection_entries WHERE applicant_id = 'no-profile'").get()).toEqual({ applicant_id: 'no-profile', year: 2022, stage: 'not_selected_university', semifinalist_at: '2022-10-01T00:00:00Z' })
  expect(db.prepare("SELECT status FROM applicants WHERE id = 'valid'").get()).toEqual({ status: 'finalist' })
})

it('migrates legacy required/defaulted applicant fields while preserving children, indexes and foreign keys on reopen', async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'manual-semifinalist-migration-'))
  fs.mkdirSync(path.join(root, 'data'))
  db = new Database(path.join(root, 'data/nyong-noni.db'))
  db.pragma('foreign_keys = ON')
  db.exec(`CREATE TABLE applicants (
      id TEXT PRIMARY KEY, full_name TEXT NOT NULL, phone TEXT NOT NULL,
      email TEXT NOT NULL, date_of_birth TEXT NOT NULL, address TEXT NOT NULL,
      city TEXT NOT NULL, province TEXT NOT NULL,
      height_cm REAL NOT NULL DEFAULT 0, weight_kg REAL NOT NULL DEFAULT 0,
      occupation TEXT NOT NULL DEFAULT '', education TEXT NOT NULL DEFAULT '',
      faculty TEXT, gender TEXT CHECK (gender IN ('Laki-laki', 'Perempuan')),
      consent INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'finalist')),
      selection_year INTEGER, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX legacy_applicant_phone ON applicants(phone);
    CREATE TABLE finalist_profiles (
      id TEXT PRIMARY KEY, applicant_id TEXT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
      tahun TEXT NOT NULL, bio TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE selection_entries (
      applicant_id TEXT PRIMARY KEY REFERENCES applicants(id) ON DELETE CASCADE,
      year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
      stage TEXT NOT NULL CHECK (stage IN ('semifinalist', 'finalist_draft', 'finalist', 'not_selected_faculty', 'not_selected_university')),
      semifinalist_at TEXT
    );
    INSERT INTO applicants (id, full_name, phone, email, date_of_birth, address, city, province,
      height_cm, weight_kg, occupation, education, faculty, gender, consent, status, selection_year, created_at)
      VALUES ('legacy', 'Legacy Finalist', '081320000201', 'legacy@example.com', '2004-05-15', 'Original address',
        'Manado', 'Sulut', 175, 65, 'Mahasiswa', 'S1', 'ft', 'Perempuan', 1, 'finalist', 2025, '2025-01-01');
    INSERT INTO finalist_profiles VALUES ('profile', 'legacy', '2025', 'Original bio', '2025-01-01');
    INSERT INTO selection_entries VALUES ('legacy', 2025, 'finalist', '2025-10-01T00:00:00Z');`)
  const original = db.prepare('SELECT * FROM applicants').all()
  const profiles = db.prepare('SELECT * FROM finalist_profiles').all()
  const entries = db.prepare('SELECT * FROM selection_entries').all()
  const index = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'legacy_applicant_phone'").get()
  db.close()
  vi.spyOn(process, 'cwd').mockReturnValue(root)
  vi.resetModules()
  db = (await import('@/lib/db/local')).getLocalDb()
  const nullable = ['email', 'date_of_birth', 'address', 'city', 'province', 'height_cm', 'weight_kg', 'occupation', 'education']
  const columns = db.prepare('PRAGMA table_info(applicants)').all() as { name: string; notnull: number; dflt_value: unknown }[]
  expect(columns.filter(column => nullable.includes(column.name))).toHaveLength(nullable.length)
  for (const column of columns.filter(column => nullable.includes(column.name))) {
    expect(column).toMatchObject({ notnull: 0, dflt_value: null })
  }
  expect(db.prepare('SELECT * FROM applicants').all()).toEqual(original)
  expect(db.prepare('SELECT * FROM finalist_profiles').all()).toEqual(profiles)
  expect(db.prepare('SELECT * FROM selection_entries').all()).toEqual(entries)
  expect(db.prepare("SELECT sql FROM sqlite_master WHERE name = 'legacy_applicant_phone'").get()).toEqual(index)
  expect(db.pragma('foreign_keys', { simple: true })).toBe(1)
  expect(db.pragma('foreign_key_check')).toEqual([])
  db.prepare(`INSERT INTO applicants (id, full_name, phone, faculty, gender, selection_year, status)
    VALUES ('manual', 'Manual Semifinalist', '081320000202', 'ft', 'Laki-laki', 2026, 'verified')`).run()
  const manual = db.prepare("SELECT * FROM applicants WHERE id = 'manual'").get() as Record<string, unknown>
  for (const field of nullable) expect(manual[field]).toBeNull()
  expect(manual.consent).toBe(0)
  expect(() => db!.prepare("INSERT INTO applicants (id, full_name, phone, status) VALUES ('invalid', 'Invalid', '081320000203', 'unknown')").run()).toThrow(/CHECK/)
  expect(() => db!.prepare("INSERT INTO finalist_profiles VALUES ('orphan', 'missing', '2026', NULL, '2026-01-01')").run()).toThrow(/FOREIGN KEY/)
  expect(() => db!.prepare("INSERT INTO selection_entries VALUES ('missing', 2026, 'semifinalist', NULL)").run()).toThrow(/FOREIGN KEY/)
  const schema = db.prepare("SELECT type, name, sql FROM sqlite_master WHERE tbl_name IN ('applicants', 'finalist_profiles', 'selection_entries') ORDER BY type, name").all()
  db.close()
  vi.resetModules()
  db = (await import('@/lib/db/local')).getLocalDb()
  expect(db.prepare("SELECT type, name, sql FROM sqlite_master WHERE tbl_name IN ('applicants', 'finalist_profiles', 'selection_entries') ORDER BY type, name").all()).toEqual(schema)
  expect(db.prepare("SELECT * FROM applicants WHERE id = 'legacy'").all()).toEqual(original)
  expect(db.prepare("SELECT * FROM applicants WHERE id = 'manual'").get()).toEqual(manual)
  expect(db.prepare('SELECT * FROM finalist_profiles').all()).toEqual(profiles)
  expect(db.prepare('SELECT * FROM selection_entries').all()).toEqual(entries)
  expect(db.pragma('foreign_keys', { simple: true })).toBe(1)
  expect(db.pragma('foreign_key_check')).toEqual([])
  db.prepare("DELETE FROM applicants WHERE id = 'legacy'").run()
  expect(db.prepare('SELECT * FROM finalist_profiles').all()).toEqual([])
  expect(db.prepare('SELECT * FROM selection_entries').all()).toEqual([])
})
