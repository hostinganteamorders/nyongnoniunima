import { getLocalDb, isUsingLocalDb } from '@/lib/db/local'
import { getAdminClient, requireAdmin } from '@/lib/supabase/admin'

export interface ApplicantExportRow {
  id: string
  full_name: string
  nim: string | null
  email: string | null
  phone: string | null
  gender: string | null
  place_of_birth: string | null
  date_of_birth: string | null
  faculty: string | null
  study_program: string | null
  semester: number | null
  ipk: number | null
  selection_year: number | null
  status: string
  selection_stage: string | null
  created_at: string | null
  height_cm: number | null
  weight_kg: number | null
  address: string | null
  city: string | null
  province: string | null
  occupation: string | null
  education: string | null
  foreign_language: string | null
  instagram: string | null
  tiktok: string | null
  facebook: string | null
  essay: string | null
}

const applicantColumns = 'id,full_name,nim,email,phone,gender,place_of_birth,date_of_birth,faculty,study_program,semester,ipk,selection_year,status,created_at,height_cm,weight_kg,address,city,province,occupation,education,foreign_language,instagram,tiktok,facebook,essay'
const sources = {
  applicants: { columns: applicantColumns, key: 'id', newest: true },
  selection_entries: { columns: 'applicant_id,year,stage', key: 'applicant_id', newest: false },
  selection_announcements: { columns: 'year,published_at', key: 'year', newest: false },
  finalist_profiles: { columns: 'applicant_id,instagram,created_at,id', key: 'id', newest: true },
  faculties: { columns: 'id,name', key: 'id', newest: false },
  study_programs: { columns: 'id,name', key: 'id', newest: false },
} as const

export async function getApplicantExportRows(search?: string): Promise<ApplicantExportRow[]> {
  await requireAdmin()

  const local = isUsingLocalDb() ? getLocalDb() : null
  const client = local ? null : getAdminClient()
  async function read<T>(table: keyof typeof sources): Promise<T[]> {
    const { columns, key, newest } = sources[table]
    if (local) {
      return local.prepare(`SELECT ${columns} FROM ${table} ORDER BY ${newest ? 'created_at DESC, ' : ''}${key} ASC`).all() as T[]
    }

    const rows: T[] = []
    const pageSize = 500
    let cursor: string | number | undefined
    // Not a snapshot: inserts behind the cursor are excluded; later keys may appear.
    for (;;) {
      let query = client!.from(table).select(columns).order(key, { ascending: true }).limit(pageSize)
      if (cursor !== undefined) query = query.gt(key, cursor)
      const { data, error } = await query
      if (error) throw new Error(error.message)
      if (!Array.isArray(data)) throw new Error(`Missing export data: ${table}`)
      for (const row of data as unknown[]) {
        const next = (row as Record<string, string | number | undefined> | null)?.[key]
        if (next === undefined
          || (key === 'year' ? typeof next !== 'number' || !Number.isSafeInteger(next) : typeof next !== 'string' || !next.length)
          || (cursor !== undefined && next <= cursor)) {
          throw new Error(`Invalid export cursor: ${table}`)
        }
        cursor = next
      }
      rows.push(...data as T[])
      if (data.length < pageSize) return rows
    }
  }

  const [applicants, entries, announcements, profiles, faculties, programs] = await Promise.all([
    read<Omit<ApplicantExportRow, 'selection_stage'>>('applicants'),
    read<{ applicant_id: string; year: number; stage: string }>('selection_entries'),
    read<{ year: number; published_at: string | null }>('selection_announcements'),
    read<{ id: string; applicant_id: string; instagram: string | null; created_at: string | null }>('finalist_profiles'),
    read<{ id: string; name: string }>('faculties'),
    read<{ id: string; name: string }>('study_programs'),
  ])
  function newestFirst(a: { created_at: string | null; id: string }, b: { created_at: string | null; id: string }): number {
    const dateA = a.created_at ?? ''
    const dateB = b.created_at ?? ''
    return dateA < dateB ? 1 : dateA > dateB ? -1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  }
  applicants.sort(newestFirst)
  profiles.sort(newestFirst)
  const publishedYears = new Set(announcements.filter(a => a.published_at).map(a => a.year))
  const entryMap = new Map(entries.map(e => [e.applicant_id, e]))
  const profileMap = new Map<string, typeof profiles[number]>()
  for (const profile of profiles) {
    if (!profileMap.has(profile.applicant_id)) profileMap.set(profile.applicant_id, profile)
  }
  const facultyMap = new Map(faculties.map(f => [f.id, f.name]))
  const programMap = new Map(programs.map(p => [p.id, p.name]))
  const needle = (search ?? '').toLowerCase()

  return applicants.map((a): ApplicantExportRow => {
    const entry = entryMap.get(a.id)
    const published = entry?.stage === 'finalist' && entry.year === a.selection_year && publishedYears.has(entry.year)
    // Construct the whitelist explicitly, even if a database/mock returns extra fields.
    return {
      id: a.id,
      full_name: a.full_name,
      nim: a.nim ?? null,
      email: a.email ?? null,
      phone: a.phone ?? null,
      gender: a.gender ?? null,
      place_of_birth: a.place_of_birth ?? null,
      date_of_birth: a.date_of_birth ?? null,
      faculty: facultyMap.get(a.faculty ?? '') ?? a.faculty ?? null,
      study_program: programMap.get(a.study_program ?? '') ?? a.study_program ?? null,
      semester: a.semester ?? null,
      ipk: a.ipk ?? null,
      selection_year: a.selection_year ?? null,
      status: published ? 'finalist' : a.status,
      selection_stage: entry?.stage ?? null,
      created_at: a.created_at ?? null,
      height_cm: a.height_cm ?? null,
      weight_kg: a.weight_kg ?? null,
      address: a.address ?? null,
      city: a.city ?? null,
      province: a.province ?? null,
      occupation: a.occupation ?? null,
      education: a.education ?? null,
      foreign_language: a.foreign_language ?? null,
      instagram: profileMap.get(a.id)?.instagram || a.instagram || null,
      tiktok: a.tiktok ?? null,
      facebook: a.facebook ?? null,
      essay: a.essay ?? null,
    }
  }).filter(a => [a.full_name, a.email, a.city].some(value => (value ?? '').toLowerCase().includes(needle)))
}
