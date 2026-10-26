import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type Database from 'better-sqlite3'
import { AUDITION_START } from '@/lib/validations/registration'
import { buildSemifinalistWhatsAppUrl, isValidWhatsAppGroupUrl, normalizeIndonesianPhone, nextSelectionStage, parseSelectionYear } from '@/lib/selection'

const auth = vi.hoisted(() => ({ requireAdmin: vi.fn(async () => ({})), getAdminClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => auth)
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

let dir: string
let db: Database.Database
let selection: typeof import('@/server/actions/selection')
let applicants: typeof import('@/server/actions/applicants')
let finalists: typeof import('@/server/actions/finalists')

const VALID_REGISTRATION = {
  full_name: 'John Doe', email: 'john@example.com', phone: '081234567890', date_of_birth: '2004-05-15',
  place_of_birth: 'Manado', gender: 'Laki-laki', nim: '20123456', faculty: 'ft', study_program: 'ft_ti',
  semester: '4', ipk: '3.5', address: 'Jl. Contoh No. 123, Kelurahan, Kecamatan', city: 'Manado', province: 'Sulawesi Utara',
  height_cm: '175', weight_kg: '60', occupation: 'Mahasiswa', education: 'Sarjana S1', foreign_language: 'English',
  essay: 'I want to join Nyong Noni UNIMA because I am passionate about culture and tourism promotion in North Sulawesi.', consent: 'true',
}

function registrationForm() {
  const form = new FormData()
  for (const [key, value] of Object.entries(VALID_REGISTRATION)) form.set(key, value)
  form.set('submission_id', crypto.randomUUID())
  return form
}

function seed(id: string, status = 'pending', year = 2026) {
  db.prepare(`INSERT INTO applicants (id, full_name, email, phone, date_of_birth, address, city, province, faculty, study_program, status, selection_year, ktp_url)
    VALUES (?, ?, 'private@example.com', '081234567890', '2004-05-15', 'Private address', 'Manado', 'Sulut', 'ft', 'ft_ti', ?, ?, '/private/ktp.pdf')`).run(id, `Name ${id}`, status, year)
}

function preview(year: number) {
  const announcement = db.prepare('SELECT title, body FROM selection_announcements WHERE year = ?').get(year) as { title: string; body: string } | undefined
  const candidates = db.prepare("SELECT applicant_id FROM selection_entries WHERE year = ? AND stage = 'finalist_draft'").all(year) as { applicant_id: string }[]
  return { candidateIds: candidates.map(a => a.applicant_id), title: announcement?.title ?? '', body: announcement?.body ?? '' }
}

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  auth.requireAdmin.mockResolvedValue({})
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'selection-backend-'))
  vi.spyOn(process, 'cwd').mockReturnValue(dir)
  db = (await import('@/lib/db/local')).getLocalDb()
  selection = await import('@/server/actions/selection')
  applicants = await import('@/server/actions/applicants')
  finalists = await import('@/server/actions/finalists')
})

