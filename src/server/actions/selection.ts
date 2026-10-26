'use server'

import { requireAdmin, getAdminClient } from '@/lib/supabase/admin'
import { getLocalDb, isUsingLocalDb, localQuery } from '@/lib/db/local'
import { AUDITION_START } from '@/lib/validations/registration'
import { revalidatePath } from 'next/cache'
import {
  isValidWhatsAppGroupUrl, nextSelectionStage, parseSelectionYear, selectionAnnouncement, validateSelectionYear,
  type SelectionStage, type SelectionApplicant, type SelectionAdminData, type SelectionAnnouncement,
} from '@/lib/selection'

type AnnouncementRow = { year: number; title: string; body: string; published_at: string | null; snapshot_json: string }

async function activeRegistrationYear(): Promise<number> {
  let value: unknown
  if (isUsingLocalDb()) {
    const row = localQuery<{ value: string }>('settings', { where: { key: 'selection_year' } })[0]
    value = row?.value
  } else {
    const { data, error } = await getAdminClient().from('settings').select('value').eq('key', 'selection_year').maybeSingle()
    if (error) throw new Error(error.message)
    value = data?.value
  }
  return parseSelectionYear(value, Number(AUDITION_START.slice(0, 4)))
}

function refreshSelection(): void {
  for (const route of ['/admin/selection', '/admin/applicants', '/admin/finalists', '/finalists', '/announcements', '/register']) revalidatePath(route)
}

export async function getSelectionAdminData(year?: number): Promise<SelectionAdminData> {
  await requireAdmin()
  if (year !== undefined) validateSelectionYear(year)
  const activeYear = await activeRegistrationYear()
  year ??= activeYear
  let applicants: SelectionApplicant[]
  let entries: { applicant_id: string; year: number; stage: SelectionStage; semifinalist_at: string | null }[]
  let faculties: SelectionAdminData['faculties']
  let programs: { id: string; name: string }[]
  let groups: SelectionAdminData['groups']
  let announcements: AnnouncementRow[]
  if (isUsingLocalDb()) {
    applicants = localQuery<SelectionApplicant>('applicants', { orderBy: { column: 'created_at', direction: 'DESC' } })
    entries = localQuery('selection_entries')
    faculties = localQuery('faculties', { orderBy: { column: 'name' } })
    programs = localQuery('study_programs')
    groups = localQuery('faculty_whatsapp_groups', { where: { year } })
    announcements = localQuery('selection_announcements')
  } else {
    const client = getAdminClient()
    const results = await Promise.all([
      client.from('applicants').select('id, full_name, phone, faculty, study_program, gender, photo_url, status, selection_year').order('created_at', { ascending: false }),
      client.from('selection_entries').select('*'),
      client.from('faculties').select('id, name').order('name'),
      client.from('faculty_whatsapp_groups').select('faculty_id, invite_url').eq('year', year),
      client.from('selection_announcements').select('*'),
      client.from('study_programs').select('id, name'),
    ])
    for (const result of results) if (result.error) throw new Error(result.error.message)
    ;[applicants, entries, faculties, groups, announcements, programs] = results.map(r => r.data || []) as [typeof applicants, typeof entries, typeof faculties, typeof groups, typeof announcements, typeof programs]
  }
  const years = [...new Set([activeYear, year, ...applicants.map(a => a.selection_year), ...announcements.map(a => a.year)])].sort((a, b) => b - a)
  const entryMap = new Map(entries.map(e => [e.applicant_id, e]))
  const announcement = announcements.find(a => a.year === year)
  const programNames = new Map(programs.map(p => [p.id, p.name]))
  return {
    year, activeYear, years,
    faculties: faculties.map(f => ({ id: f.id, name: f.name })),
    groups: groups.map(g => ({ faculty_id: g.faculty_id, invite_url: g.invite_url })),
    applicants: applicants.filter(a => a.selection_year === year).map(a => {
      const e = entryMap.get(a.id)
      return {
        id: a.id, full_name: a.full_name, phone: a.phone, faculty: a.faculty, study_program: programNames.get(a.study_program || '') || a.study_program,
        gender: a.gender, photo_url: a.photo_url, status: a.status, selection_year: a.selection_year,
        stage: e?.stage ?? null, semifinalist_at: e?.semifinalist_at ?? null,
      }
    }),
    announcement: announcement ? selectionAnnouncement(announcement) : null,
  }
}

export async function setRegistrationYear(year: number): Promise<void> {
  await requireAdmin()
  validateSelectionYear(year)
  if (isUsingLocalDb()) {
    getLocalDb().prepare(`INSERT INTO settings (id, key, value) VALUES (?, 'selection_year', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`).run(crypto.randomUUID(), JSON.stringify(year))
  } else {
    const { error } = await getAdminClient().rpc('mutate_selection', { p_operation: 'registration_year', p_year: year })
    if (error) throw new Error(error.message)
  }
  refreshSelection()
}

