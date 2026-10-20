import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import os from 'os'

const OLD_TITLEHOLDERS_SQL = `
  CREATE TABLE titleholders (
    id TEXT PRIMARY KEY,
    tahun INTEGER NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Juara Utama', 'Other')),
    nyong_name TEXT NOT NULL,
    noni_name TEXT NOT NULL,
    region TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`

const OLD_CURRENT_SQL = `
  CREATE TABLE current_titleholders (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL CHECK (title IN ('Nyong UNIMA', 'Noni UNIMA')),
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`

describe('local schema category migration', () => {
  let tmpDir: string
  let prevCwd: string

  beforeEach(() => {
    prevCwd = process.cwd()
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nn-local-db-'))
    fs.mkdirSync(path.join(tmpDir, 'data'))
    const legacy = new Database(path.join(tmpDir, 'data', 'nyong-noni.db'))
    legacy.exec(OLD_TITLEHOLDERS_SQL)
    legacy.exec(OLD_CURRENT_SQL)
    legacy
      .prepare(
        `INSERT INTO titleholders (id, tahun, category, nyong_name, noni_name, region, sort_order)
         VALUES ('t-old', 2025, 'Juara Utama', 'Lama Nyong', 'Lama Noni', 'Manado', 1)`
      )
      .run()
    legacy
      .prepare(
        `INSERT INTO current_titleholders (id, title, name, sort_order)
         VALUES ('c-old', 'Nyong UNIMA', 'Pemegang Lama', 1)`
      )
      .run()
    legacy.close()
    process.chdir(tmpDir)
  })

  afterEach(() => {
    process.chdir(prevCwd)
    vi.resetModules()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('rebuilds stale tables, preserves rows, accepts new categories afterwards', async () => {
    vi.resetModules()
    const { getLocalDb, localQuery, localInsert } = await import('@/lib/db/local')

    const db = getLocalDb()
    const titleholdersSql = (
      db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='titleholders'`).get() as any
    ).sql as string
    const currentSql = (
      db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='current_titleholders'`).get() as any
    ).sql as string

    expect(titleholdersSql).toContain("'Duta Kesehatan'")
    expect(titleholdersSql).toContain("'Duta Pendidikan'")
    expect(currentSql).toContain("'Nyong Duta Kesehatan'")
    expect(currentSql).toContain("'Nyong Duta Pendidikan'")

    const preserved = localQuery<any>('titleholders', {})
    expect(preserved).toHaveLength(1)
    expect(preserved[0].nyong_name).toBe('Lama Nyong')

    localInsert('titleholders', {
      id: 't-new',
      tahun: 2026,
      category: 'Duta Kesehatan',
      nyong_name: 'Baru Nyong',
      noni_name: 'Baru Noni',
      region: 'Manado',
      sort_order: 0,
    })
    localInsert('current_titleholders', {
      id: 'c-new',
      title: 'Nyong Duta Pendidikan',
      name: 'Baru Pemegang',
      sort_order: 0,
    })

    expect(localQuery<any>('titleholders', {})).toHaveLength(2)
    expect(localQuery<any>('current_titleholders', {})).toHaveLength(2)
  })

  it('is a no-op on a fresh database created with the current schema', async () => {
    vi.resetModules()
    const { getLocalDb } = await import('@/lib/db/local')
    const db = getLocalDb()
    const sql = (
      db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='titleholders'`).get() as any
    ).sql as string
    expect(sql).toContain("'Duta Kesehatan'")
  })
})
