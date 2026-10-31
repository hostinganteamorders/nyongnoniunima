// Input files contain private contacts; keep them outside version control.
const fs = require('node:fs')
const path = require('node:path')
const { createClient } = require('@supabase/supabase-js')

async function main() {
  const input = process.argv[2]
  if (!input || input.startsWith('--')) throw new Error('Usage: node --env-file=.env.local scripts/import-semifinalists.cjs <private.json> [--apply | --sql-file <private.sql>]')
  const roster = JSON.parse(fs.readFileSync(input, 'utf8'))
  if (!Array.isArray(roster) || !roster.length || roster.some(row => !row ||
    !['full_name', 'phone', 'faculty_code', 'gender'].every(key => typeof row[key] === 'string' && row[key].trim()) ||
    !['Laki-laki', 'Perempuan'].includes(row.gender) || !Number.isInteger(row.selection_year) || row.selection_year < 2000 || row.selection_year > 2100)) {
    throw new Error('Invalid semifinalist roster')
  }
  const sqlIndex = process.argv.indexOf('--sql-file')
  if (sqlIndex !== -1) {
    const output = process.argv[sqlIndex + 1]
    if (!output?.endsWith('.private.sql')) throw new Error('SQL output must end with .private.sql')
    const literal = JSON.stringify(roster).replace(/'/g, "''")
    const migration = fs.readFileSync(path.join(__dirname, '../supabase/migrations/00012_manual_semifinalists.sql'), 'utf8')
    const body = `DECLARE item jsonb; faculty_id uuid; normalized_phone text;
BEGIN
  FOR item IN SELECT value FROM jsonb_array_elements('${literal}'::jsonb) LOOP
    SELECT id INTO STRICT faculty_id FROM public.faculties WHERE code = item->>'faculty_code';
    normalized_phone := regexp_replace(regexp_replace(regexp_replace(item->>'phone', '[ ()-]', '', 'g'), '^0', '62'), '^\\+', '');
    IF NOT EXISTS (SELECT 1 FROM public.applicants a JOIN public.selection_entries e ON e.applicant_id = a.id
      WHERE a.selection_year = (item->>'selection_year')::integer AND e.year = a.selection_year AND e.semifinalist_at IS NOT NULL
      AND lower(btrim(a.full_name)) = lower(btrim(item->>'full_name'))
      AND regexp_replace(regexp_replace(regexp_replace(a.phone, '[ ()-]', '', 'g'), '^0', '62'), '^\\+', '') = normalized_phone
      AND a.faculty = faculty_id::text AND a.gender = item->>'gender') THEN
      PERFORM public.create_manual_semifinalist(item->>'full_name', item->>'phone', faculty_id, item->>'gender', (item->>'selection_year')::integer);
    END IF;
  END LOOP;
END;`
    fs.writeFileSync(output, `${migration}\nBEGIN;\nDO '${body.replace(/'/g, "''")}';\nCOMMIT;\n`, { flag: 'wx', mode: 0o600 })
    console.log(`Prepared migration and ${roster.length} semifinalists in ${output}. Not applied to Supabase.`)
    return
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase environment is required')
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  async function checked(query) {
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return data
  }
  const faculties = await checked(db.from('faculties').select('id,code'))
  const normalizePhone = value => value.replace(/[ ()-]/g, '').replace(/^0/, '62').replace(/^\+/, '')
  let added = 0, existing = 0
  for (const row of roster) {
    const faculty = faculties.find(f => f.code === row.faculty_code)
    if (!faculty) throw new Error(`Unknown faculty: ${row.faculty_code}`)
    const candidates = await checked(db.from('applicants').select('id,full_name,phone,faculty,gender').eq('selection_year', row.selection_year))
    const sameName = candidate => candidate.full_name.trim().toLowerCase() === row.full_name.trim().toLowerCase()
    const matches = candidates.filter(candidate => sameName(candidate) || normalizePhone(candidate.phone) === normalizePhone(row.phone))
    if (matches.length) {
      if (matches.length !== 1 || !sameName(matches[0]) || normalizePhone(matches[0].phone) !== normalizePhone(row.phone) || matches[0].faculty !== faculty.id || matches[0].gender !== row.gender) {
        throw new Error(`Conflicting participant: ${row.full_name}`)
      }
      const entries = await checked(db.from('selection_entries').select('stage,year,semifinalist_at').eq('applicant_id', matches[0].id))
      if (entries.length !== 1 || entries[0].year !== row.selection_year || !entries[0].semifinalist_at) throw new Error(`Participant already registered without semifinalist history: ${row.full_name}`)
      existing++
      continue
    }
    if (!process.argv.includes('--apply')) continue
    const id = await checked(db.rpc('create_manual_semifinalist', {
      p_full_name: row.full_name, p_phone: row.phone, p_faculty: faculty.id, p_gender: row.gender, p_year: row.selection_year,
    }))
    const entry = await checked(db.from('selection_entries').select('stage,year,semifinalist_at').eq('applicant_id', id).single())
    if (entry.stage !== 'semifinalist' || entry.year !== row.selection_year || !entry.semifinalist_at) throw new Error(`Read-back failed: ${row.full_name}`)
    added++
  }
  console.log(JSON.stringify({ total: roster.length, existing, added, pending: roster.length - existing - added, dryRun: !process.argv.includes('--apply') }))
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
