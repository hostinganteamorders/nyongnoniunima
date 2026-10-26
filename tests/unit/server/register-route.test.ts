// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/register/route'
import { submitRegistration } from '@/server/actions/applicants'

vi.mock('@/server/actions/applicants', () => ({
  submitRegistration: vi.fn(),
}))

const origin = 'https://registration.example.com'
const applicantId = '5e302f52-a0a8-458b-aec3-927cb52570fa'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const fields = {
  submission_id: '06ba9584-3d8a-45a3-a292-32ba187302cb',
  full_name: 'Maria Manado',
  email: 'maria@example.com',
  phone: '081234567890',
  nim: '23012345',
  date_of_birth: '2005-05-15',
  place_of_birth: 'Manado',
  gender: 'Perempuan',
  faculty: 'fip',
  study_program: 'fip_pgsd',
  semester: '3',
  ipk: '3.75',
  address: 'Jalan Kampus Unima Nomor 10',
  city: 'Manado',
  province: 'Sulawesi Utara',
  height_cm: '160',
  weight_kg: '55',
  occupation: 'Mahasiswa',
  education: 'SMA',
  instagram: '@maria',
  foreign_language: 'Inggris',
  essay: 'Saya ingin menjadi duta UNIMA untuk memperkenalkan budaya Sulawesi Utara.',
  consent: 'true',
}

function registrationRequest(overrides: RequestInit = {}) {
  const body = new FormData()
  for (const [key, value] of Object.entries(fields)) body.set(key, value)
  return new Request(`${origin}/api/register`, {
    method: 'POST',
    headers: { origin },
    body,
    ...overrides,
  })
}