export async function updateSelectionStage(applicantId: string, stage: SelectionStage | 'reset_finalist_draft'): Promise<void> {
  await requireAdmin()
  if (typeof applicantId !== 'string' || !applicantId) throw new Error('Peserta tidak valid')
  if (!['semifinalist', 'finalist_draft', 'not_selected_faculty', 'not_selected_university', 'reset_finalist_draft'].includes(stage)) throw new Error('Tahap tidak valid; finalis hanya melalui publikasi')
  if (isUsingLocalDb()) {
    const db = getLocalDb()
    db.transaction(() => {
      const applicant = db.prepare('SELECT status, selection_year FROM applicants WHERE id = ?').get(applicantId) as { status: string; selection_year: number } | undefined
      if (!applicant) throw new Error('Peserta tidak ditemukan')
      const announcement = db.prepare('SELECT published_at FROM selection_announcements WHERE year = ?').get(applicant.selection_year) as { published_at: string | null } | undefined
      if (announcement?.published_at) throw new Error('Seleksi tahun ini sudah dipublikasikan')
      const entry = db.prepare('SELECT year, stage, semifinalist_at FROM selection_entries WHERE applicant_id = ?').get(applicantId) as { year: number; stage: SelectionStage; semifinalist_at: string | null } | undefined
      if (entry && entry.year !== applicant.selection_year) throw new Error('Tahun tahap seleksi tidak sesuai')
      const next = nextSelectionStage(applicant.status, entry?.stage ?? null, stage)
      const semifinalistAt = entry?.semifinalist_at ?? (next === 'semifinalist' ? new Date().toISOString() : null)
      db.prepare(`INSERT INTO selection_entries (applicant_id, year, stage, semifinalist_at) VALUES (?, ?, ?, ?)
        ON CONFLICT(applicant_id) DO UPDATE SET stage = excluded.stage, semifinalist_at = excluded.semifinalist_at`).run(applicantId, applicant.selection_year, next, semifinalistAt)
    }).immediate()
  } else {
    const { error } = await getAdminClient().rpc('mutate_selection', { p_operation: 'stage', p_applicant_id: applicantId, p_stage: stage })
    if (error) throw new Error(error.message)
  }
  refreshSelection()
}

export async function saveFacultyWhatsAppGroup(year: number, facultyId: string, url: string): Promise<void> {
  await requireAdmin()
  validateSelectionYear(year)
  if (typeof facultyId !== 'string' || !facultyId || typeof url !== 'string' || (url !== '' && !isValidWhatsAppGroupUrl(url))) throw new Error('Fakultas atau tautan grup tidak valid')
  if (isUsingLocalDb()) {
    const db = getLocalDb()
    db.transaction(() => {
      if (!db.prepare('SELECT id FROM faculties WHERE id = ?').get(facultyId)) throw new Error('Fakultas tidak ditemukan')
      if (!url) db.prepare('DELETE FROM faculty_whatsapp_groups WHERE year = ? AND faculty_id = ?').run(year, facultyId)
      else db.prepare(`INSERT INTO faculty_whatsapp_groups (year, faculty_id, invite_url) VALUES (?, ?, ?)
        ON CONFLICT(year, faculty_id) DO UPDATE SET invite_url = excluded.invite_url`).run(year, facultyId, url)
    }).immediate()
  } else {
    const { error } = await getAdminClient().rpc('mutate_selection', { p_operation: 'group', p_year: year, p_faculty_id: facultyId, p_url: url })
    if (error) throw new Error(error.message)
  }
  refreshSelection()
}

export async function saveSelectionAnnouncement(year: number, title: string, body: string): Promise<void> {
  await requireAdmin()
  validateSelectionYear(year)
  if (typeof title !== 'string' || typeof body !== 'string' || title.length > 200 || body.length > 20000) throw new Error('Isi pengumuman tidak valid')
  title = title.trim()
  body = body.trim()
  if (isUsingLocalDb()) {
    const db = getLocalDb()
    db.transaction(() => {
      const existing = db.prepare('SELECT published_at FROM selection_announcements WHERE year = ?').get(year) as AnnouncementRow | undefined
      if (existing?.published_at) throw new Error('Pengumuman sudah dipublikasikan')
      db.prepare(`INSERT INTO selection_announcements (year, title, body) VALUES (?, ?, ?)
        ON CONFLICT(year) DO UPDATE SET title = excluded.title, body = excluded.body`).run(year, title, body)
    }).immediate()
  } else {
    const { error } = await getAdminClient().rpc('mutate_selection', { p_operation: 'announcement', p_year: year, p_title: title, p_body: body })
    if (error) throw new Error(error.message)
  }
  refreshSelection()
}

