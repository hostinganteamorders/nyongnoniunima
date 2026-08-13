import type Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

let db: Database.Database | null = null

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
    if (!readonly) initSchema(db)
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

    CREATE TABLE IF NOT EXISTS titleholders (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      tahun INTEGER NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('Juara Utama', 'Wakil I', 'Wakil II', 'Harapan I', 'Harapan II', 'Berbakat', 'Favorit', 'Fotogenik', 'Persahabatan', 'Digital', 'Duta Lingkungan', 'Duta Sosial', 'Duta Budaya', 'Duta Bahasa', 'Duta Seni', 'Intelegensia', 'Other')),
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
    );

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
    );

    -- Seed faculties if empty
    INSERT OR IGNORE INTO faculties (id, name, code) VALUES
      ('fip', 'Fakultas Ilmu Pendidikan', 'FIP'),
      ('fbs', 'Fakultas Bahasa dan Seni', 'FBS'),
      ('fish', 'Fakultas Ilmu Sosial dan Hukum', 'FISH'),
      ('fmipa', 'Fakultas Matematika dan Ilmu Pengetahuan Alam', 'FMIPA'),
      ('ft', 'Fakultas Teknik', 'FT'),
      ('fe', 'Fakultas Ekonomi', 'FE'),
      ('fok', 'Fakultas Olahraga dan Kesehatan', 'FOK'),
      ('fk', 'Fakultas Kedokteran', 'FK');

    -- Seed study programs if empty
    INSERT OR IGNORE INTO study_programs (id, faculty_id, name, code) VALUES
      ('fip_pgsd', 'fip', 'PGSD', 'PGSD'),
      ('fip_pgpaud', 'fip', 'PG PAUD', 'PGPAUD'),
      ('fip_bk', 'fip', 'Bimbingan dan Konseling', 'BK'),
      ('fip_plb', 'fip', 'Pendidikan Luar Biasa', 'PLB'),
      ('fbs_pbi', 'fbs', 'Pendidikan Bahasa Inggris', 'PBI'),
      ('fbs_pbind', 'fbs', 'Pendidikan Bahasa Indonesia', 'PBInd'),
      ('fbs_sendratasik', 'fbs', 'Pendidikan Seni Drama, Tari dan Musik', 'Sendratasik'),
      ('fish_ih', 'fish', 'Ilmu Hukum', 'IH'),
      ('fish_is', 'fish', 'Ilmu Sosial', 'IS'),
      ('fish_ps', 'fish', 'Pendidikan Sejarah', 'PS'),
      ('fish_pg', 'fish', 'Pendidikan Geografi', 'PG'),
      ('fish_ppkn', 'fish', 'Pendidikan Pancasila dan Kewarganegaraan', 'PPKN'),
      ('fmipa_pmat', 'fmipa', 'Pendidikan Matematika', 'PMat'),
      ('fmipa_pipa', 'fmipa', 'Pendidikan IPA', 'PIPA'),
      ('fmipa_pbio', 'fmipa', 'Pendidikan Biologi', 'PBio'),
      ('fmipa_pfis', 'fmipa', 'Pendidikan Fisika', 'PFis'),
      ('fmipa_pkim', 'fmipa', 'Pendidikan Kimia', 'PKim'),
      ('fmipa_bio', 'fmipa', 'Biologi', 'Bio'),
      ('fmipa_fis', 'fmipa', 'Fisika', 'Fis'),
      ('fmipa_kim', 'fmipa', 'Kimia', 'Kim'),
      ('ft_ptm', 'ft', 'Pendidikan Teknik Mesin', 'PTM'),
      ('ft_pte', 'ft', 'Pendidikan Teknik Elektro', 'PTE'),
      ('ft_ptb', 'ft', 'Pendidikan Teknik Bangunan', 'PTB'),
      ('ft_ti', 'ft', 'Teknik Informatika', 'TI'),
      ('ft_ptik', 'ft', 'Pendidikan Teknologi Informasi dan Komunikasi', 'PTIK'),
      ('fe_pe', 'fe', 'Pendidikan Ekonomi', 'PE'),
      ('fe_man', 'fe', 'Manajemen', 'Man'),
      ('fe_akun', 'fe', 'Akuntansi', 'Akun'),
      ('fok_pjkr', 'fok', 'Pendidikan Jasmani, Kesehatan dan Rekreasi', 'PJKR'),
      ('fok_pko', 'fok', 'Pendidikan Kepelatihan Olahraga', 'PKO'),
      ('fok_ik', 'fok', 'Ilmu Keolahragaan', 'IK'),
      ('fk_ppd', 'fk', 'Pendidikan Profesi Dokter', 'PPD'),
      ('fk_ked', 'fk', 'Kedokteran', 'Ked');

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
      ('s_reg_open', 'registration_open', 'true');
  `)
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
