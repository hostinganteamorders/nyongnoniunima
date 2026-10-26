import type Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { randomUUID } from 'crypto'
import { ACADEMIC_CATALOG } from '../academic-catalog'

let db: Database.Database | null = null

const TITLEHOLDERS_TABLE_SQL = `
    CREATE TABLE IF NOT EXISTS titleholders (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      tahun INTEGER NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('Juara Utama', 'Wakil I', 'Wakil II', 'Harapan I', 'Harapan II', 'Berbakat', 'Favorit', 'Fotogenik', 'Persahabatan', 'Duta Pariwisata', 'Duta Lingkungan', 'Duta Sosial', 'Duta Budaya', 'Duta Bahasa', 'Duta Seni', 'Duta Kesehatan', 'Duta Pendidikan', 'Intelegensia', 'Other')),
      nyong_name TEXT NOT NULL,
      noni_name TEXT NOT NULL,
      faculty TEXT,
      study_program TEXT,
      region TEXT NOT NULL,
      motto TEXT,
      biography TEXT,
      nyong_photo_url TEXT,
      noni_photo_url TEXT,
      nyong_instagram TEXT,
      noni_instagram TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`

const CURRENT_TITLEHOLDERS_TABLE_SQL = `
    CREATE TABLE IF NOT EXISTS current_titleholders (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      title TEXT NOT NULL CHECK (title IN (
        'Nyong UNIMA', 'Noni UNIMA',
        'Wakil 1 Nyong', 'Wakil 1 Noni',
        'Wakil 2 Nyong', 'Wakil 2 Noni',
        'Harapan 1 Nyong', 'Harapan 1 Noni',
        'Harapan 2 Nyong', 'Harapan 2 Noni',
        'Nyong Berbakat', 'Noni Berbakat',
        'Nyong Favorit', 'Noni Favorit',
        'Nyong Fotogenik', 'Noni Fotogenik',
        'Nyong Duta Lingkungan', 'Noni Duta Lingkungan',
        'Nyong Duta Sosial', 'Noni Duta Sosial',
        'Nyong Duta Budaya', 'Noni Duta Budaya',
        'Nyong Duta Bahasa', 'Noni Duta Bahasa',
        'Nyong Duta Seni', 'Noni Duta Seni',
        'Nyong Duta Pariwisata', 'Noni Duta Pariwisata',
        'Nyong Duta Kesehatan', 'Noni Duta Kesehatan',
        'Nyong Duta Pendidikan', 'Noni Duta Pendidikan',
        'Nyong Persahabatan', 'Noni Persahabatan',
        'Nyong Intelegensia', 'Noni Intelegensia'
      )),
      name TEXT NOT NULL,
      faculty TEXT,
      study_program TEXT,
      photo_url TEXT,
      instagram TEXT,
      biography TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`

