import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type Database from 'better-sqlite3'
import { revalidatePath } from 'next/cache'
import { AUDITION_START } from '@/lib/validations/registration'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(() => { throw new Error('Public registration must not invalidate paths') }),
}))

let dir: string
let db: Database.Database
let POST: typeof import('@/app/api/register/route').POST

const origin = 'http://localhost:3000'
const defaultYear = Number(AUDITION_START.slice(0, 4))
const fields = {
  full_name: 'Maria Manado', email: 'maria@example.com', phone: '081234567890',
  date_of_birth: '2006-05-15', place_of_birth: 'Manado', gender: 'Perempuan', nim: '25012345',
  faculty: 'ft', study_program: 'ft_ti', semester: '2',
  address: 'Jalan Kampus Unima Nomor 10', city: 'Tondano', province: 'Sulawesi Utara',
  height_cm: '125', weight_kg: '25', occupation: 'Mahasiswa', education: 'SMA',
  instagram: '@maria', tiktok: '@maria.unima', facebook: 'Maria Manado', foreign_language: 'Inggris',
  essay: 'Saya ingin menjadi duta UNIMA untuk memperkenalkan budaya Sulawesi Utara dan mengembangkan potensi mahasiswa.',
  consent: 'true',
}

function registrationForm() {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) form.set(key, value)
  form.set('submission_id', crypto.randomUUID())
  return form
}

function registrationRequest(form: FormData) {
  const request = new Request(`${origin}/api/register`, {
    method: 'POST', headers: { origin }, body: form,
  })
  expect(request.headers.get('content-type')).toMatch(/^multipart\/form-data; boundary=/)
  return request
}

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'registration-route-backend-'))
  vi.spyOn(process, 'cwd').mockReturnValue(dir)
  const local = await import('@/lib/db/local')
  expect(local.isUsingLocalDb()).toBe(true)
  db = local.getLocalDb()
  expect(db.name).toBe(path.join(dir, 'data', 'nyong-noni.db'))
  db.prepare("UPDATE settings SET value = 'true' WHERE key = 'registration_open'").run()
  ;({ POST } = await import('@/app/api/register/route'))
})

afterEach(() => {
  db?.close()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  fs.rmSync(dir, { recursive: true, force: true })
  expect(revalidatePath).not.toHaveBeenCalled()
})