export async function publishFinalists(year: number, expected?: { candidateIds: string[]; title: string; body: string }): Promise<void> {
  await requireAdmin()
  validateSelectionYear(year)
  if (!expected || !Array.isArray(expected.candidateIds) || expected.candidateIds.some(id => typeof id !== 'string' || !id)
    || new Set(expected.candidateIds).size !== expected.candidateIds.length || typeof expected.title !== 'string' || typeof expected.body !== 'string') {
    throw new Error('Pratinjau publikasi wajib disertakan. Muat ulang data seleksi.')
  }
  if (isUsingLocalDb()) {
    const db = getLocalDb()
    db.transaction(() => {
      const setting = db.prepare("SELECT value FROM settings WHERE key = 'selection_year'").get() as { value: string } | undefined
      const activeYear = parseSelectionYear(setting?.value, Number(AUDITION_START.slice(0, 4)))
      if (year !== activeYear) throw new Error('Hanya tahun seleksi aktif yang dapat dipublikasikan')
      const announcement = db.prepare('SELECT * FROM selection_announcements WHERE year = ?').get(year) as AnnouncementRow | undefined
      if (announcement?.published_at) return
      if (announcement?.title !== expected.title || announcement?.body !== expected.body) throw new Error('Pratinjau berubah. Muat ulang data seleksi sebelum publikasi.')
      if (!announcement?.title.trim() || !announcement.body.trim()) throw new Error('Judul dan isi pengumuman wajib diisi')
      const candidates = db.prepare(`SELECT a.id, a.full_name, a.faculty, a.study_program, a.gender,
        COALESCE((SELECT photo_url FROM finalist_profiles WHERE applicant_id = a.id AND photo_url IS NOT NULL ORDER BY created_at DESC LIMIT 1), a.photo_url) AS photo_url,
        a.status, a.selection_year, e.semifinalist_at,
        COALESCE(f.name, a.faculty) AS faculty_name, COALESCE(p.name, a.study_program) AS program_name
        FROM selection_entries e JOIN applicants a ON a.id = e.applicant_id
        LEFT JOIN faculties f ON f.id = a.faculty LEFT JOIN study_programs p ON p.id = a.study_program
        WHERE e.year = ? AND e.stage = 'finalist_draft' ORDER BY a.full_name, a.id`).all(year) as Array<{
          id: string; full_name: string; faculty_name: string; program_name: string; gender: string | null; photo_url: string | null;
          status: string; selection_year: number; semifinalist_at: string | null
        }>
      const expectedIds = new Set(expected.candidateIds)
      if (candidates.length !== expectedIds.size || candidates.some(a => !expectedIds.has(a.id))) throw new Error('Calon finalis berubah. Muat ulang data seleksi sebelum publikasi.')
      if (!candidates.length) throw new Error('Belum ada calon finalis')
      if (candidates.some(a => a.status !== 'verified' || a.selection_year !== year || !a.semifinalist_at || !a.full_name.trim() || !a.faculty_name?.trim() || !a.program_name?.trim())) throw new Error('Data calon finalis tidak valid')
      if (db.prepare(`SELECT 1 FROM selection_entries WHERE year = ? AND stage = 'finalist'`).get(year)) throw new Error('Tahap finalis tidak valid sebelum publikasi')
      const participants = candidates.map(a => ({ id: a.id, full_name: a.full_name, faculty: a.faculty_name, study_program: a.program_name, gender: a.gender, photo_url: a.photo_url }))
      db.prepare(`UPDATE selection_entries SET stage = CASE WHEN stage = 'finalist_draft' THEN 'finalist' ELSE 'not_selected_university' END
        WHERE year = ? AND stage IN ('finalist_draft', 'semifinalist')`).run(year)
      db.prepare('UPDATE selection_announcements SET published_at = ?, snapshot_json = ? WHERE year = ?').run(new Date().toISOString(), JSON.stringify(participants), year)
    }).immediate()
  } else {
    const { error } = await getAdminClient().rpc('mutate_selection', {
      p_operation: 'publish', p_year: year,
      p_expected_ids: expected.candidateIds, p_expected_title: expected.title, p_expected_body: expected.body,
    })
    if (error) throw new Error(error.message)
  }
  refreshSelection()
}

export async function getPublishedSelectionAnnouncements(): Promise<SelectionAnnouncement[]> {
  let rows: AnnouncementRow[]
  if (isUsingLocalDb()) {
    rows = localQuery<AnnouncementRow>('selection_announcements', { orderBy: { column: 'year', direction: 'DESC' } }).filter(a => a.published_at)
  } else {
    const { data, error } = await getAdminClient().from('selection_announcements').select('year, title, body, published_at, snapshot_json').not('published_at', 'is', null).order('year', { ascending: false })
    if (error) throw new Error(error.message)
    rows = data || []
  }
  return rows.map(selectionAnnouncement)
}
