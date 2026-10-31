import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type Database from 'better-sqlite3'
import { revalidatePath } from 'next/cache'

const auth = vi.hoisted(() => ({ requireAdmin: vi.fn(async () => ({})), getAdminClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => auth)
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

let dir: string
let db: Database.Database
let selection: typeof import('@/server/actions/selection')

const valid = { full_name: 'Manual Semifinalist', phone: '081320000201', faculty: 'ft', gender: 'Perempuan', selection_year: 2026 }
const sparseFields = [
  'user_id', 'email', 'date_of_birth', 'place_of_birth', 'nim', 'study_program', 'semester',
  'address', 'city', 'province', 'height_cm', 'weight_kg', 'occupation', 'education',
  'instagram', 'tiktok', 'facebook', 'ipk', 'foreign_language', 'photo_url',
  'passport_photo_url', 'fullbody_photo_url', 'ktm_url', 'ktp_url', 'cv_url', 'statement_letter_url', 'essay',
]

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  auth.requireAdmin.mockResolvedValue({})
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'manual-semifinalist-backend-'))
  vi.spyOn(process, 'cwd').mockReturnValue(dir)
  db = (await import('@/lib/db/local')).getLocalDb()
  selection = await import('@/server/actions/selection')
})

afterEach(() => {
  db?.close()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('manual semifinalists with SQLite persistence', () => {
  it.each(['Laki-laki', 'Perempuan'])('creates a verified %s applicant and semifinalist entry from only five fields', async gender => {
    await selection.createManualSemifinalist({ ...valid, full_name: `  ${valid.full_name}  `, phone: ' +62 (813) 2000-0201 ', gender })
    const rows = db.prepare('SELECT * FROM applicants').all() as Record<string, unknown>[]
    expect(rows).toHaveLength(1)
    const applicant = rows[0]
    expect(applicant).toMatchObject({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/), full_name: valid.full_name, phone: '+62 (813) 2000-0201',
      faculty: 'ft', gender, selection_year: 2026, status: 'verified', consent: 0,
      created_at: expect.any(String), updated_at: expect.any(String),
    })
    expect(Object.fromEntries(sparseFields.map(field => [field, applicant[field]])))
      .toEqual(Object.fromEntries(sparseFields.map(field => [field, null])))
    const entries = db.prepare('SELECT * FROM selection_entries').all()
    expect(entries).toEqual([{
      applicant_id: applicant.id, year: 2026, stage: 'semifinalist', semifinalist_at: expect.any(String),
    }])
    expect(Number.isNaN(Date.parse((entries[0] as { semifinalist_at: string }).semifinalist_at))).toBe(false)
    expect((await selection.getSelectionAdminData(2026)).applicants).toEqual([expect.objectContaining({
      id: applicant.id, status: 'verified', stage: 'semifinalist', study_program: null,
    })])
    expect(auth.getAdminClient).not.toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith('/admin/selection')
    expect(db.pragma('foreign_key_check')).toEqual([])
  })

  it('rejects duplicate names case-insensitively with whitespace on either stored or submitted names', async () => {
    await selection.createManualSemifinalist(valid)
    db.prepare('UPDATE applicants SET full_name = ?').run('  MANUAL SEMIFINALIST  ')
    const original = db.prepare('SELECT * FROM applicants').all()
    await expect(selection.createManualSemifinalist({ ...valid, full_name: '  manual semifinalist  ', phone: '081320000202' }))
      .rejects.toThrow(/sudah terdaftar/)
    expect(db.prepare('SELECT * FROM applicants').all()).toEqual(original)
    expect(db.prepare('SELECT count(*) AS n FROM selection_entries').get()).toEqual({ n: 1 })
  })

  it.each(['081320000201', '6281320000201', '+6281320000201', ' +62 (813) 2000-0201 '])('rejects the normalized duplicate phone %s in the same year', async phone => {
    await selection.createManualSemifinalist(valid)
    await expect(selection.createManualSemifinalist({ ...valid, full_name: 'Different Name', phone }))
      .rejects.toThrow(/sudah terdaftar/)
    expect(db.prepare('SELECT count(*) AS n FROM applicants').get()).toEqual({ n: 1 })
    expect(db.prepare('SELECT count(*) AS n FROM selection_entries').get()).toEqual({ n: 1 })
  })

  it('normalizes an existing formatted phone and permits the same name and phone in another year', async () => {
    await selection.createManualSemifinalist({ ...valid, phone: '+62 (813) 2000-0201' })
    await expect(selection.createManualSemifinalist({ ...valid, full_name: 'Different Name' })).rejects.toThrow(/sudah terdaftar/)
    await selection.createManualSemifinalist({ ...valid, selection_year: 2027 })
    expect(db.prepare('SELECT selection_year, status FROM applicants ORDER BY selection_year').all()).toEqual([
      { selection_year: 2026, status: 'verified' }, { selection_year: 2027, status: 'verified' },
    ])
    expect(db.prepare('SELECT year, stage FROM selection_entries ORDER BY year').all()).toEqual([
      { year: 2026, stage: 'semifinalist' }, { year: 2027, stage: 'semifinalist' },
    ])
  })

  it.each([
    { full_name: '' }, { full_name: '  ab  ' }, { full_name: 'a'.repeat(201) },
    { phone: '0812' }, { phone: '+18005551234' }, { phone: '081320000201?text=x' }, { phone: '08123 abc' },
    { gender: 'Other' }, { gender: '' }, { selection_year: 1999 }, { selection_year: 2101 },
    { selection_year: 2026.5 }, { selection_year: '2026' }, { selection_year: null }, { faculty: '' },
    { status: 'finalist' }, { consent: true }, { study_program: 'ft_ti' }, { email: 'invented@example.com' },
  ])('rejects invalid or extra fields %j before any database access', async overrides => {
    const prepare = vi.spyOn(db, 'prepare')
    await expect(selection.createManualSemifinalist({ ...valid, ...overrides } as never)).rejects.toThrow()
    expect(prepare).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it.each(['full_name', 'phone', 'faculty', 'gender', 'selection_year'])('requires %s', async field => {
    const input: Record<string, unknown> = { ...valid }
    delete input[field]
    await expect(selection.createManualSemifinalist(input as never)).rejects.toThrow()
    expect(db.prepare('SELECT count(*) AS n FROM applicants').get()).toEqual({ n: 0 })
    expect(db.prepare('SELECT count(*) AS n FROM selection_entries').get()).toEqual({ n: 0 })
  })

  it('rejects an unknown faculty without creating either row', async () => {
    await expect(selection.createManualSemifinalist({ ...valid, faculty: 'unknown' })).rejects.toThrow(/Fakultas tidak ditemukan/)
    expect(db.prepare('SELECT count(*) AS n FROM applicants').get()).toEqual({ n: 0 })
    expect(db.prepare('SELECT count(*) AS n FROM selection_entries').get()).toEqual({ n: 0 })
  })

  it('allows an unpublished announcement but freezes a published year without affecting another year', async () => {
    await selection.saveSelectionAnnouncement(2026, 'Title', 'Body')
    await selection.createManualSemifinalist(valid)
    db.prepare("UPDATE selection_announcements SET published_at = datetime('now') WHERE year = 2026").run()
    const original = db.prepare('SELECT * FROM applicants').all()
    await expect(selection.createManualSemifinalist({ ...valid, full_name: 'Late Applicant', phone: '081320000202' }))
      .rejects.toThrow(/dipublikasikan/)
    expect(db.prepare('SELECT * FROM applicants').all()).toEqual(original)
    await selection.createManualSemifinalist({ ...valid, selection_year: 2027 })
    expect(db.prepare('SELECT count(*) AS n FROM selection_entries').get()).toEqual({ n: 2 })
  })

  it('requires admin authorization before parsing input or accessing either database client', async () => {
    auth.requireAdmin.mockRejectedValue(new Error('Unauthorized'))
    const prepare = vi.spyOn(db, 'prepare')
    await expect(selection.createManualSemifinalist(valid)).rejects.toThrow('Unauthorized')
    await expect(selection.createManualSemifinalist({} as never)).rejects.toThrow('Unauthorized')
    expect(prepare).not.toHaveBeenCalled()
    expect(auth.getAdminClient).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('rolls back the applicant when inserting the selection entry fails', async () => {
    db.exec(`CREATE TRIGGER fail_manual_selection BEFORE INSERT ON selection_entries
      BEGIN SELECT RAISE(ABORT, 'selection insert failed'); END;`)
    await expect(selection.createManualSemifinalist(valid)).rejects.toThrow('selection insert failed')
    expect(db.prepare('SELECT count(*) AS n FROM applicants').get()).toEqual({ n: 0 })
    expect(db.prepare('SELECT count(*) AS n FROM selection_entries').get()).toEqual({ n: 0 })
    expect(revalidatePath).not.toHaveBeenCalled()
    db.exec('DROP TRIGGER fail_manual_selection')
    await selection.createManualSemifinalist(valid)
    expect(db.prepare('SELECT count(*) AS n FROM applicants').get()).toEqual({ n: 1 })
    expect(db.prepare('SELECT count(*) AS n FROM selection_entries').get()).toEqual({ n: 1 })
  })

  it('does not bypass the existing study-program requirement for publishing finalists', async () => {
    await selection.createManualSemifinalist(valid)
    const { id } = db.prepare('SELECT id FROM applicants').get() as { id: string }
    await selection.updateSelectionStage(id, 'finalist_draft')
    await selection.saveSelectionAnnouncement(2026, 'Title', 'Body')
    await expect(selection.publishFinalists(2026, { candidateIds: [id], title: 'Title', body: 'Body' }))
      .rejects.toThrow(/Data calon finalis tidak valid/)
    expect(db.prepare('SELECT stage FROM selection_entries').get()).toEqual({ stage: 'finalist_draft' })
    expect(db.prepare('SELECT published_at, snapshot_json FROM selection_announcements').get()).toEqual({ published_at: null, snapshot_json: '[]' })
  })

  it('completes a manual semifinalist, drafts and publishes without changing selection year or other missing fields', async () => {
    await selection.createManualSemifinalist(valid)
    const { id } = db.prepare('SELECT id FROM applicants').get() as { id: string }
    const entry = db.prepare('SELECT * FROM selection_entries').get()
    await selection.setSelectionStudyProgram(id, 'ft_ti')
    expect(db.prepare('SELECT study_program, selection_year, email FROM applicants').get()).toEqual({ study_program: 'ft_ti', selection_year: 2026, email: null })
    expect(db.prepare('SELECT * FROM selection_entries').get()).toEqual(entry)
    await selection.updateSelectionStage(id, 'finalist_draft')
    await selection.setSelectionStudyProgram(id, 'ft_ti')
    await selection.saveSelectionAnnouncement(2026, 'Title', 'Body')
    await selection.publishFinalists(2026, { candidateIds: [id], title: 'Title', body: 'Body' })
    expect(db.prepare('SELECT stage FROM selection_entries').get()).toEqual({ stage: 'finalist' })
    const announcement = (await selection.getPublishedSelectionAnnouncements())[0]
    expect(announcement.participants).toEqual([expect.objectContaining({ id, study_program: 'Teknik Informatika' })])
    await expect(selection.setSelectionStudyProgram(id, 'ft_ti')).rejects.toThrow(/dipublikasikan/)
  })

  it('rejects invalid, missing, inactive and wrong-faculty programs without changing the applicant', async () => {
    await selection.createManualSemifinalist(valid)
    const { id } = db.prepare('SELECT id FROM applicants').get() as { id: string }
    db.prepare("INSERT INTO study_programs (id, faculty_id, name, code, is_active) VALUES ('inactive', 'ft', 'Inactive', 'INACTIVE', 0)").run()
    const other = db.prepare("SELECT id FROM study_programs WHERE faculty_id <> 'ft' AND is_active = 1 LIMIT 1").get() as { id: string }
    const original = db.prepare('SELECT * FROM applicants').get()
    for (const program of ['', null, 123, 'unknown', 'inactive', other.id]) {
      await expect(selection.setSelectionStudyProgram(id, program as string)).rejects.toThrow(/program studi|Program studi/)
      expect(db.prepare('SELECT * FROM applicants').get()).toEqual(original)
    }
    await expect(selection.setSelectionStudyProgram('unknown', 'ft_ti')).rejects.toThrow(/tidak ditemukan/)
    await expect(selection.setSelectionStudyProgram('', 'ft_ti')).rejects.toThrow(/tidak valid/)
  })

  it.each([
    { status: 'pending', stage: 'semifinalist', year: 2026, history: '2026-10-01' },
    { status: 'finalist', stage: 'semifinalist', year: 2026, history: '2026-10-01' },
    { status: 'verified', stage: 'finalist', year: 2026, history: '2026-10-01' },
    { status: 'verified', stage: 'not_selected_university', year: 2026, history: '2026-10-01' },
    { status: 'verified', stage: 'semifinalist', year: 2027, history: '2026-10-01' },
    { status: 'verified', stage: 'semifinalist', year: 2026, history: null },
  ])('rejects ineligible selection state %j', async ({ status, stage, year, history }) => {
    await selection.createManualSemifinalist(valid)
    const { id } = db.prepare('SELECT id FROM applicants').get() as { id: string }
    db.prepare('UPDATE applicants SET status = ? WHERE id = ?').run(status, id)
    db.prepare('UPDATE selection_entries SET stage = ?, year = ?, semifinalist_at = ? WHERE applicant_id = ?').run(stage, year, history, id)
    await expect(selection.setSelectionStudyProgram(id, 'ft_ti')).rejects.toThrow(/Tahap peserta tidak valid/)
    db.prepare('DELETE FROM selection_entries').run()
    await expect(selection.setSelectionStudyProgram(id, 'ft_ti')).rejects.toThrow(/Tahap peserta tidak valid/)
    expect(db.prepare('SELECT study_program, selection_year FROM applicants').get()).toEqual({ study_program: null, selection_year: 2026 })
  })

  it('authorizes program enrichment before validation or database access', async () => {
    auth.requireAdmin.mockRejectedValue(new Error('Unauthorized'))
    const prepare = vi.spyOn(db, 'prepare')
    await expect(selection.setSelectionStudyProgram('', '')).rejects.toThrow('Unauthorized')
    expect(prepare).not.toHaveBeenCalled()
    expect(auth.getAdminClient).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('uses only the dedicated remote RPC and propagates failures', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    const rpc = vi.fn().mockResolvedValueOnce({ error: { message: 'Program studi tidak valid' } }).mockResolvedValue({ error: null })
    auth.getAdminClient.mockReturnValue({ rpc })
    await expect(selection.setSelectionStudyProgram('applicant-id', 'program-id')).rejects.toThrow('Program studi tidak valid')
    expect(revalidatePath).not.toHaveBeenCalled()
    await selection.setSelectionStudyProgram('applicant-id', 'program-id')
    expect(rpc).toHaveBeenLastCalledWith('set_selection_study_program', { p_applicant_id: 'applicant-id', p_program_id: 'program-id' })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/selection')
  })
})
