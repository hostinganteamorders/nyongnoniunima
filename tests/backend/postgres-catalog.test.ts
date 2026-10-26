import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ACADEMIC_CATALOG } from '@/lib/academic-catalog'

// Opt-in, with its own socket directory, databases and port. Never uses app credentials.
describe.skipIf(process.env.TEST_CATALOG_POSTGRES !== '1')('PostgreSQL academic catalog', () => {
  const project = process.cwd()
  const port = '55440'
  let root: string
  let started = false
  const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
  const quote = (value: string) => `'${value.replace(/'/g, "''")}'`
  const migration = fs.readFileSync(path.join(project, 'supabase/migrations/00011_academic_catalog.sql'), 'utf8')
  const sql = (input: string, database = 'catalog_old') => execFileSync('psql', [
    '-X', '-h', root, '-p', port, '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1', '-Atq',
  ], { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  const rows = (table: string, database = 'catalog_old') => sql(`SELECT coalesce(json_agg(t ORDER BY t::text), '[]'::json) FROM public.${table} t`, database)
  const catalog = (database = 'catalog_old') => JSON.parse(sql(`SELECT json_agg(t ORDER BY t.faculty, t.code) FROM (
    SELECT f.code AS faculty, p.code, p.name, p.is_active FROM study_programs p JOIN faculties f ON f.id = p.faculty_id
  ) t`, database))
  function bootstrap(database: string) {
    sql(`CREATE DATABASE ${database}`, 'postgres')
    sql(`CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;`, database)
  }

  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-pg-'))
    execFileSync('initdb', ['-D', path.join(root, 'db'), '--auth=trust', '--username=postgres', '--no-locale'], { stdio: 'pipe' })
    execFileSync('pg_ctl', ['-D', path.join(root, 'db'), '-l', path.join(root, 'server.log'), '-o', `-F -k ${root} -p ${port} -h ''`, '-w', 'start'], { stdio: 'pipe' })
    started = true
    sql('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;', 'postgres')
    bootstrap('catalog_old')
    bootstrap('catalog_fresh')
    const setup = fs.readFileSync(path.join(project, 'supabase/setup.sql'), 'utf8')
    for (const file of fs.readdirSync(path.join(project, 'supabase/migrations')).filter(f => /^000(0[1-9]|10)_.*\.sql$/.test(f)).sort()) {
      // Historical migrations rely on these extra tables/columns supplied by setup.
      if (file.startsWith('00003_')) sql(setup.slice(setup.indexOf('-- Bagian 2:'), setup.indexOf('-- Bagian 4:')))
      sql(fs.readFileSync(path.join(project, 'supabase/migrations', file), 'utf8'))
    }
    expect(sql('SELECT count(*) FROM study_programs')).toBe('33')
    sql('CREATE DATABASE catalog_legacy TEMPLATE catalog_old', 'postgres')
    sql('CREATE DATABASE catalog_ambiguous TEMPLATE catalog_old', 'postgres')
  }, 30000)
  afterAll(() => {
    if (started) execFileSync('pg_ctl', ['-D', path.join(root, 'db'), '-m', 'immediate', '-w', 'stop'], { stdio: 'pipe' })
    if (root) fs.rmSync(root, { recursive: true, force: true })
  })

  it.each(['PGSD', 'PSI'])('rejects cross-faculty code collisions atomically, including new codes (%s)', code => {
    if (code === 'PSI') {
      sql("INSERT INTO study_programs (faculty_id, name, code) SELECT id, 'Unrelated program', 'PSI' FROM faculties WHERE code = 'FT'")
    } else {
      sql("UPDATE study_programs SET faculty_id = (SELECT id FROM faculties WHERE code = 'FT') WHERE code = 'PGSD'")
    }
    const programs = rows('study_programs')
    const faculties = rows('faculties')
    expect(() => sql(migration)).toThrow(/Study program code belongs to another faculty/)
    expect(rows('study_programs')).toBe(programs)
    expect(rows('faculties')).toBe(faculties)
    expect(sql("SELECT count(*) FROM information_schema.columns WHERE table_name = 'study_programs' AND column_name = 'is_active'")).toBe('0')
    if (code === 'PSI') sql("DELETE FROM study_programs WHERE code = 'PSI'")
    else sql("UPDATE study_programs SET faculty_id = (SELECT id FROM faculties WHERE code = 'FIPP') WHERE code = 'PGSD'")
  })

  it('upgrades all 33 existing UUID rows without changing references, profiles, groups or published snapshots', () => {
    const before = JSON.parse(sql('SELECT json_agg(t ORDER BY code) FROM (SELECT id, faculty_id, code, created_at FROM study_programs) t')) as { code: string }[]
    const faculties = sql('SELECT json_agg(t ORDER BY id) FROM (SELECT id, code, created_at FROM faculties) t')
    for (const [i, code] of ['IS', 'Sendratasik', 'PTB', 'PGSD'].entries()) {
      sql(`INSERT INTO applicants (id, full_name, email, phone, date_of_birth, address, city, province, height_cm, weight_kg, occupation, education, status, selection_year, faculty, study_program)
        SELECT '${id(i + 1)}', 'Participant', 'private@example.com', '081234567890', '2004-01-01', 'Address', 'City', 'Province', 170, 60, 'Student', 'S1', 'finalist', 2026,
        p.faculty_id::text, p.id::text FROM study_programs p WHERE code = '${code}';
        INSERT INTO finalist_profiles (applicant_id, tahun, bio, photo_url) VALUES ('${id(i + 1)}', '2026', 'Original bio', '/original.png');
        INSERT INTO selection_entries VALUES ('${id(i + 1)}', 2026, 'finalist', '2026-01-01');
        INSERT INTO titleholders (id, tahun, category, nyong_name, noni_name, region, faculty, study_program)
        SELECT '${id(i + 1)}', 2026, 'Juara Utama', 'Nyong', 'Noni', 'UNIMA', faculty_id::text, id::text FROM study_programs WHERE code = '${code}';
        INSERT INTO current_titleholders (id, title, name, faculty, study_program)
        SELECT '${id(i + 1)}', 'Nyong UNIMA', 'Name', faculty_id::text, id::text FROM study_programs WHERE code = '${code}';`)
    }
    const labels = ['FIKKM', 'FOK', 'Fakultas Ilmu Keolahragaan dan Kesehatan Masyarakat', 'Fakultas Olahraga dan Kesehatan',
      'FMIPAK', 'FMIPA', 'Fakultas MIPA dan Kebumian', 'Fakultas Matematika dan Ilmu Pengetahuan Alam']
    for (const [i, label] of labels.entries()) {
      sql(`INSERT INTO applicants (id, full_name, email, phone, date_of_birth, address, city, province, height_cm, weight_kg, occupation, education, selection_year, faculty, study_program)
        VALUES ('${id(i + 10)}', 'Text participant', 'private@example.com', '081234567890', '2004-01-01', 'Address', 'City', 'Province', 170, 60, 'Student', 'S1', 2026, ${quote(` ${label} `)}, 'Original program');
        INSERT INTO titleholders (id, tahun, category, nyong_name, noni_name, region, faculty, study_program)
        VALUES ('${id(i + 10)}', 2026, 'Juara Utama', 'Nyong', 'Noni', 'UNIMA', ${quote(label)}, 'Original program');
        INSERT INTO current_titleholders (id, title, name, faculty, study_program)
        VALUES ('${id(i + 10)}', 'Nyong UNIMA', 'Name', ${quote(label)}, 'Original program');`)
    }
    sql(`INSERT INTO faculty_whatsapp_groups SELECT 2026, id, 'https://chat.whatsapp.com/unchanged' FROM faculties;
      INSERT INTO selection_announcements VALUES (2026, 'Published', 'Body', '2026-01-01', '[{"faculty":"Fakultas MIPA dan Kebumian","study_program":"Ilmu Sosial"}]');`)
    const referenceTables = ['applicants', 'titleholders', 'current_titleholders']
    const references = referenceTables.map(table => sql(`SELECT json_agg(t ORDER BY id) FROM (SELECT * FROM ${table} WHERE id BETWEEN '${id(1)}' AND '${id(4)}') t`))
    const tables = ['finalist_profiles', 'selection_entries', 'faculty_whatsapp_groups', 'selection_announcements']
    const originals = tables.map(table => rows(table))
    sql(migration)
    expect(sql('SELECT count(*) FROM faculties')).toBe('8')
    expect(sql('SELECT count(*) FROM study_programs')).toBe('52')
    expect(sql('SELECT count(*) FROM study_programs WHERE is_active')).toBe('49')
    const programs = JSON.parse(sql('SELECT json_agg(t ORDER BY code) FROM (SELECT id, faculty_id, code, created_at FROM study_programs) t')) as { code: string }[]
    for (const row of before) expect(programs.find(p => p.code === row.code)).toEqual(row)
    expect(sql('SELECT json_agg(t ORDER BY id) FROM (SELECT id, code, created_at FROM faculties) t')).toBe(faculties)
    for (const [i, table] of referenceTables.entries()) {
      expect(sql(`SELECT json_agg(t ORDER BY id) FROM (SELECT * FROM ${table} WHERE id BETWEEN '${id(1)}' AND '${id(4)}') t`)).toBe(references[i])
    }
    expect(sql(`SELECT string_agg(p.code, ',' ORDER BY p.code) FROM applicants a JOIN study_programs p ON p.id::text = a.study_program WHERE NOT p.is_active`)).toBe('IS,PTB,Sendratasik')
    for (const [i, table] of tables.entries()) expect(rows(table)).toBe(originals[i])
    for (const table of ['applicants', 'titleholders', 'current_titleholders']) {
      const migrated = JSON.parse(sql(`SELECT json_agg(t ORDER BY id) FROM (SELECT id, faculty, study_program FROM ${table} WHERE id BETWEEN '${id(10)}' AND '${id(17)}') t`)) as { faculty: string; study_program: string }[]
      expect(migrated.map(r => r.faculty)).toEqual([
        ...Array(4).fill('Fakultas Ilmu Keolahragaan dan Kesehatan'),
        ...Array(4).fill('Fakultas Matematika, Ilmu Pengetahuan Alam dan Kebumian'),
      ])
      expect(migrated.every(r => r.study_program === 'Original program')).toBe(true)
    }
    const complete = ['faculties', 'study_programs', 'applicants', 'titleholders', 'current_titleholders', ...tables].map(table => rows(table))
    sql(migration)
    for (const [i, table] of ['faculties', 'study_programs', 'applicants', 'titleholders', 'current_titleholders', ...tables].entries()) expect(rows(table)).toBe(complete[i])
  })

  it('produces the same catalog in fresh setup, including exact codes, names, active flags and faculty names', () => {
    const setup = fs.readFileSync(path.join(project, 'supabase/setup.sql'), 'utf8')
    sql(setup, 'catalog_fresh')
    expect(catalog('catalog_fresh')).toEqual(catalog())
    const expected = ACADEMIC_CATALOG.flatMap(f => f.programs.map(([code, name, active]) => ({ faculty: f.code, code, name, is_active: active !== false })))
    expect(catalog()).toEqual(expect.arrayContaining(expected))
    expect(catalog()).toHaveLength(52)
    const facultyNames = (database: string) => JSON.parse(sql('SELECT json_agg(t ORDER BY code) FROM (SELECT code, name FROM faculties) t', database))
    expect(facultyNames('catalog_fresh')).toEqual(facultyNames('catalog_old'))
    expect(facultyNames('catalog_old')).toEqual(expect.arrayContaining(ACADEMIC_CATALOG.map(f => ({ code: f.code, name: f.name }))))
    expect(sql("SELECT is_nullable || ':' || column_default FROM information_schema.columns WHERE table_name = 'study_programs' AND column_name = 'is_active'", 'catalog_fresh')).toBe('NO:true')
    const ids = sql('SELECT json_agg(t ORDER BY code) FROM (SELECT id, faculty_id, code FROM study_programs) t', 'catalog_fresh')
    sql(setup, 'catalog_fresh')
    expect(sql('SELECT json_agg(t ORDER BY code) FROM (SELECT id, faculty_id, code FROM study_programs) t', 'catalog_fresh')).toBe(ids)
  })

  it('recognizes old faculty codes without replacing UUIDs or creating duplicate faculties', () => {
    const before = sql('SELECT json_agg(t ORDER BY id) FROM (SELECT id, created_at FROM faculties) t', 'catalog_fresh')
    const programs = sql('SELECT json_agg(t ORDER BY code) FROM (SELECT id, faculty_id, code FROM study_programs) t', 'catalog_fresh')
    sql(`UPDATE faculties SET code = CASE code WHEN 'FIPP' THEN 'FIP' WHEN 'FEB' THEN 'FE'
      WHEN 'FIKKM' THEN 'FOK' WHEN 'FMIPAK' THEN 'FMIPA' ELSE code END`, 'catalog_fresh')
    sql(migration, 'catalog_fresh')
    expect(sql('SELECT json_agg(t ORDER BY id) FROM (SELECT id, created_at FROM faculties) t', 'catalog_fresh')).toBe(before)
    expect(sql('SELECT json_agg(t ORDER BY code) FROM (SELECT id, faculty_id, code FROM study_programs) t', 'catalog_fresh')).toBe(programs)
    expect(catalog('catalog_fresh')).toEqual(catalog())
    expect(sql('SELECT count(*) FROM faculties', 'catalog_fresh')).toBe('8')
  })

  it('runs full setup over the legacy-code 33-program database without duplicating faculties or changing references', () => {
    const database = 'catalog_legacy'
    sql(`UPDATE faculties SET code = CASE code WHEN 'FIPP' THEN 'FIP' WHEN 'FEB' THEN 'FE'
      WHEN 'FIKKM' THEN 'FOK' WHEN 'FMIPAK' THEN 'FMIPA' ELSE code END;
      UPDATE faculties SET name = CASE code WHEN 'FIP' THEN 'Fakultas Ilmu Pendidikan' WHEN 'FE' THEN 'Fakultas Ekonomi'
        WHEN 'FOK' THEN 'Fakultas Olahraga dan Kesehatan' WHEN 'FMIPA' THEN 'Fakultas Matematika dan Ilmu Pengetahuan Alam' ELSE name END;
      INSERT INTO faculty_whatsapp_groups SELECT 2026, id, 'https://chat.whatsapp.com/legacy' FROM faculties;
      INSERT INTO applicants (id, full_name, email, phone, date_of_birth, address, city, province, height_cm, weight_kg, occupation, education, status, selection_year, faculty, study_program)
      SELECT gen_random_uuid(), 'Legacy participant', 'private@example.com', '081234567890', '2004-01-01', 'Address', 'City', 'Province', 170, 60, 'Student', 'S1', 'finalist', 2026,
        faculty_id::text, id::text FROM study_programs WHERE code IN ('IS', 'PGSD', 'IK');
      INSERT INTO finalist_profiles (applicant_id, tahun, bio) SELECT id, '2026', 'Original bio' FROM applicants;
      INSERT INTO selection_entries SELECT id, 2026, 'finalist', '2026-01-01' FROM applicants;
      INSERT INTO selection_announcements VALUES (2026, 'Published', 'Body', '2026-01-01', '[{"faculty":"FOK","study_program":"Ilmu Sosial"}]');`, database)
    const ids = sql('SELECT json_agg(t ORDER BY id) FROM (SELECT id, created_at FROM faculties) t', database)
    const programs = JSON.parse(sql('SELECT json_agg(t ORDER BY code) FROM (SELECT id, faculty_id, code, created_at FROM study_programs) t', database)) as { code: string }[]
    const unchanged = ['applicants', 'finalist_profiles', 'selection_entries', 'faculty_whatsapp_groups', 'selection_announcements']
    const before = unchanged.map(table => rows(table, database))
    const setup = fs.readFileSync(path.join(project, 'supabase/setup.sql'), 'utf8')
    sql(setup, database)
    expect(sql('SELECT count(*) FROM faculties', database)).toBe('8')
    expect(sql('SELECT json_agg(t ORDER BY id) FROM (SELECT id, created_at FROM faculties) t', database)).toBe(ids)
    const after = JSON.parse(sql('SELECT json_agg(t ORDER BY code) FROM (SELECT id, faculty_id, code, created_at FROM study_programs) t', database)) as { code: string }[]
    for (const program of programs) expect(after.find(p => p.code === program.code)).toEqual(program)
    expect(catalog(database)).toEqual(catalog())
    expect(JSON.parse(sql('SELECT json_agg(t) FROM (SELECT code, name FROM faculties) t', database)))
      .toEqual(expect.arrayContaining(ACADEMIC_CATALOG.map(f => ({ code: f.code, name: f.name }))))
    for (const [i, table] of unchanged.entries()) expect(rows(table, database)).toBe(before[i])
    sql(setup, database)
    expect(sql('SELECT count(*) FROM faculties', database)).toBe('8')
    for (const [i, table] of unchanged.entries()) expect(rows(table, database)).toBe(before[i])
  })

  it('rejects ambiguous faculty pairs before full setup can normalize or seed any faculty rows', () => {
    const database = 'catalog_ambiguous'
    sql(`UPDATE faculties SET code = CASE code WHEN 'FIPP' THEN 'FIP' WHEN 'FEB' THEN 'FE'
      WHEN 'FIKKM' THEN 'FOK' WHEN 'FMIPAK' THEN 'FMIPA' ELSE code END;
      INSERT INTO faculties (name, code) VALUES ('Unrelated faculty', 'FIPP');
      INSERT INTO faculty_whatsapp_groups SELECT 2026, id, 'https://chat.whatsapp.com/legacy' FROM faculties;`, database)
    const tables = ['faculties', 'study_programs', 'faculty_whatsapp_groups']
    const before = tables.map(table => rows(table, database))
    expect(() => sql(fs.readFileSync(path.join(project, 'supabase/setup.sql'), 'utf8'), database)).toThrow(/Ambiguous faculty codes/)
    for (const [i, table] of tables.entries()) expect(rows(table, database)).toBe(before[i])
    expect(sql('SELECT count(*) FROM faculties', database)).toBe('9')
    expect(sql("SELECT count(*) FROM faculties WHERE code IN ('FEB', 'FIKKM', 'FMIPAK')", database)).toBe('0')
  })

  it('refuses to merge ambiguous canonical and legacy faculty codes', () => {
    sql("INSERT INTO faculties (name, code) VALUES ('Unrelated faculty', 'FIP')")
    const tables = ['faculties', 'study_programs', 'applicants', 'faculty_whatsapp_groups', 'selection_announcements']
    const before = tables.map(table => rows(table))
    expect(() => sql(migration)).toThrow(/Ambiguous faculty codes/)
    for (const [i, table] of tables.entries()) expect(rows(table)).toBe(before[i])
    sql("DELETE FROM faculties WHERE code = 'FIP'")
  })
})