afterEach(() => {
  db?.close()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('staged selection workflow', () => {
  it('publishes drafts atomically, keeps history, snapshots names and preserves legacy finals', async () => {
    seed('draft', 'verified')
    seed('remaining', 'verified')
    seed('faculty-rejection')
    seed('legacy', 'finalist', 2025)
    for (const id of ['draft', 'remaining']) await selection.updateSelectionStage(id, 'semifinalist')
    const history = (await selection.getSelectionAdminData(2026)).applicants.find(a => a.id === 'draft')!.semifinalist_at
    await selection.updateSelectionStage('draft', 'finalist_draft')
    await selection.updateSelectionStage('draft', 'reset_finalist_draft')
    await selection.updateSelectionStage('draft', 'finalist_draft')
    await selection.updateSelectionStage('faculty-rejection', 'not_selected_faculty')
    expect((await applicants.getApplicants()).find(a => a.id === 'draft')).toMatchObject({ status: 'verified', selection_stage: 'finalist_draft' })
    expect((await finalists.getPublicFinalists()).map(a => a.id)).toEqual(['legacy'])
    expect(await finalists.getPublicFinalist('draft')).toBeNull()
    expect(await finalists.getPublicFinalist('remaining')).toBeNull()
    await selection.saveSelectionAnnouncement(2026, 'Finalis 2026', 'Pengumuman resmi')
    expect(await selection.getPublishedSelectionAnnouncements()).toEqual([])
    const expected = preview(2026)
    await Promise.all([selection.publishFinalists(2026, expected), selection.publishFinalists(2026, expected)])
    const data = await selection.getSelectionAdminData(2026)
    expect(data.applicants.find(a => a.id === 'draft')?.study_program).toBe('Teknik Informatika')
    expect(data.applicants.find(a => a.id === 'draft')).toMatchObject({ status: 'verified', stage: 'finalist', semifinalist_at: history })
    expect(data.applicants.find(a => a.id === 'remaining')).toMatchObject({ stage: 'not_selected_university', semifinalist_at: expect.any(String) })
    expect(data.applicants.find(a => a.id === 'faculty-rejection')).toMatchObject({ stage: 'not_selected_faculty', semifinalist_at: null })
    expect(data.announcement?.participants).toEqual([{ id: 'draft', full_name: 'Name draft', faculty: 'Fakultas Teknik', study_program: 'Teknik Informatika', gender: null, photo_url: null }])
    const publicData = await finalists.getPublicFinalist('draft')
    expect(Object.keys(publicData!).sort()).toEqual(['id', 'full_name', 'faculty', 'study_program', 'gender', 'photo_url', 'instagram', 'bio', 'umur', 'profile'].sort())
    expect(publicData?.profile).toEqual({ tahun: '2026' })
    expect(JSON.stringify(publicData)).not.toMatch(/private|email|phone|ktp|date_of_birth/)
    expect((await finalists.getPublicFinalists()).map(a => a.id).sort()).toEqual(['draft', 'legacy'])
    await finalists.updateFinalistData({ applicant_id: 'draft', bio: 'Biography', instagram: '@draft', photo_url: '/profile.png', tahun: '2026' })
    expect((await applicants.getApplicants()).find(a => a.id === 'draft')).toMatchObject({
      status: 'finalist', selection_stage: 'finalist', semifinalist_at: history,
      bio: 'Biography', instagram: '@draft', photo_url: '/profile.png', tahun: '2026',
    })
    expect(db.prepare("SELECT status FROM applicants WHERE id = 'draft'").get()).toEqual({ status: 'verified' })
    expect((await applicants.getApplicantStats()).finalist).toBe(2)
    await expect(selection.saveSelectionAnnouncement(2026, 'changed', 'changed')).rejects.toThrow()
    await expect(selection.updateSelectionStage('remaining', 'finalist_draft')).rejects.toThrow()
    seed('late', 'verified')
    await expect(selection.updateSelectionStage('late', 'semifinalist')).rejects.toThrow()
    db.prepare("UPDATE applicants SET full_name = 'Changed later' WHERE id = 'draft'").run()
    expect((await selection.getPublishedSelectionAnnouncements())[0].participants[0].full_name).toBe('Name draft')
  })

  it('rejects invalid transitions and runtime legacy finalist promotions', async () => {
    seed('pending')
    seed('legacy', 'finalist')
    await expect(selection.updateSelectionStage('pending', 'semifinalist')).rejects.toThrow()
    await expect(selection.updateSelectionStage('pending', 'finalist')).rejects.toThrow()
    await expect(selection.updateSelectionStage('pending', 'unknown' as never)).rejects.toThrow()
    await expect(applicants.updateApplicantStatus('pending', 'finalist')).rejects.toThrow()
    await expect(applicants.updateApplicantStatus('pending', 'unknown' as never)).rejects.toThrow()
    await expect(applicants.updateApplicantStatus('legacy', 'pending')).rejects.toThrow()
    await applicants.updateApplicantStatus('pending', 'verified')
    await selection.updateSelectionStage('pending', 'semifinalist')
    await expect(applicants.updateApplicantStatus('pending', 'rejected')).rejects.toThrow()
    await selection.updateSelectionStage('pending', 'not_selected_university')
    await expect(selection.updateSelectionStage('pending', 'semifinalist')).rejects.toThrow()
  })

  it('rolls back all publication changes when any draft is invalid', async () => {
    seed('valid', 'verified')
    seed('invalid', 'verified')
    for (const id of ['valid', 'invalid']) {
      await selection.updateSelectionStage(id, 'semifinalist')
      await selection.updateSelectionStage(id, 'finalist_draft')
    }
    await selection.saveSelectionAnnouncement(2026, 'Title', 'Body')
    db.prepare("UPDATE applicants SET status = 'pending' WHERE id = 'invalid'").run()
    await expect(selection.publishFinalists(2026, preview(2026))).rejects.toThrow()
    expect((await selection.getSelectionAdminData(2026)).applicants.every(a => a.stage === 'finalist_draft')).toBe(true)
    expect(await selection.getPublishedSelectionAnnouncements()).toEqual([])
    expect(await finalists.getPublicFinalists()).toEqual([])
  })

  it('requires an announcement and at least one candidate', async () => {
    await expect(selection.publishFinalists(2026, preview(2026))).rejects.toThrow()
    await selection.saveSelectionAnnouncement(2026, 'Title', 'Body')
    await expect(selection.publishFinalists(2026, preview(2026))).rejects.toThrow()
  })

  it('requires a preview and rejects changed metadata or candidate sets before any publication', async () => {
    for (const id of ['first', 'second']) {
      seed(id, 'verified')
      await selection.updateSelectionStage(id, 'semifinalist')
    }
    await selection.updateSelectionStage('first', 'finalist_draft')
    await selection.saveSelectionAnnouncement(2026, 'Title', 'Body')
    const expected = preview(2026)
    await expect(selection.publishFinalists(2026)).rejects.toThrow(/Muat ulang/)
    await expect(selection.publishFinalists(2026, { ...expected, candidateIds: ['first', 'first'] })).rejects.toThrow(/Muat ulang/)
    await selection.saveSelectionAnnouncement(2026, 'Changed', 'Body')
    await expect(selection.publishFinalists(2026, expected)).rejects.toThrow(/Muat ulang/)
    await selection.saveSelectionAnnouncement(2026, 'Title', 'Changed body')
    await expect(selection.publishFinalists(2026, expected)).rejects.toThrow(/Muat ulang/)
    await selection.saveSelectionAnnouncement(2026, 'Title', 'Body')
    await selection.updateSelectionStage('second', 'finalist_draft')
    await expect(selection.publishFinalists(2026, expected)).rejects.toThrow(/Muat ulang/)
    await selection.updateSelectionStage('first', 'reset_finalist_draft')
    await expect(selection.publishFinalists(2026, expected)).rejects.toThrow(/Muat ulang/)
    expect(await selection.getPublishedSelectionAnnouncements()).toEqual([])
    await selection.publishFinalists(2026, preview(2026))
    expect((await selection.getPublishedSelectionAnnouncements())[0].participants.map(p => p.id)).toEqual(['second'])
  })

  it('rolls back applicant edits when inserting or updating a finalist profile fails', async () => {
    seed('edit', 'verified')
    db.exec(`CREATE TRIGGER fail_profile_insert BEFORE INSERT ON finalist_profiles BEGIN SELECT RAISE(ABORT, 'profile insert failed'); END;`)
    const failedInsert = await finalists.updateFinalistData({ applicant_id: 'edit', full_name: 'Changed name', bio: 'Bio', tahun: '2026' })
    expect(failedInsert.error).toContain('profile insert failed')
    expect(db.prepare("SELECT full_name FROM applicants WHERE id = 'edit'").get()).toEqual({ full_name: 'Name edit' })
    expect(db.prepare('SELECT count(*) AS n FROM finalist_profiles').get()).toEqual({ n: 0 })
    db.exec('DROP TRIGGER fail_profile_insert')
    expect((await finalists.updateFinalistData({ applicant_id: 'edit', bio: 'Old bio', photo_url: '/old.png', tahun: '2026' })).error).toBeUndefined()
    db.exec(`CREATE TRIGGER fail_profile_update BEFORE UPDATE ON finalist_profiles BEGIN SELECT RAISE(ABORT, 'profile update failed'); END;`)
    const failedUpdate = await finalists.updateFinalistData({ applicant_id: 'edit', full_name: 'Changed name', bio: 'New bio', photo_url: '/new.png', tahun: '2026' })
    expect(failedUpdate.error).toContain('profile update failed')
    expect(db.prepare("SELECT full_name FROM applicants WHERE id = 'edit'").get()).toEqual({ full_name: 'Name edit' })
    expect(db.prepare("SELECT bio, photo_url FROM finalist_profiles WHERE applicant_id = 'edit'").get()).toEqual({ bio: 'Old bio', photo_url: '/old.png' })
  })

  it('freezes unselected status changes and protects published finalists from deletion', async () => {
    seed('selected', 'verified')
    seed('unselected', 'pending')
    seed('legacy', 'finalist', 2025)
    await selection.updateSelectionStage('selected', 'semifinalist')
    await selection.updateSelectionStage('selected', 'finalist_draft')
    await selection.saveSelectionAnnouncement(2026, 'Title', 'Body')
    await selection.publishFinalists(2026, preview(2026))
    await expect(applicants.updateApplicantStatus('unselected', 'verified')).rejects.toThrow(/dipublikasikan/)
    await expect(applicants.deleteApplicant('selected')).rejects.toThrow(/tidak dapat dihapus/)
    expect(await finalists.getPublicFinalist('selected')).not.toBeNull()
    await applicants.deleteApplicant('legacy')
    expect(await finalists.getPublicFinalist('legacy')).toBeNull()
  })

  it('enforces the active year inside local publication and rejects non-scalar year settings', async () => {
    seed('inactive', 'verified', 2027)
    await selection.updateSelectionStage('inactive', 'semifinalist')
    await selection.updateSelectionStage('inactive', 'finalist_draft')
    await selection.saveSelectionAnnouncement(2027, 'Inactive year', 'Body')
    await expect(selection.publishFinalists(2027, preview(2027))).rejects.toThrow(/tahun seleksi aktif/)
    await selection.setRegistrationYear(2027)
    for (const value of [[2027], { year: 2027 }, true, null, 2027.5]) {
      db.prepare("UPDATE settings SET value = ? WHERE key = 'selection_year'").run(JSON.stringify(value))
      expect((await selection.getSelectionAdminData()).activeYear).toBe(Number(AUDITION_START.slice(0, 4)))
      await expect(selection.publishFinalists(2027, preview(2027))).rejects.toThrow(/tahun seleksi aktif/)
    }
    db.prepare("UPDATE settings SET value = ? WHERE key = 'selection_year'").run(JSON.stringify('2027'))
    expect((await selection.getSelectionAdminData()).activeYear).toBe(2027)
    await selection.publishFinalists(2027, preview(2027))
    expect((await selection.getPublishedSelectionAnnouncements())[0].year).toBe(2027)
  })

  it('has no per-faculty or gender quotas', async () => {
    for (let n = 0; n < 12; n++) {
      const id = `candidate-${n}`
      seed(id, 'verified')
      await selection.updateSelectionStage(id, 'semifinalist')
      await selection.updateSelectionStage(id, 'finalist_draft')
    }
    await selection.saveSelectionAnnouncement(2026, 'All selected', 'No quota')
    await selection.publishFinalists(2026, preview(2026))
    expect((await selection.getPublishedSelectionAnnouncements())[0].participants).toHaveLength(12)
    expect(await finalists.getPublicFinalists()).toHaveLength(12)
  })

  it('never exposes an unannounced finalist stage or private fields from profiles/snapshots', async () => {
    seed('hidden', 'verified')
    db.prepare("INSERT INTO selection_entries VALUES ('hidden', 2026, 'finalist', datetime('now'))").run()
    expect(await finalists.getPublicFinalist('hidden')).toBeNull()
    db.prepare("INSERT INTO selection_announcements VALUES (2026, 'Title', 'Body', NULL, '[]')").run()
    expect(await finalists.getPublicFinalist('hidden')).toBeNull()
    db.prepare("UPDATE selection_announcements SET published_at = datetime('now'), snapshot_json = ?").run(JSON.stringify([{ id: 'hidden', full_name: 'Name', faculty: 'FT', study_program: 'TI', email: 'private', phone: 'private', ktp_url: 'private' }]))
    const snapshot = await selection.getPublishedSelectionAnnouncements()
    expect(JSON.stringify(snapshot)).not.toMatch(/private|email|phone|ktp/)
    db.prepare("INSERT INTO finalist_profiles (id, applicant_id, tahun, bio) VALUES ('p', 'hidden', '2026', 'Public bio')").run()
    expect(await finalists.getPublicFinalist('hidden')).toMatchObject({ bio: 'Public bio', profile: { tahun: '2026' } })
  })

  it('persists groups independently by faculty/year and supports clearing', async () => {
    const url = 'https://chat.whatsapp.com/Abc123'
    await selection.saveFacultyWhatsAppGroup(2026, 'ft', url)
    await selection.saveFacultyWhatsAppGroup(2025, 'ft', `${url}Old`)
    await selection.saveFacultyWhatsAppGroup(2026, 'fe', `${url}Other`)
    await selection.saveFacultyWhatsAppGroup(2026, 'ft', '')
    expect((await selection.getSelectionAdminData(2026)).groups).toEqual([{ faculty_id: 'fe', invite_url: `${url}Other` }])
    expect((await selection.getSelectionAdminData(2025)).groups).toEqual([{ faculty_id: 'ft', invite_url: `${url}Old` }])
    await expect(selection.saveFacultyWhatsAppGroup(2026, 'missing', url)).rejects.toThrow()
    await expect(selection.saveFacultyWhatsAppGroup(2026, 'ft', `${url}?evil=1`)).rejects.toThrow()
    db.close()
    vi.resetModules()
    db = (await import('@/lib/db/local')).getLocalDb()
    expect(db.prepare('SELECT count(*) AS n FROM faculty_whatsapp_groups').get()).toEqual({ n: 2 })
  })

  it('authenticates every admin entry point before any database access', async () => {
    auth.requireAdmin.mockRejectedValue(new Error('Unauthorized'))
    const prepare = vi.spyOn(db, 'prepare')
    const calls = [
      () => selection.getSelectionAdminData(), () => selection.setRegistrationYear(2027),
      () => selection.updateSelectionStage('id', 'semifinalist'), () => selection.saveFacultyWhatsAppGroup(2026, 'ft', ''),
      () => selection.saveSelectionAnnouncement(2026, 'Title', 'Body'), () => selection.publishFinalists(2026),
      () => applicants.updateApplicantStatus('id', 'verified'), () => applicants.createApplicant({} as never),
    ]
    for (const call of calls) await expect(call()).rejects.toThrow('Unauthorized')
    expect(prepare).not.toHaveBeenCalled()
    expect(auth.getAdminClient).not.toHaveBeenCalled()
  })

  it('uses configured registration year or audition fallback and keeps registration gated', async () => {
    const valid = { ...VALID_REGISTRATION }
    const form = new FormData()
    for (const [key, value] of Object.entries(valid)) form.set(key, value)
    expect((await applicants.submitRegistration(form)).error).toMatch(/ditutup/)
    db.prepare("UPDATE settings SET value = 'true' WHERE key = 'registration_open'").run()
    const initial = await applicants.submitRegistration(form)
    expect(initial).toEqual({ data: { id: expect.any(String) } })
    expect(db.prepare('SELECT selection_year FROM applicants WHERE id = ?').get(initial.data!.id)).toEqual({ selection_year: Number(AUDITION_START.slice(0, 4)) })
    await selection.setRegistrationYear(2027)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await applicants.submitRegistration(form)).error).toMatch(/belum dapat dikonfirmasi/)
    expect(log).toHaveBeenCalledOnce()
    const { saveAuditionDate } = await import('@/server/actions/registration-rules')
    await saveAuditionDate(2027, '2027-10-26')
    expect((await applicants.submitRegistration(form)).error).toMatch(/Usia maksimal/)
    valid.date_of_birth = '2005-05-15'
    form.set('date_of_birth', valid.date_of_birth)
    const next = await applicants.submitRegistration(form)
    expect(db.prepare('SELECT selection_year FROM applicants WHERE id = ?').get(next.data!.id)).toEqual({ selection_year: 2027 })
    expect((await selection.getSelectionAdminData()).activeYear).toBe(2027)
    expect((await applicants.createApplicant({ ...valid, consent: true, status: 'finalist' } as never)).error).toMatch(/Status/)
    await expect(selection.setRegistrationYear(2026.5)).rejects.toThrow()
    const stats = await applicants.getApplicantStats()
    expect(stats).toEqual({ total: 2, pending: 2, verified: 0, rejected: 0, finalist: 0 })
    db.prepare("INSERT INTO selection_announcements (year, published_at) VALUES (2027, datetime('now'))").run()
    expect((await applicants.submitRegistration(form)).error).toMatch(/dipublikasikan/)
    expect((await applicants.createApplicant({ ...valid, consent: true } as never)).error).toMatch(/dipublikasikan/)
    expect((await applicants.getApplicantStats()).total).toBe(2)
  })
})

