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