describe('POST /api/register with real local persistence', () => {
  it.each([defaultYear, defaultYear + 1])('persists semester two without IPK and acknowledges only the ID for year %i', async year => {
    if (year !== defaultYear) {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('selection_year', JSON.stringify(year))
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(`audition_start_${year}`, JSON.stringify(`${year}-10-26`))
    }
    const form = registrationForm()
    expect(form.has('ipk')).toBe(false)

    const response = await POST(registrationRequest(form))

    expect(response.status).toBe(201)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ data: { id: form.get('submission_id') } })
    const rows = db.prepare('SELECT * FROM applicants').all()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      ...fields, id: form.get('submission_id'), semester: 2, ipk: null,
      height_cm: 125, weight_kg: 25, consent: 1, status: 'pending', user_id: null, selection_year: year,
    })
  })

  it('replays the same body after a committed response is discarded without creating another row', async () => {
    const form = registrationForm()
    // Ignore the acknowledgement as if transport failed after the committed write.
    await POST(registrationRequest(form))
    const original = db.prepare('SELECT * FROM applicants').all()
    expect(original).toHaveLength(1)

    for (let n = 0; n < 2; n++) {
      const response = await POST(registrationRequest(form))
      expect(response.status).toBe(201)
      expect(await response.json()).toEqual({ data: { id: form.get('submission_id') } })
    }
    expect(db.prepare('SELECT * FROM applicants').all()).toEqual(original)
  })

  it('accepts simultaneous first requests with the same submission ID exactly once', async () => {
    const form = registrationForm()
    const requests = Array.from({ length: 8 }, () => registrationRequest(form))

    const responses = await Promise.all(requests.map(request => POST(request)))

    expect(responses.map(response => response.status)).toEqual(Array(8).fill(201))
    expect(await Promise.all(responses.map(response => response.json()))).toEqual(
      Array(8).fill({ data: { id: form.get('submission_id') } }),
    )
    expect(db.prepare('SELECT id FROM applicants').all()).toEqual([{ id: form.get('submission_id') }])
  })

  it('rejects a changed body under an existing ID without changing any rows', async () => {
    const form = registrationForm()
    expect((await POST(registrationRequest(form))).status).toBe(201)
    const original = db.prepare('SELECT * FROM applicants').all()
    const changes = db.prepare('SELECT total_changes() AS n').get()
    form.set('essay', `${fields.essay} Saya juga ingin belajar kepemimpinan.`)

    const response = await POST(registrationRequest(form))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: expect.stringMatching(/ID pengiriman sudah digunakan/) })
    expect(db.prepare('SELECT * FROM applicants').all()).toEqual(original)
    expect(db.prepare('SELECT total_changes() AS n').get()).toEqual(changes)
  })

  it.each(['unknown', 'inactive', 'mismatch', 'missing'])('rejects %s study programs through the public route without inserting', async invalid => {
    const form = registrationForm()
    if (invalid === 'unknown') form.set('study_program', 'Teknik Informatika')
    if (invalid === 'missing') form.delete('study_program')
    if (invalid === 'inactive') db.prepare('UPDATE study_programs SET is_active = 0 WHERE id = ?').run(fields.study_program)
    if (invalid === 'mismatch') form.set('faculty', 'fip')
    const response = await POST(registrationRequest(form))
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: expect.stringMatching(invalid === 'inactive' ? /tidak aktif/
      : invalid === 'mismatch' ? /tidak sesuai.*fakultas/ : invalid === 'missing' ? /study_program:/ : /tidak ditemukan/) })
    expect(db.prepare('SELECT * FROM applicants').all()).toEqual([])
  })

  it('acknowledges only an exact archived-program replay and never inserts a fresh submission', async () => {
    const form = registrationForm()
    expect((await POST(registrationRequest(form))).status).toBe(201)
    const original = db.prepare('SELECT * FROM applicants').all()
    db.prepare('UPDATE study_programs SET is_active = 0 WHERE id = ?').run(fields.study_program)
    const replay = await POST(registrationRequest(form))
    expect(replay.status).toBe(201)
    expect(await replay.json()).toEqual({ data: { id: form.get('submission_id') } })
    form.set('essay', `${fields.essay} Perubahan data.`)
    const changed = await POST(registrationRequest(form))
    expect(changed.status).toBe(400)
    expect(await changed.json()).toEqual({ error: expect.stringMatching(/ID pengiriman sudah digunakan/) })
    form.set('submission_id', crypto.randomUUID())
    const fresh = await POST(registrationRequest(form))
    expect(fresh.status).toBe(400)
    expect(await fresh.json()).toEqual({ error: expect.stringMatching(/tidak aktif/) })
    expect(db.prepare('SELECT * FROM applicants').all()).toEqual(original)
  })

  it.each(['0', '-25', undefined])('rejects invalid or missing weight %s without inserting', async weight => {
    const form = registrationForm()
    if (weight === undefined) form.delete('weight_kg')
    else form.set('weight_kg', weight)

    const response = await POST(registrationRequest(form))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: expect.stringMatching(/weight_kg:/) })
    expect(db.prepare('SELECT * FROM applicants').all()).toEqual([])
  })

  it('accepts height and weight above the former upper bounds', async () => {
    const form = registrationForm()
    form.set('height_cm', '250')
    form.set('weight_kg', '180')

    const response = await POST(registrationRequest(form))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ data: { id: form.get('submission_id') } })
    expect(db.prepare('SELECT id, height_cm, weight_kg FROM applicants').all()).toEqual([
      { id: form.get('submission_id'), height_cm: 250, weight_kg: 180 },
    ])
  })

  it('allows a committed replay after publication but rejects a new applicant without extra records', async () => {
    const form = registrationForm()
    expect((await POST(registrationRequest(form))).status).toBe(201)
    const original = db.prepare('SELECT * FROM applicants').all()
    db.prepare("INSERT INTO selection_announcements (year, published_at) VALUES (?, datetime('now'))").run(defaultYear)

    const replay = await POST(registrationRequest(form))
    expect(replay.status).toBe(201)
    expect(await replay.json()).toEqual({ data: { id: form.get('submission_id') } })

    const newApplicant = registrationForm()
    newApplicant.set('full_name', 'Daniel Tondano')
    newApplicant.set('email', 'daniel@example.com')
    newApplicant.set('nim', '25012346')
    const response = await POST(registrationRequest(newApplicant))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: expect.stringMatching(/dipublikasikan/) })
    expect(db.prepare('SELECT * FROM applicants').all()).toEqual(original)
  })
})
