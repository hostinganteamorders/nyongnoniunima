import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// Opt-in: an isolated temporary PostgreSQL cluster, never the configured app DB.
const enabled = process.env.TEST_SELECTION_POSTGRES === '1'
describe.skipIf(!enabled)('PostgreSQL publication and API boundary', () => {
  let root: string
  let started = false
  const port = '55439'
  const project = process.cwd()
  const sql = (input: string) => execFileSync('psql', ['-X', '-h', root, '-p', port, '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  const rpc = (operation: string, args = '') => `SELECT public.mutate_selection('${operation}'${args});`
  const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
  const publish = (year: number, ids: number[], title = 'Title', body = 'Body') => rpc('publish', `, p_year => ${year}, p_expected_ids => ARRAY[${ids.map(n => `'${id(n)}'`).join(',')}]::uuid[], p_expected_title => '${title}', p_expected_body => '${body}'`)
  const save = (n: number, data: Record<string, unknown>) => rpc('finalist_data', `, p_applicant_id => '${id(n)}', p_data => '${JSON.stringify(data).replace(/'/g, "''")}'::jsonb`)
  const manual = (n: number, fields: Record<string, string | number | null> = {}) => {
    const data = { full_name: `Manual ${n}`, phone: `081320000${n}`, gender: 'Perempuan', year: 2041, ...fields }
    const args = Object.entries(data).map(([key, value]) => `p_${key} => ${value === null ? 'NULL' : typeof value === 'number' ? value : `'${value.replace(/'/g, "''")}'`}`)
    if (!('faculty' in fields)) args.push("p_faculty => (SELECT id FROM faculties WHERE code = 'FT')")
    return `SELECT public.create_manual_semifinalist(${args.join(', ')});`
  }
  function holdTransaction(statement: string) {
    const connection = spawn('psql', ['-X', '-h', root, '-p', port, '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'])
    let output = ''
    let ready = false
    const locked = new Promise<void>((resolve, reject) => {
      connection.stdout.on('data', chunk => {
        output += chunk.toString()
        if (output.includes('LOCK_READY')) { ready = true; resolve() }
      })
      connection.on('error', reject)
      connection.on('close', code => { if (!ready) reject(new Error(`Transaction exited before lock: ${code}`)) })
    })
    const finished = new Promise<number | null>(resolve => connection.on('close', resolve))
    connection.stdin.end(`BEGIN; ${statement} SELECT 'LOCK_READY'; SELECT pg_sleep(0.3); COMMIT;`)
    return { locked, finished }
  }
  const insert = (n: number, status = 'verified', year = 2026) => sql(`INSERT INTO applicants
    (id, full_name, email, phone, date_of_birth, address, city, province, height_cm, weight_kg, occupation, education, status, selection_year, faculty, study_program)
    VALUES ('${id(n)}', 'Name ${n}', 'private@example.com', '081234567890', '2004-05-15', 'Private', 'City', 'Province', 175, 65, 'Student', 'S1', '${status}', ${year},
    (SELECT id::text FROM faculties WHERE code = 'FT'), (SELECT id::text FROM study_programs WHERE code = 'TI'));`)

  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'selection-pg-'))
    execFileSync('initdb', ['-D', path.join(root, 'db'), '--auth=trust', '--username=postgres', '--no-locale'], { stdio: 'pipe' })
    execFileSync('pg_ctl', ['-D', path.join(root, 'db'), '-l', path.join(root, 'server.log'), '-o', `-F -k ${root} -p ${port} -h ''`, '-w', 'start'], { stdio: 'pipe' })
    started = true
    sql(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;`)
    sql(fs.readFileSync(path.join(project, 'supabase/setup.sql'), 'utf8'))
    sql(fs.readFileSync(path.join(project, 'supabase/migrations/00010_staged_selection.sql'), 'utf8'))
    sql(fs.readFileSync(path.join(project, 'supabase/migrations/00012_manual_semifinalists.sql'), 'utf8'))
  }, 30000)

  afterAll(() => {
    if (started) execFileSync('pg_ctl', ['-D', path.join(root, 'db'), '-m', 'immediate', '-w', 'stop'], { stdio: 'pipe' })
    if (root) fs.rmSync(root, { recursive: true, force: true })
  })

  it('generates a private, repeatable SQL import without interpreting names as SQL', () => {
    const input = path.join(root, 'roster.private.json')
    const output = path.join(root, 'roster.private.sql')
    const fullName = "Manual O'Name $import$; --"
    fs.writeFileSync(input, JSON.stringify([
      { full_name: fullName, phone: ' 0813 2000-0951 ', faculty_code: 'FT', gender: 'Perempuan', selection_year: 2028 },
      { full_name: 'Manual Import Nyong', phone: '081320000952', faculty_code: 'FEB', gender: 'Laki-laki', selection_year: 2028 },
    ]))
    execFileSync(process.execPath, [path.join(project, 'scripts/import-semifinalists.cjs'), input, '--sql-file', output], { stdio: 'pipe' })
    const generated = fs.readFileSync(output, 'utf8')
    for (let attempt = 0; attempt < 2; attempt++) sql(generated)
    expect(sql('SELECT count(*) FROM applicants WHERE selection_year = 2028')).toBe('2')
    expect(sql("SELECT full_name FROM applicants WHERE selection_year = 2028 AND gender = 'Perempuan'")).toBe(fullName)
    expect(sql(`SELECT count(*) FROM applicants a JOIN selection_entries e ON e.applicant_id = a.id
      WHERE a.selection_year = 2028 AND e.year = 2028 AND e.stage = 'semifinalist' AND e.semifinalist_at IS NOT NULL
      AND a.email IS NULL AND a.date_of_birth IS NULL AND a.height_cm IS NULL AND a.consent = false`)).toBe('2')
    expect(fs.statSync(output).mode & 0o777).toBe(0o600)
    sql('DELETE FROM applicants WHERE selection_year = 2028')
  })

  it('blocks anon reads/inserts, authenticated selection writes and non-service RPC calls', () => {
    for (const table of ['applicants', 'finalist_profiles', 'selection_entries', 'selection_announcements', 'faculty_whatsapp_groups']) {
      expect(() => sql(`SET ROLE anon; SELECT * FROM public.${table};`)).toThrow()
    }
    expect(() => sql(`SET ROLE anon; INSERT INTO applicants (full_name) VALUES ('Forged');`)).toThrow()
    expect(() => sql(`SET ROLE authenticated; ${rpc('publish', ', p_year => 2026')}`)).toThrow()
    expect(() => sql(`SET ROLE anon; ${rpc('publish', ', p_year => 2026')}`)).toThrow()
    expect(() => sql(`SET ROLE authenticated; INSERT INTO selection_announcements (year) VALUES (2026);`)).toThrow()
  })

  it('allows safe own-profile edits but denies role escalation and edits to another profile', () => {
    sql(`INSERT INTO auth.users (id, email) VALUES ('${id(100)}', 'user@example.com'), ('${id(101)}', 'other@example.com');`)
    const session = `SET ROLE authenticated; SET request.jwt.claim.sub = '${id(100)}';`
    sql(`${session} UPDATE profiles SET full_name = 'Updated name', avatar_url = '/avatar.png' WHERE id = '${id(100)}';`)
    expect(sql(`SELECT full_name FROM profiles WHERE id = '${id(100)}'`)).toBe('Updated name')
    expect(() => sql(`${session} UPDATE profiles SET role = 'admin' WHERE id = '${id(100)}';`)).toThrow()
    expect(() => sql(`${session} UPDATE profiles SET full_name = 'Escalation', role = 'admin' WHERE id = '${id(100)}';`)).toThrow()
    expect(sql(`SELECT role FROM profiles WHERE id = '${id(100)}'`)).toBe('user')
    sql(`${session} UPDATE profiles SET full_name = 'Not mine' WHERE id = '${id(101)}';`)
    expect(sql(`SELECT full_name FROM profiles WHERE id = '${id(101)}'`)).toBe('other@example.com')
    expect(sql("SELECT has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')")).toBe('f')
    expect(sql("SELECT has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE')")).toBe('t')
  })

  it('denies direct applicant/profile writes even for authenticated admins while retaining admin reads', () => {
    sql(`INSERT INTO auth.users (id, email) VALUES ('${id(102)}', 'admin@example.com'); UPDATE profiles SET role = 'admin' WHERE id = '${id(102)}';`)
    const session = `SET ROLE authenticated; SET request.jwt.claim.sub = '${id(102)}';`
    for (const table of ['applicants', 'finalist_profiles']) {
      sql(`${session} SELECT * FROM ${table};`)
      for (const privilege of ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) {
        expect(sql(`SELECT has_table_privilege('authenticated', 'public.${table}', '${privilege}')`)).toBe('f')
      }
      expect(() => sql(`${session} DELETE FROM ${table};`)).toThrow(/permission denied/)
    }
    expect(() => sql(`${session} INSERT INTO applicants (full_name, status) VALUES ('Bypass', 'finalist');`)).toThrow(/permission denied/)
    expect(() => sql(`${session} UPDATE applicants SET status = 'finalist';`)).toThrow(/permission denied/)
    expect(() => sql(`${session} INSERT INTO finalist_profiles (applicant_id, tahun) VALUES ('${id(1)}', '2026');`)).toThrow(/permission denied/)
    expect(() => sql(`${session} UPDATE finalist_profiles SET bio = 'Bypass';`)).toThrow(/permission denied/)
  })

  it('backfills existing applicants from valid profile years, otherwise created_at, without changing legacy status', () => {
    insert(90, 'finalist', 2020)
    insert(91, 'finalist', 2020)
    sql(`ALTER TABLE applicants ALTER COLUMN selection_year DROP NOT NULL;
      UPDATE applicants SET selection_year = NULL, created_at = '2021-01-01' WHERE id IN ('${id(90)}', '${id(91)}');
      INSERT INTO finalist_profiles (applicant_id, tahun) VALUES ('${id(90)}', '2024'), ('${id(91)}', '2026abc');`)
    sql(fs.readFileSync(path.join(project, 'supabase/migrations/00010_staged_selection.sql'), 'utf8'))
    expect(sql(`SELECT selection_year FROM applicants WHERE id = '${id(90)}'`)).toBe('2024')
    expect(sql(`SELECT selection_year FROM applicants WHERE id = '${id(91)}'`)).toBe('2021')
    expect(sql(`SELECT status FROM applicants WHERE id = '${id(90)}'`)).toBe('finalist')
  })

  it('validates transitions, preserves legacy status/history and publishes a safe snapshot once', () => {
    insert(1)
    insert(2)
    insert(3, 'pending')
    insert(4, 'finalist', 2025)
    insert(5, 'pending')
    expect(() => sql(rpc('stage', `, p_applicant_id => '${id(3)}', p_stage => 'semifinalist'`))).toThrow()
    expect(() => sql(rpc('stage', `, p_applicant_id => '${id(1)}', p_stage => 'finalist'`))).toThrow()
    expect(() => sql(rpc('applicant_status', `, p_applicant_id => '${id(4)}', p_stage => 'pending'`))).toThrow()
    for (const n of [1, 2]) sql(`SET ROLE service_role; ${rpc('stage', `, p_applicant_id => '${id(n)}', p_stage => 'semifinalist'`)}`)
    const history = sql(`SELECT semifinalist_at FROM selection_entries WHERE applicant_id = '${id(1)}'`)
    sql(rpc('stage', `, p_applicant_id => '${id(1)}', p_stage => 'finalist_draft'`))
    sql(rpc('stage', `, p_applicant_id => '${id(1)}', p_stage => 'reset_finalist_draft'`))
    sql(rpc('stage', `, p_applicant_id => '${id(1)}', p_stage => 'finalist_draft'`))
    sql(rpc('stage', `, p_applicant_id => '${id(3)}', p_stage => 'not_selected_faculty'`))
    sql(rpc('announcement', ", p_year => 2026, p_title => 'Title', p_body => 'Body'"))
    sql(`UPDATE applicants SET study_program = NULL WHERE id = '${id(1)}'`)
    expect(() => sql(publish(2026, [1]))).toThrow()
    expect(sql(`SELECT stage FROM selection_entries WHERE applicant_id = '${id(1)}'`)).toBe('finalist_draft')
    expect(sql('SELECT count(*) FROM selection_announcements WHERE published_at IS NOT NULL')).toBe('0')
    sql(`UPDATE applicants SET study_program = (SELECT id::text FROM study_programs WHERE code = 'TI') WHERE id = '${id(1)}'`)
    sql(`SET ROLE service_role; ${publish(2026, [1])}`)
    const snapshot = sql('SELECT snapshot_json FROM selection_announcements WHERE year = 2026')
    expect(JSON.parse(snapshot)).toEqual([{ id: id(1), full_name: 'Name 1', faculty: 'Fakultas Teknik', study_program: 'Teknik Informatika', gender: null, photo_url: null }])
    expect(sql(`SELECT semifinalist_at FROM selection_entries WHERE applicant_id = '${id(1)}'`)).toBe(history)
    expect(sql(`SELECT stage FROM selection_entries WHERE applicant_id = '${id(2)}'`)).toBe('not_selected_university')
    expect(sql(`SELECT stage FROM selection_entries WHERE applicant_id = '${id(3)}'`)).toBe('not_selected_faculty')
    expect(sql(`SELECT status FROM applicants WHERE id = '${id(1)}'`)).toBe('verified')
    sql(rpc('publish', ', p_year => 2026'))
    expect(sql('SELECT snapshot_json FROM selection_announcements WHERE year = 2026')).toBe(snapshot)
    expect(() => sql(rpc('stage', `, p_applicant_id => '${id(2)}', p_stage => 'finalist_draft'`))).toThrow()
    expect(() => sql(rpc('announcement', ", p_year => 2026, p_title => 'Changed', p_body => 'Changed'"))).toThrow()
    expect(() => sql(rpc('applicant_status', `, p_applicant_id => '${id(5)}', p_stage => 'verified'`))).toThrow(/dipublikasikan/)
    expect(() => insert(6)).toThrow(/pendaftaran ditutup/)
    expect(() => sql(rpc('delete', `, p_applicant_id => '${id(1)}'`))).toThrow(/tidak dapat dihapus/)
    sql(save(1, { full_name: 'Edited after publication', photo_url: '/after.png', bio: 'Updated bio', tahun: '2026' }))
    expect(sql(`SELECT full_name FROM applicants WHERE id = '${id(1)}'`)).toBe('Edited after publication')
    expect(sql(`SELECT photo_url FROM finalist_profiles WHERE applicant_id = '${id(1)}'`)).toBe('/after.png')
    expect(sql('SELECT snapshot_json FROM selection_announcements WHERE year = 2026')).toBe(snapshot)
    sql(rpc('delete', `, p_applicant_id => '${id(4)}'`))
    expect(sql(`SELECT count(*) FROM applicants WHERE id = '${id(4)}'`)).toBe('0')
  })

  it('serializes a racing draft mutation behind publication', async () => {
    sql(rpc('registration_year', ', p_year => 2027'))
    insert(10, 'verified', 2027)
    insert(11, 'verified', 2027)
    for (const n of [10, 11]) sql(rpc('stage', `, p_applicant_id => '${id(n)}', p_stage => 'semifinalist'`))
    sql(rpc('stage', `, p_applicant_id => '${id(10)}', p_stage => 'finalist_draft'`))
    sql(rpc('announcement', ", p_year => 2027, p_title => 'Race', p_body => 'Body'"))
    const connection = spawn('psql', ['-X', '-h', root, '-p', port, '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'])
    let output = ''
    const locked = new Promise<void>(resolve => connection.stdout.on('data', chunk => {
      output += chunk.toString()
      if (output.includes('LOCK_READY')) resolve()
    }))
    const finished = new Promise<number | null>(resolve => connection.on('close', resolve))
    connection.stdin.end(`BEGIN; SELECT pg_advisory_xact_lock(10010, 2027); SELECT 'LOCK_READY'; SELECT pg_sleep(0.3); ${publish(2027, [10], 'Race')} COMMIT;`)
    await locked
    expect(() => sql(rpc('stage', `, p_applicant_id => '${id(11)}', p_stage => 'finalist_draft'`))).toThrow()
    expect(await finished).toBe(0)
    expect(sql(`SELECT stage FROM selection_entries WHERE applicant_id = '${id(11)}'`)).toBe('not_selected_university')
  })

  it('blocks inactive-year publication and validates JSON scalar year settings in the transaction', () => {
    insert(20, 'verified', 2028)
    sql(rpc('stage', `, p_applicant_id => '${id(20)}', p_stage => 'semifinalist'`))
    sql(rpc('stage', `, p_applicant_id => '${id(20)}', p_stage => 'finalist_draft'`))
    sql(rpc('announcement', ", p_year => 2028, p_title => 'Active year', p_body => 'Body'"))
    for (const value of ['2027', '[2028]', '{"year":2028}', 'true', 'null', '2028.5']) {
      sql(`UPDATE settings SET value = '${value}'::jsonb WHERE key = 'selection_year'`)
      expect(() => sql(rpc('publish', ', p_year => 2028'))).toThrow(/tahun seleksi aktif/)
      expect(sql(`SELECT stage FROM selection_entries WHERE applicant_id = '${id(20)}'`)).toBe('finalist_draft')
    }
    sql(`UPDATE settings SET value = '"2028"'::jsonb WHERE key = 'selection_year'`)
    sql(publish(2028, [20], 'Active year'))
    expect(sql(`SELECT stage FROM selection_entries WHERE applicant_id = '${id(20)}'`)).toBe('finalist')
  })

  it('serializes a racing active-year change before checking publication eligibility', async () => {
    insert(30, 'verified', 2029)
    sql(rpc('stage', `, p_applicant_id => '${id(30)}', p_stage => 'semifinalist'`))
    sql(rpc('stage', `, p_applicant_id => '${id(30)}', p_stage => 'finalist_draft'`))
    sql(rpc('announcement', ", p_year => 2029, p_title => 'Year race', p_body => 'Body'"))
    sql(rpc('registration_year', ', p_year => 2029'))
    const connection = spawn('psql', ['-X', '-h', root, '-p', port, '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'])
    let output = ''
    const locked = new Promise<void>(resolve => connection.stdout.on('data', chunk => {
      output += chunk.toString()
      if (output.includes('LOCK_READY')) resolve()
    }))
    const finished = new Promise<number | null>(resolve => connection.on('close', resolve))
    connection.stdin.end(`BEGIN; ${rpc('registration_year', ', p_year => 2030')} SELECT 'LOCK_READY'; SELECT pg_sleep(0.3); COMMIT;`)
    await locked
    expect(() => sql(rpc('publish', ', p_year => 2029'))).toThrow(/tahun seleksi aktif/)
    expect(await finished).toBe(0)
    expect(sql(`SELECT stage FROM selection_entries WHERE applicant_id = '${id(30)}'`)).toBe('finalist_draft')
    expect(sql('SELECT count(*) FROM selection_announcements WHERE year = 2029 AND published_at IS NOT NULL')).toBe('0')
  })

  it('atomically saves applicant/profile data and rolls back both on profile failures', () => {
    insert(40, 'verified', 2031)
    for (const key of ['status', 'selection_year', 'applicant_id', 'role']) {
      expect(() => sql(save(40, { tahun: '2031', [key]: 'forged' }))).toThrow(/Kolom finalis tidak valid/)
    }
    expect(() => sql(save(999, { tahun: '2031' }))).toThrow(/tidak ditemukan/)
    sql(`CREATE FUNCTION fail_test_profile() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.bio = 'FAIL' THEN RAISE EXCEPTION 'profile write failed'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER fail_test_profile BEFORE INSERT OR UPDATE ON finalist_profiles FOR EACH ROW EXECUTE FUNCTION fail_test_profile();`)
    expect(() => sql(save(40, { full_name: 'Changed', bio: 'FAIL', tahun: '2031' }))).toThrow(/profile write failed/)
    expect(sql(`SELECT full_name FROM applicants WHERE id = '${id(40)}'`)).toBe('Name 40')
    expect(sql(`SELECT count(*) FROM finalist_profiles WHERE applicant_id = '${id(40)}'`)).toBe('0')
    sql(save(40, { bio: 'Old bio', photo_url: '/old.png', tahun: '2031' }))
    expect(() => sql(save(40, { full_name: 'Changed', bio: 'FAIL', photo_url: '/new.png', tahun: '2031' }))).toThrow(/profile write failed/)
    expect(sql(`SELECT full_name FROM applicants WHERE id = '${id(40)}'`)).toBe('Name 40')
    expect(sql(`SELECT bio || ':' || photo_url FROM finalist_profiles WHERE applicant_id = '${id(40)}'`)).toBe('Old bio:/old.png')
    sql('DROP TRIGGER fail_test_profile ON finalist_profiles; DROP FUNCTION fail_test_profile();')
  })

  it('serializes profile saves with publication and never rewrites the historical snapshot', async () => {
    insert(50, 'verified', 2032)
    sql(rpc('registration_year', ', p_year => 2032'))
    sql(rpc('stage', `, p_applicant_id => '${id(50)}', p_stage => 'semifinalist'`))
    sql(rpc('stage', `, p_applicant_id => '${id(50)}', p_stage => 'finalist_draft'`))
    sql(rpc('announcement', ", p_year => 2032, p_title => 'Title', p_body => 'Body'"))
    const editing = holdTransaction(save(50, { full_name: 'Before publish', photo_url: '/before.png', tahun: '2032' }))
    await editing.locked
    expect(sql('SELECT pg_try_advisory_xact_lock(10010, 2032)')).toBe('f')
    sql(publish(2032, [50]))
    expect(await editing.finished).toBe(0)
    const snapshot = sql('SELECT snapshot_json FROM selection_announcements WHERE year = 2032')
    expect(JSON.parse(snapshot)[0]).toMatchObject({ full_name: 'Before publish', photo_url: '/before.png' })
    const publishing = holdTransaction(publish(2032, [50]))
    await publishing.locked
    sql(save(50, { full_name: 'After publish', photo_url: '/after.png', tahun: '2032' }))
    expect(await publishing.finished).toBe(0)
    expect(sql('SELECT snapshot_json FROM selection_announcements WHERE year = 2032')).toBe(snapshot)
  })

  it('guards registration and deletion racing a publication commit', async () => {
    insert(60, 'verified', 2033)
    sql(rpc('registration_year', ', p_year => 2033'))
    sql(rpc('stage', `, p_applicant_id => '${id(60)}', p_stage => 'semifinalist'`))
    sql(rpc('stage', `, p_applicant_id => '${id(60)}', p_stage => 'finalist_draft'`))
    sql(rpc('announcement', ", p_year => 2033, p_title => 'Title', p_body => 'Body'"))
    const publishing = holdTransaction(publish(2033, [60]))
    await publishing.locked
    const deleting = spawn('psql', ['-X', '-h', root, '-p', port, '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'])
    let deleteError = ''
    deleting.stderr.on('data', chunk => { deleteError += chunk.toString() })
    const deleted = new Promise<number | null>(resolve => deleting.on('close', resolve))
    deleting.stdin.end(rpc('delete', `, p_applicant_id => '${id(60)}'`))
    expect(() => insert(61, 'pending', 2033)).toThrow(/pendaftaran ditutup/)
    expect(await publishing.finished).toBe(0)
    expect(await deleted).toBe(3)
    expect(deleteError).toMatch(/tidak dapat dihapus/)
    expect(sql(`SELECT count(*) FROM applicants WHERE id = '${id(60)}'`)).toBe('1')
    expect(sql(`SELECT count(*) FROM applicants WHERE id = '${id(61)}'`)).toBe('0')
  })

  it('rejects stale or omitted preview data, including same-size candidate replacements', () => {
    for (const n of [70, 71]) {
      insert(n, 'verified', 2034)
      sql(rpc('stage', `, p_applicant_id => '${id(n)}', p_stage => 'semifinalist'`))
    }
    sql(rpc('registration_year', ', p_year => 2034'))
    sql(rpc('stage', `, p_applicant_id => '${id(70)}', p_stage => 'finalist_draft'`))
    sql(rpc('announcement', ", p_year => 2034, p_title => 'Title', p_body => 'Body'"))
    expect(() => sql(rpc('publish', ', p_year => 2034'))).toThrow(/Muat ulang/)
    expect(() => sql(publish(2034, [70], 'Changed title'))).toThrow(/Muat ulang/)
    expect(() => sql(publish(2034, [70], 'Title', 'Changed body'))).toThrow(/Muat ulang/)
    expect(() => sql(publish(2034, [70, 70]))).toThrow(/Muat ulang/)
    sql(rpc('stage', `, p_applicant_id => '${id(71)}', p_stage => 'finalist_draft'`))
    expect(() => sql(publish(2034, [70]))).toThrow(/Muat ulang/)
    sql(rpc('stage', `, p_applicant_id => '${id(70)}', p_stage => 'reset_finalist_draft'`))
    expect(() => sql(publish(2034, [70]))).toThrow(/Muat ulang/)
    expect(sql('SELECT count(*) FROM selection_announcements WHERE year = 2034 AND published_at IS NOT NULL')).toBe('0')
    sql(publish(2034, [71]))
    sql(rpc('publish', ', p_year => 2034'))
    expect(JSON.parse(sql('SELECT snapshot_json FROM selection_announcements WHERE year = 2034'))[0].id).toBe(id(71))
  })

  describe('service-only manual semifinalist RPC', () => {
    afterEach(() => {
      sql(`DELETE FROM applicants WHERE selection_year BETWEEN 2041 AND 2045;
        DELETE FROM selection_announcements WHERE year BETWEEN 2041 AND 2045;`)
    })

    it('restricts program enrichment to the service role, including for authenticated admins', () => {
      const call = `SELECT public.set_selection_study_program('${id(299)}', '${id(299)}');`
      for (const role of ['anon', 'authenticated']) {
        expect(sql(`SELECT has_function_privilege('${role}', 'public.set_selection_study_program(uuid,uuid)', 'EXECUTE')`)).toBe('f')
        expect(() => sql(`SET ROLE ${role}; ${call}`)).toThrow(/permission denied for function set_selection_study_program/)
      }
      expect(() => sql(`BEGIN;
        INSERT INTO auth.users (id, email) VALUES ('${id(298)}', 'program-admin@example.com');
        UPDATE profiles SET role = 'admin' WHERE id = '${id(298)}';
        SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub = '${id(298)}';
        ${call} COMMIT;`)).toThrow(/permission denied for function set_selection_study_program/)
      expect(sql("SELECT has_function_privilege('service_role', 'public.set_selection_study_program(uuid,uuid)', 'EXECUTE')")).toBe('t')
    })

    it('validates programs and selection state before completing and publishing a manual semifinalist', () => {
      const applicantId = sql(manual(211)).split('\n').at(-1)!
      const programId = sql("SELECT id FROM study_programs WHERE code = 'TI'")
      const otherProgramId = sql("SELECT id FROM study_programs WHERE faculty_id <> (SELECT id FROM faculties WHERE code = 'FT') LIMIT 1")
      const setProgram = (program: string) => `SET ROLE service_role; SELECT public.set_selection_study_program('${applicantId}', ${program});`
      for (const program of ['NULL', `'${id(299)}'`, `'${otherProgramId}'`]) {
        expect(() => sql(setProgram(program))).toThrow(/Program studi tidak valid/)
      }
      expect(() => sql(setProgram("'not-a-uuid'"))).toThrow(/invalid input syntax/)
      expect(() => sql(`BEGIN; UPDATE study_programs SET is_active = false WHERE id = '${programId}'; ${setProgram(`'${programId}'`)} COMMIT;`)).toThrow(/Program studi tidak valid/)
      for (const change of [
        `UPDATE applicants SET status = 'pending' WHERE id = '${applicantId}';`,
        `UPDATE applicants SET status = 'finalist' WHERE id = '${applicantId}';`,
        `UPDATE selection_entries SET stage = 'finalist' WHERE applicant_id = '${applicantId}';`,
        `UPDATE selection_entries SET stage = 'not_selected_university' WHERE applicant_id = '${applicantId}';`,
        `UPDATE selection_entries SET year = 2042 WHERE applicant_id = '${applicantId}';`,
        `UPDATE selection_entries SET semifinalist_at = NULL WHERE applicant_id = '${applicantId}';`,
        `DELETE FROM selection_entries WHERE applicant_id = '${applicantId}';`,
      ]) expect(() => sql(`BEGIN; ${change} ${setProgram(`'${programId}'`)} COMMIT;`)).toThrow(/Tahap peserta tidak valid/)
      expect(() => sql(`SELECT public.set_selection_study_program('${id(299)}', '${programId}');`)).toThrow(/tidak ditemukan/)
      expect(sql(`SELECT study_program IS NULL FROM applicants WHERE id = '${applicantId}'`)).toBe('t')
      const history = sql(`SELECT semifinalist_at FROM selection_entries WHERE applicant_id = '${applicantId}'`)
      sql(setProgram(`'${programId}'`))
      sql(rpc('stage', `, p_applicant_id => '${applicantId}', p_stage => 'finalist_draft'`))
      sql(setProgram(`'${programId}'`))
      expect(sql(`SELECT selection_year FROM applicants WHERE id = '${applicantId}'`)).toBe('2041')
      expect(sql(`SELECT semifinalist_at FROM selection_entries WHERE applicant_id = '${applicantId}'`)).toBe(history)
      sql(rpc('registration_year', ', p_year => 2041'))
      sql(rpc('announcement', ", p_year => 2041, p_title => 'Title', p_body => 'Body'"))
      sql(rpc('publish', `, p_year => 2041, p_expected_ids => ARRAY['${applicantId}']::uuid[], p_expected_title => 'Title', p_expected_body => 'Body'`))
      const snapshot = sql('SELECT snapshot_json FROM selection_announcements WHERE year = 2041')
      expect(JSON.parse(snapshot)[0]).toMatchObject({ id: applicantId, study_program: 'Teknik Informatika' })
      expect(() => sql(setProgram(`'${programId}'`))).toThrow(/dipublikasikan/)
      expect(sql('SELECT snapshot_json FROM selection_announcements WHERE year = 2041')).toBe(snapshot)
    })

    it('serializes program enrichment behind the year lock before locking the applicant', async () => {
      const applicantId = sql(manual(212, { year: 2045 })).split('\n').at(-1)!
      const programId = sql("SELECT id FROM study_programs WHERE code = 'TI'")
      const call = `SELECT public.set_selection_study_program('${applicantId}', '${programId}');`
      const editing = holdTransaction(call)
      await editing.locked
      expect(sql('SELECT pg_try_advisory_xact_lock(10010, 2045)')).toBe('f')
      expect(await editing.finished).toBe(0)
      const publishing = holdTransaction(`SELECT pg_advisory_xact_lock(10010, 2045);
        INSERT INTO selection_announcements (year, published_at) VALUES (2045, now());`)
      await publishing.locked
      expect(() => sql(`SET ROLE service_role; ${call}`)).toThrow(/dipublikasikan/)
      expect(await publishing.finished).toBe(0)
      expect(sql(`SELECT study_program FROM applicants WHERE id = '${applicantId}'`)).toBe(programId)
    })

    it('denies anon, authenticated users and authenticated admins', () => {
      for (const role of ['anon', 'authenticated']) {
        expect(() => sql(`SET ROLE ${role}; ${manual(201)}`)).toThrow(/permission denied for function create_manual_semifinalist/)
        expect(sql(`SELECT has_function_privilege('${role}', 'public.create_manual_semifinalist(text,text,uuid,text,integer)', 'EXECUTE')`)).toBe('f')
      }
      expect(() => sql(`BEGIN;
        INSERT INTO auth.users (id, email) VALUES ('${id(201)}', 'manual-admin@example.com');
        UPDATE profiles SET role = 'admin' WHERE id = '${id(201)}';
        SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub = '${id(201)}';
        ${manual(201)} COMMIT;`)).toThrow(/permission denied for function create_manual_semifinalist/)
      expect(sql("SELECT has_function_privilege('service_role', 'public.create_manual_semifinalist(text,text,uuid,text,integer)', 'EXECUTE')")).toBe('t')
      expect(sql('SELECT count(*) FROM applicants WHERE selection_year = 2041')).toBe('0')
    })

    it.each(['Laki-laki', 'Perempuan'])('creates a verified %s semifinalist with null missing fields and no consent', gender => {
      const applicantId = sql(`SET ROLE service_role; ${manual(202, { full_name: '  Manual 202  ', phone: ' +62 (813) 2000-0202 ', gender })}`).split('\n').at(-1)!
      expect(applicantId).toMatch(/^[0-9a-f-]{36}$/)
      const applicant = JSON.parse(sql(`SELECT row_to_json(a) FROM applicants a WHERE id = '${applicantId}'`))
      expect(applicant).toMatchObject({
        id: applicantId, full_name: 'Manual 202', phone: '+62 (813) 2000-0202',
        faculty: sql("SELECT id::text FROM faculties WHERE code = 'FT'"), gender,
        selection_year: 2041, status: 'verified', consent: false,
        created_at: expect.any(String), updated_at: expect.any(String),
      })
      for (const field of [
        'user_id', 'email', 'date_of_birth', 'place_of_birth', 'nim', 'study_program', 'semester',
        'address', 'city', 'province', 'height_cm', 'weight_kg', 'occupation', 'education',
        'instagram', 'tiktok', 'facebook', 'ipk', 'foreign_language', 'photo_url',
        'passport_photo_url', 'fullbody_photo_url', 'ktm_url', 'ktp_url', 'cv_url', 'statement_letter_url', 'essay',
      ]) expect(applicant[field], field).toBeNull()
      const entry = JSON.parse(sql(`SELECT row_to_json(e) FROM selection_entries e WHERE applicant_id = '${applicantId}'`))
      expect(entry).toEqual({ applicant_id: applicantId, year: 2041, stage: 'semifinalist', semifinalist_at: expect.any(String) })
      expect(Number.isNaN(Date.parse(entry.semifinalist_at))).toBe(false)
      expect(sql(`SELECT count(*) FROM finalist_profiles WHERE applicant_id = '${applicantId}'`)).toBe('0')
    })

    it('rejects trimmed case-insensitive duplicate names and normalized phones only within the same year', () => {
      sql(`SET ROLE service_role; ${manual(203, { full_name: '  Manual Name  ', phone: '+62 (813) 2000-0203' })}`)
      sql("UPDATE applicants SET full_name = '  MANUAL NAME  ' WHERE selection_year = 2041")
      expect(() => sql(`SET ROLE service_role; ${manual(204, { full_name: '  manual name  ' })}`)).toThrow(/sudah terdaftar/)
      for (const phone of ['081320000203', '6281320000203', '+6281320000203', ' +62 (813) 2000-0203 ']) {
        expect(() => sql(`SET ROLE service_role; ${manual(204, { phone })}`)).toThrow(/sudah terdaftar/)
      }
      expect(sql('SELECT count(*) FROM applicants WHERE selection_year = 2041')).toBe('1')
      expect(sql('SELECT count(*) FROM selection_entries WHERE year = 2041')).toBe('1')
      sql(`SET ROLE service_role; ${manual(203, { full_name: 'manual name', year: 2042 })}`)
      expect(sql('SELECT count(*) FROM applicants WHERE selection_year = 2042')).toBe('1')
      expect(sql('SELECT count(*) FROM selection_entries WHERE year = 2042')).toBe('1')
    })

    it.each<Record<string, string | number | null>>([
      { full_name: null }, { full_name: '' }, { full_name: ' ab ' }, { full_name: 'a'.repeat(201) },
      { phone: null }, { phone: '0812' }, { phone: '+18005551234' }, { phone: '081320000205?text=x' },
      { phone: '081320000205\n' }, { phone: '08123 abc' }, { gender: null }, { gender: 'Other' },
      { year: null }, { year: 1999 }, { year: 2101 }, { year: '2041.5' },
      { faculty: null }, { faculty: id(299) },
    ])('rejects invalid RPC fields %j without either row', fields => {
      expect(() => sql(`SET ROLE service_role; ${manual(205, fields)}`)).toThrow(/Data semifinalis tidak valid|Fakultas tidak ditemukan|invalid input syntax/)
      expect(sql("SELECT count(*) FROM applicants WHERE phone = '081320000205' OR selection_year = 2041")).toBe('0')
      expect(sql('SELECT count(*) FROM selection_entries WHERE year = 2041')).toBe('0')
    })

    it('allows draft announcements but rejects new applicants after publication without changing the snapshot', () => {
      sql("INSERT INTO selection_announcements (year, title, body) VALUES (2043, 'Manual selection', 'Body')")
      sql(`SET ROLE service_role; ${manual(206, { year: 2043 })}`)
      sql("UPDATE selection_announcements SET published_at = now(), snapshot_json = '[]'::jsonb WHERE year = 2043")
      const announcement = sql('SELECT row_to_json(a) FROM selection_announcements a WHERE year = 2043')
      expect(() => sql(`SET ROLE service_role; ${manual(207, { year: 2043 })}`)).toThrow(/dipublikasikan/)
      expect(sql('SELECT row_to_json(a) FROM selection_announcements a WHERE year = 2043')).toBe(announcement)
      expect(sql('SELECT count(*) FROM applicants WHERE selection_year = 2043')).toBe('1')
      expect(sql('SELECT count(*) FROM selection_entries WHERE year = 2043')).toBe('1')
      sql(`SET ROLE service_role; ${manual(207, { year: 2042 })}`)
      expect(sql('SELECT count(*) FROM selection_entries WHERE year = 2042')).toBe('1')
    })

    it('rolls back the applicant on selection insertion failure and rolls back the temporary failing trigger', () => {
      expect(() => sql(`BEGIN;
        CREATE FUNCTION fail_manual_selection_test() RETURNS trigger LANGUAGE plpgsql AS $$
          BEGIN RAISE EXCEPTION 'manual selection insert failed'; END $$;
        CREATE TRIGGER fail_manual_selection_test BEFORE INSERT ON selection_entries
          FOR EACH ROW EXECUTE FUNCTION fail_manual_selection_test();
        SET LOCAL ROLE service_role; ${manual(208, { year: 2044 })} COMMIT;`)).toThrow(/manual selection insert failed/)
      expect(sql("SELECT count(*) FROM applicants WHERE phone = '081320000208'")).toBe('0')
      expect(sql('SELECT count(*) FROM selection_entries WHERE year = 2044')).toBe('0')
      expect(sql("SELECT count(*) FROM pg_trigger WHERE tgname = 'fail_manual_selection_test'")).toBe('0')
      expect(sql("SELECT to_regprocedure('public.fail_manual_selection_test()') IS NULL")).toBe('t')
      sql(`SET ROLE service_role; ${manual(208, { year: 2044 })}`)
      expect(sql("SELECT count(*) FROM applicants WHERE phone = '081320000208'")).toBe('1')
      expect(sql('SELECT count(*) FROM selection_entries WHERE year = 2044')).toBe('1')
    })
  })
})