export function getLocalDb(): Database.Database {
  if (!db) {
    const BetterSqlite3 = require('better-sqlite3')
    const dbDir = path.join(process.cwd(), 'data')
    const dbPath = path.join(dbDir, 'nyong-noni.db')
    let readonly = false
    try {
      if (!fs.existsSync(dbPath)) {
        fs.mkdirSync(dbDir, { recursive: true })
      }
      db = new BetterSqlite3(dbPath) as Database.Database
      db.pragma('journal_mode = WAL')
    } catch {
      readonly = true
      db = new BetterSqlite3(dbPath, { readonly: true }) as Database.Database
    }
    db.pragma('foreign_keys = ON')
    if (!readonly) {
      try {
        initSchema(db)
      } catch (error) {
        db.close()
        db = null
        throw error
      }
    }
  }
  return db
}

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS applicants (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      place_of_birth TEXT,
      gender TEXT CHECK (gender IN ('Laki-laki', 'Perempuan')),
      nim TEXT,
      faculty TEXT,
      study_program TEXT,
      semester INTEGER,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      province TEXT NOT NULL,
      height_cm REAL NOT NULL DEFAULT 165,
      weight_kg REAL NOT NULL DEFAULT 60,
      occupation TEXT NOT NULL DEFAULT '',
      education TEXT NOT NULL DEFAULT '',
      instagram TEXT,
      tiktok TEXT,
      facebook TEXT,
      ipk REAL,
      foreign_language TEXT,
      photo_url TEXT,
      passport_photo_url TEXT,
      fullbody_photo_url TEXT,
      ktm_url TEXT,
      ktp_url TEXT,
      cv_url TEXT,
      statement_letter_url TEXT,
      essay TEXT,
      consent INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'finalist')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS news (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      image_url TEXT,
      author_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      published INTEGER NOT NULL DEFAULT 0,
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gallery (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT NOT NULL,
      category TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      location TEXT NOT NULL,
      category TEXT DEFAULT '',
      image_url TEXT,
      published INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS finalist_profiles (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      applicant_id TEXT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
      instagram TEXT,
      photo_url TEXT,
      bio TEXT,
      tahun TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hall_of_fame (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      tahun INTEGER NOT NULL,
      nyong_name TEXT NOT NULL,
      noni_name TEXT NOT NULL,
      nyong_photo_url TEXT,
      noni_photo_url TEXT,
      kabupaten_kota TEXT NOT NULL,
      category TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alumni_achievements (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      alumni_name TEXT NOT NULL,
      achievement_type TEXT NOT NULL,
      description TEXT NOT NULL,
      tahun TEXT NOT NULL,
      photo_url TEXT,
      instagram TEXT,
      current_position TEXT,
      organization TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    ${TITLEHOLDERS_TABLE_SQL}

    CREATE TABLE IF NOT EXISTS faculties (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS study_programs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      faculty_id TEXT NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sponsors (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      logo_url TEXT,
      website TEXT,
      type TEXT NOT NULL DEFAULT 'sponsor' CHECK (type IN ('sponsor', 'partner', 'media')),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    ${CURRENT_TITLEHOLDERS_TABLE_SQL}

    -- Seed default settings
    INSERT OR IGNORE INTO settings (id, key, value) VALUES
      ('s_site_name', 'site_name', '"Nyong Noni UNIMA Official Portal"'),
      ('s_hero_title', 'hero_title', '"Nyong Noni UNIMA Official Portal"'),
      ('s_hero_subtitle', 'hero_subtitle', '"The Official Platform of Nyong & Noni Universitas Negeri Manado — Empowering Student Ambassadors in Leadership, Culture, Tourism, Culture Preservation, and Academic Excellence."'),
      ('s_org_name', 'organization_name', '"Nyong & Noni Universitas Negeri Manado"'),
      ('s_org_short', 'organization_short', '"Nyong Noni UNIMA"'),
      ('s_contact_email', 'contact_email', '"nyongnoni@unima.ac.id"'),
      ('s_contact_instagram', 'contact_instagram', '"@nyongnoniunima"'),
      ('s_grand_final_date', 'grand_final_date', '"2026-12-15T19:00:00"'),
      ('s_reg_open', 'registration_open', 'false');
  `)

  migrateStaleCategoryChecks(database)
  migrateAcademicCatalog(database)
  migrateSelection(database)
}

function migrateAcademicCatalog(database: Database.Database): void {
  database.transaction(() => {
    database.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY)')
    const version = '00011_academic_catalog'
    if (database.prepare('SELECT 1 FROM schema_migrations WHERE version = ?').get(version)) return

    const columns = database.prepare('PRAGMA table_info(study_programs)').all() as { name: string }[]
    if (!columns.some(c => c.name === 'is_active')) {
      database.exec('ALTER TABLE study_programs ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1')
    }
    for (const faculty of ACADEMIC_CATALOG) {
      const matches = database.prepare('SELECT id, code FROM faculties WHERE code IN (?, ?)')
        .all(faculty.code, faculty.legacyCode ?? faculty.code) as { id: string; code: string }[]
      if (matches.length > 1) throw new Error(`Ambiguous faculty codes: ${faculty.code}`)
      const existing = matches[0]
      const facultyId = existing?.id ?? faculty.id
      if (!existing) {
        database.prepare('INSERT INTO faculties (id, name, code) VALUES (?, ?, ?)')
          .run(facultyId, faculty.name, faculty.code)
      } else if (existing.code !== faculty.code || ['FIKKM', 'FMIPAK'].includes(faculty.code)) {
        database.prepare('UPDATE faculties SET name = ?, code = ? WHERE id = ?')
          .run(faculty.name, faculty.code, facultyId)
      }
      for (const [code, name, active] of faculty.programs) {
        const program = database.prepare('SELECT faculty_id FROM study_programs WHERE code = ?')
          .get(code) as { faculty_id: string } | undefined
        if (program && program.faculty_id !== facultyId) {
          throw new Error(`Study program code ${code} belongs to another faculty`)
        }
        if (program) {
          database.prepare('UPDATE study_programs SET name = ?, is_active = ? WHERE code = ?')
            .run(name, active === false ? 0 : 1, code)
        } else {
          const preferredId = `${faculty.id}_${code.toLowerCase()}`
          const programId = database.prepare('SELECT 1 FROM study_programs WHERE id = ?').get(preferredId)
            ? randomUUID() : preferredId
          database.prepare('INSERT INTO study_programs (id, faculty_id, name, code, is_active) VALUES (?, ?, ?, ?, ?)')
            .run(programId, facultyId, name, code, active === false ? 0 : 1)
        }
      }
    }

    // These fields can contain arbitrary TEXT IDs, even IDs identical to labels.
    for (const table of ['applicants', 'titleholders', 'current_titleholders']) {
      const fields = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
      if (!fields.some(c => c.name === 'faculty')) continue
      database.prepare(`UPDATE ${table} AS t SET faculty = ? WHERE trim(t.faculty) IN (?, ?, ?, ?)
        AND NOT EXISTS (SELECT 1 FROM faculties f WHERE f.id = t.faculty)`)
        .run('Fakultas Ilmu Keolahragaan dan Kesehatan', 'FIKKM', 'FOK',
          'Fakultas Ilmu Keolahragaan dan Kesehatan Masyarakat', 'Fakultas Olahraga dan Kesehatan')
      database.prepare(`UPDATE ${table} AS t SET faculty = ? WHERE trim(t.faculty) IN (?, ?, ?, ?)
        AND NOT EXISTS (SELECT 1 FROM faculties f WHERE f.id = t.faculty)`)
        .run('Fakultas Matematika, Ilmu Pengetahuan Alam dan Kebumian', 'FMIPAK', 'FMIPA',
          'Fakultas MIPA dan Kebumian', 'Fakultas Matematika dan Ilmu Pengetahuan Alam')
    }
    database.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version)
  })()
}

function migrateSelection(database: Database.Database): void {
  database.transaction(() => {
    const columns = database.prepare('PRAGMA table_info(applicants)').all() as { name: string }[]
    if (!columns.some(c => c.name === 'selection_year')) {
      database.exec('ALTER TABLE applicants ADD COLUMN selection_year INTEGER')
    }
    database.exec(`
      UPDATE applicants SET selection_year = COALESCE(
        (SELECT CAST(tahun AS INTEGER) FROM finalist_profiles WHERE applicant_id = applicants.id
         AND length(tahun) = 4 AND tahun NOT GLOB '*[^0-9]*'
         AND CAST(tahun AS INTEGER) BETWEEN 2000 AND 2100 ORDER BY created_at DESC LIMIT 1),
        CAST(strftime('%Y', created_at) AS INTEGER)
      ) WHERE selection_year IS NULL;
      CREATE INDEX IF NOT EXISTS idx_applicants_selection_year ON applicants(selection_year);
      CREATE TABLE IF NOT EXISTS selection_entries (
        applicant_id TEXT PRIMARY KEY REFERENCES applicants(id) ON DELETE CASCADE,
        year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
        stage TEXT NOT NULL CHECK (stage IN ('semifinalist', 'finalist_draft', 'finalist', 'not_selected_faculty', 'not_selected_university')),
        semifinalist_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_selection_entries_year ON selection_entries(year);
      CREATE TABLE IF NOT EXISTS faculty_whatsapp_groups (
        year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
        faculty_id TEXT NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
        invite_url TEXT NOT NULL,
        PRIMARY KEY (year, faculty_id)
      );
      CREATE TABLE IF NOT EXISTS selection_announcements (
        year INTEGER PRIMARY KEY CHECK (year BETWEEN 2000 AND 2100),
        title TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL DEFAULT '',
        published_at TEXT,
        snapshot_json TEXT NOT NULL DEFAULT '[]'
      );
    `)
  })()
}

function getTableSql(database: Database.Database, table: string): string {
  const row = database
    .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(table) as { sql?: string } | undefined
  return row?.sql || ''
}

// SQLite cannot ALTER a CHECK constraint. Tables created before new
// category values existed reject inserts, so rebuild them in place,
// preserving existing rows (columns are matched by intersection).
function rebuildTable(database: Database.Database, table: string, createSql: string): void {
  const temp = `${table}_migrate`
  const existing = (database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[])
    .map((c) => c.name)
  if (existing.length === 0) return

  database.exec(`DROP TABLE IF EXISTS ${temp};`)
  database.exec(
    createSql.replace(
      new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`),
      `CREATE TABLE ${temp}`
    )
  )

  const dest = (database.prepare(`PRAGMA table_info(${temp})`).all() as { name: string }[])
    .map((c) => c.name)
    .filter((c) => existing.includes(c))
  if (dest.length > 0) {
    database
      .prepare(`INSERT INTO ${temp} (${dest.join(', ')}) SELECT ${dest.join(', ')} FROM ${table}`)
      .run()
  }

  database.pragma('foreign_keys = OFF')
  database.exec(`DROP TABLE ${table}; ALTER TABLE ${temp} RENAME TO ${table};`)
  database.pragma('foreign_keys = ON')
}

function migrateStaleCategoryChecks(database: Database.Database): void {
  const targets: [string, string, string][] = [
    ['titleholders', TITLEHOLDERS_TABLE_SQL, "'Duta Kesehatan'"],
    ['current_titleholders', CURRENT_TITLEHOLDERS_TABLE_SQL, "'Nyong Duta Kesehatan'"],
  ]
  for (const [table, createSql, needle] of targets) {
    const sql = getTableSql(database, table)
    if (sql && !sql.includes(needle)) {
      rebuildTable(database, table, createSql)
    }
  }
}

export function isUsingLocalDb(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co'
}

export type LocalQueryResult<T> = T[]

export function localQuery<T>(table: string, options?: {
  where?: Record<string, unknown>
  orderBy?: { column: string; direction?: 'ASC' | 'DESC' }
  limit?: number
}): T[] {
  const database = getLocalDb()
  let sql = `SELECT * FROM ${table}`
  const params: unknown[] = []

  if (options?.where) {
    const conditions = Object.entries(options.where)
      .filter(([, v]) => v !== undefined)
      .map(([k]) => `${k} = ?`)
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`
      params.push(...Object.entries(options.where)
        .filter(([, v]) => v !== undefined)
        .map(([, v]) => v))
    }
  }

  if (options?.orderBy) {
    sql += ` ORDER BY ${options.orderBy.column} ${options.orderBy.direction || 'ASC'}`
  }

  if (options?.limit) {
    sql += ` LIMIT ?`
    params.push(options.limit)
  }

  return database.prepare(sql).all(...params) as T[]
}

export function localInsert<T>(table: string, data: Record<string, unknown>): T {
  const database = getLocalDb()
  const keys = Object.keys(data)
  const values = Object.values(data)
  const placeholders = keys.map(() => '?').join(', ')

  const stmt = database.prepare(
    `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`
  )
  stmt.run(...values)
  return localQuery<T>(table, {
    where: { id: data.id as string },
    orderBy: { column: 'created_at', direction: 'DESC' },
    limit: 1,
  })[0]
}

export function localUpdate<T>(table: string, id: string, data: Record<string, unknown>): T | null {
  const database = getLocalDb()
  const keys = Object.keys(data)
  const values = Object.values(data)

  const setClause = keys.map(k => `${k} = ?`).join(', ')
  database.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`).run(...values, id)

  const result = localQuery<T>(table, { where: { id } })
  return result[0] || null
}

export function localDelete(table: string, id: string): boolean {
  const database = getLocalDb()
  const result = database.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id)
  return result.changes > 0
}