beforeEach(() => {
  vi.mocked(submitRegistration).mockReset()
  vi.mocked(submitRegistration).mockResolvedValue({ data: { id: applicantId } })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => vi.restoreAllMocks())

describe('POST /api/register', () => {
  it('returns only the acknowledgement ID with no-store and forwards every multipart field', async () => {
    // Deliberately return excess fields to catch accidental applicant-record exposure.
    const result = { data: { id: applicantId, ...fields }, internal: 'private metadata' }
    vi.mocked(submitRegistration).mockResolvedValue(result)
    const request = registrationRequest()
    expect(request.headers.get('content-type')).toMatch(/^multipart\/form-data; boundary=/)

    const response = await POST(request)

    expect(response.status).toBe(201)
    expect(response.headers.get('content-type')).toMatch(/^application\/json\b/)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ data: { id: applicantId } })
    expect(submitRegistration).toHaveBeenCalledTimes(1)
    expect(submitRegistration).toHaveBeenCalledWith(expect.any(FormData))
    const [submitted] = vi.mocked(submitRegistration).mock.calls[0]
    expect(Object.fromEntries(submitted.entries())).toEqual(fields)
    expect(console.error).not.toHaveBeenCalled()
  })

  it('also accepts same-origin URL-encoded form submissions', async () => {
    const response = await POST(registrationRequest({ body: new URLSearchParams(fields) }))

    expect(response.status).toBe(201)
    expect(response.headers.get('content-type')).toMatch(/^application\/json\b/)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ data: { id: applicantId } })
    expect(submitRegistration).toHaveBeenCalledTimes(1)
    const [submitted] = vi.mocked(submitRegistration).mock.calls[0]
    expect(Object.fromEntries(submitted.entries())).toEqual(fields)
  })

  it.each([
    ['validation', 'email: Email tidak valid'],
    ['closed registration', 'Pendaftaran sedang ditutup. Silakan tunggu pengumuman pembukaan pendaftaran resmi berikutnya.'],
  ])('returns a JSON 400 for an action %s error, even when data is also present', async (_scenario, error) => {
    vi.mocked(submitRegistration).mockResolvedValue({ error, data: { id: applicantId } })

    const response = await POST(registrationRequest())

    expect(response.status).toBe(400)
    expect(response.headers.get('content-type')).toMatch(/^application\/json\b/)
    expect(await response.json()).toEqual({ error })
    expect(submitRegistration).toHaveBeenCalledTimes(1)
    expect(console.error).not.toHaveBeenCalled()
  })

  it.each([
    'https://attacker.example.com',
    'http://registration.example.com',
    'https://registration.example.com:444',
    'null',
  ])('rejects origin %s before parsing or calling the action', async (wrongOrigin) => {
    const request = registrationRequest({
      headers: { origin: wrongOrigin, 'content-type': 'application/json' },
      body: 'not a form',
    })
    const parse = vi.spyOn(request, 'formData')

    const response = await POST(request)

    expect(response.status).toBe(403)
    expect(response.headers.get('content-type')).toMatch(/^application\/json\b/)
    expect(await response.json()).toEqual({ error: 'Pengiriman harus dilakukan dari website pendaftaran.' })
    expect(parse).not.toHaveBeenCalled()
    expect(submitRegistration).not.toHaveBeenCalled()
    expect(console.error).not.toHaveBeenCalled()
  })

  it.each(['application/json', 'text/plain', 'multipart/form-data-invalid', ''])('rejects unsupported content type "%s"', async (contentType) => {
    const headers = new Headers({ origin })
    if (contentType) headers.set('content-type', contentType)
    const request = registrationRequest({ headers, body: new Uint8Array([123, 125]) })
    const parse = vi.spyOn(request, 'formData')

    const response = await POST(request)

    expect(response.status).toBe(415)
    expect(response.headers.get('content-type')).toMatch(/^application\/json\b/)
    expect(await response.json()).toEqual({ error: 'Format formulir tidak valid.' })
    expect(parse).not.toHaveBeenCalled()
    expect(submitRegistration).not.toHaveBeenCalled()
    expect(console.error).not.toHaveBeenCalled()
  })

  it.each(['multipart/form-data', 'multipart/form-data; boundary=missing'])('returns JSON 400 for malformed multipart (%s)', async (contentType) => {
    const response = await POST(registrationRequest({
      headers: { origin, 'content-type': contentType },
      body: 'this is not a multipart body',
    }))

    expect(response.status).toBe(400)
    expect(response.headers.get('content-type')).toMatch(/^application\/json\b/)
    expect(await response.json()).toEqual({
      error: 'Formulir tidak dapat dibaca. Silakan coba lagi dari halaman yang sama.',
    })
    expect(submitRegistration).not.toHaveBeenCalled()
    expect(console.error).not.toHaveBeenCalled()
  })

  it.each(['Error', 'non-Error'])('sanitizes a thrown %s into a no-store uncertain 503 and whitelisted console metadata', async (kind) => {
    const rawMessage = `Database insert failed: ${fields.full_name}, ${fields.email}, ${fields.phone}, ${fields.address}`
    const exception = kind === 'Error'
      ? Object.assign(new Error(rawMessage), { ...fields, code: 'DB_PRIVATE', query: 'INSERT INTO applicants' })
      : { message: rawMessage, ...fields }
    vi.mocked(submitRegistration).mockRejectedValue(exception)

    const response = await POST(registrationRequest())

    expect(response.status).toBe(503)
    expect(response.headers.get('content-type')).toMatch(/^application\/json\b/)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(submitRegistration).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledTimes(1)
    const [label, metadata] = vi.mocked(console.error).mock.calls[0]
    expect(label).toBe('Registration response error')
    expect(metadata).toEqual({ reference: expect.stringMatching(uuid), name: kind === 'Error' ? 'Error' : 'UnknownError' })
    expect(await response.json()).toEqual({
      error: `Respons pengiriman belum dapat dikonfirmasi. Data mungkin sudah tersimpan. Silakan coba lagi dari halaman yang sama. Referensi: ${metadata.reference}`,
    })
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls)
    for (const privateValue of [rawMessage, fields.full_name, fields.email, fields.phone, fields.address, fields.submission_id, 'DB_PRIVATE', 'INSERT INTO applicants']) {
      expect(logged).not.toContain(privateValue)
    }
  })

  it.each([
    ['undefined result', undefined],
    ['null result', null],
    ['empty result', {}],
    ['missing data', { data: undefined }],
    ['null data', { data: null }],
    ['missing ID', { data: {} }],
    ['empty ID', { data: { id: '' } }],
    ['null ID', { data: { id: null } }],
  ])('does not claim success for %s', async (_scenario, result) => {
    // Malformed runtime results can occur even though the action type excludes them.
    vi.mocked(submitRegistration).mockResolvedValue(result as Awaited<ReturnType<typeof submitRegistration>>)

    const response = await POST(registrationRequest())

    expect(response.status).toBe(503)
    expect(response.headers.get('content-type')).toMatch(/^application\/json\b/)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(submitRegistration).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledTimes(1)
    const [label, metadata] = vi.mocked(console.error).mock.calls[0]
    expect(label).toBe('Registration response error')
    expect(metadata).toEqual({ reference: expect.stringMatching(uuid), name: expect.stringMatching(/^(Error|TypeError)$/) })
    expect(await response.json()).toEqual({
      error: `Respons pengiriman belum dapat dikonfirmasi. Data mungkin sudah tersimpan. Silakan coba lagi dari halaman yang sama. Referensi: ${metadata.reference}`,
    })
  })
})