describe('idempotent local public registration', () => {
  beforeEach(() => {
    db.prepare("UPDATE settings SET value = 'true' WHERE key = 'registration_open'").run()
  })

  it('returns only the same ID for sequential and concurrent retries and stores one row', async () => {
    const form = registrationForm()
    const expected = { data: { id: form.get('submission_id') } }
    expect(await applicants.submitRegistration(form)).toEqual(expected)
    expect(await applicants.submitRegistration(form)).toEqual(expected)
    expect(await Promise.all(Array.from({ length: 8 }, () => applicants.submitRegistration(form)))).toEqual(Array(8).fill(expected))
    expect(db.prepare('SELECT count(*) AS n FROM applicants').get()).toEqual({ n: 1 })
    expect(db.prepare('SELECT consent, selection_year FROM applicants').get()).toEqual({ consent: 1, selection_year: 2026 })
  })

  it('serializes concurrent first submissions under the same ID', async () => {
    const form = registrationForm()
    const results = await Promise.all(Array.from({ length: 8 }, () => applicants.submitRegistration(form)))
    expect(results).toEqual(Array(8).fill({ data: { id: form.get('submission_id') } }))
    expect(db.prepare('SELECT count(*) AS n FROM applicants').get()).toEqual({ n: 1 })
  })

  it('rejects changed data under an existing ID without overwriting or inserting', async () => {
    const form = registrationForm()
    await applicants.submitRegistration(form)
    const original = db.prepare('SELECT * FROM applicants').get()
    form.set('essay', `${VALID_REGISTRATION.essay} Changed content.`)
    expect((await applicants.submitRegistration(form)).error).toMatch(/ID pengiriman sudah digunakan/)
    expect(db.prepare('SELECT * FROM applicants').all()).toEqual([original])
  })

  it.each(['ipk', 'instagram', 'tiktok', 'facebook'])('rejects omitted optional %s when the stored value is populated', async field => {
    const form = registrationForm()
    form.set('semester', '2')
    if (field !== 'ipk') form.set(field, '@original')
    await applicants.submitRegistration(form)
    form.delete(field)
    expect((await applicants.submitRegistration(form)).error).toMatch(/ID pengiriman sudah digunakan/)
    expect(db.prepare('SELECT count(*) AS n FROM applicants').get()).toEqual({ n: 1 })
  })

  it('accepts omitted and blank optional fields roundtrip for semester two', async () => {
    const form = registrationForm()
    form.set('semester', '2')
    form.set('ipk', '')
    form.set('instagram', '')
    const expected = { data: { id: form.get('submission_id') } }
    expect(await applicants.submitRegistration(form)).toEqual(expected)
    expect(db.prepare('SELECT ipk, instagram, tiktok, facebook FROM applicants').get()).toEqual({ ipk: null, instagram: null, tiktok: null, facebook: null })
    form.delete('ipk')
    form.delete('instagram')
    form.set('tiktok', '')
    form.set('height_cm', '175.00')
    expect(await applicants.submitRegistration(form)).toEqual(expected)
    expect(db.prepare('SELECT count(*) AS n FROM applicants').get()).toEqual({ n: 1 })
  })

  it('checks replay before publication but still blocks fresh IDs after publication', async () => {
    const form = registrationForm()
    const expected = await applicants.submitRegistration(form)
    db.prepare("INSERT INTO selection_announcements (year, published_at) VALUES (2026, datetime('now'))").run()
    expect(await applicants.submitRegistration(form)).toEqual(expected)
    form.set('submission_id', crypto.randomUUID())
    expect((await applicants.submitRegistration(form)).error).toMatch(/dipublikasikan/)
    expect(db.prepare('SELECT count(*) AS n FROM applicants').get()).toEqual({ n: 1 })
  })

  it('rejects reuse across registration years', async () => {
    const form = registrationForm()
    await applicants.submitRegistration(form)
    db.prepare('UPDATE applicants SET selection_year = 2025').run()
    expect((await applicants.submitRegistration(form)).error).toMatch(/ID pengiriman sudah digunakan/)
    expect(db.prepare('SELECT selection_year FROM applicants').all()).toEqual([{ selection_year: 2025 }])
  })
})

describe('selection year JSON parsing', () => {
  it.each([2027, '2027', '"2027"'])('accepts numeric or string year %j', value => {
    expect(parseSelectionYear(value, 2026)).toBe(2027)
  })
  it.each([undefined, null, true, [2027], { year: 2027 }, '[2027]', '{"year":2027}', 2027.5, '2027.5', 'bad', 1999, 2101])('falls back for invalid year %j', value => {
    expect(parseSelectionYear(value, 2026)).toBe(2026)
  })
})

describe('WhatsApp helper', () => {
  it.each(['081234567890', '6281234567890', '+6281234567890', '0812 3456 7890', ' +62 (812) 3456-7890 '])('normalizes %s and builds an encoded invitation, not a send claim', phone => {
    expect(normalizeIndonesianPhone(phone)).toBe('6281234567890')
    const url = new URL(buildSemifinalistWhatsAppUrl({ name: 'A & B', phone, faculty: 'Teknik', year: 2026, groupUrl: 'https://chat.whatsapp.com/Token123' }))
    expect(url.origin + url.pathname).toBe('https://wa.me/6281234567890')
    expect(url.searchParams.get('text')).toContain('Selamat A & B!')
    expect(url.searchParams.get('text')).toContain('lolos seleksi fakultas')
    expect(url.searchParams.get('text')).toContain('semifinalis seleksi universitas')
    expect(url.searchParams.get('text')).toContain('https://chat.whatsapp.com/Token123')
  })
  it.each(['0812', '621234567890', '+18005551234', '08123 abc', '628123456789012345', '081234567890?text=x', '081234567890\n'])('rejects invalid phone %s', phone => {
    expect(() => normalizeIndonesianPhone(phone)).toThrow()
  })
  it('accepts official group share mode parameters', () => {
    expect(isValidWhatsAppGroupUrl('https://chat.whatsapp.com/Token123?mode=gi_t')).toBe(true)
  })
  it.each(['http://chat.whatsapp.com/Token', 'https://chat.whatsapp.com.evil/Token', 'https://chat.whatsapp.com/Token?x=1', 'https://chat.whatsapp.com/Token/', 'https://chat.whatsapp.com/Token#x', 'https://user@chat.whatsapp.com/Token', 'https://chat.whatsapp.com/', 'https://chat.whatsapp.com/%61', 'https://chat.whatsapp.com/Token\n'])('rejects unsafe group %s', url => {
    expect(isValidWhatsAppGroupUrl(url)).toBe(false)
  })
  it('does not allow direct publication even at the pure transition layer', () => {
    expect(() => nextSelectionStage('verified', 'finalist_draft', 'finalist')).toThrow()
  })
})
