// @vitest-environment node

import ExcelJS from 'exceljs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/api/admin/applicants/export/route'
import { getApplicantExportRows, type ApplicantExportRow } from '@/server/applicant-export'
import * as applicantWorkbook from '@/server/applicant-workbook'

vi.mock('@/server/applicant-export', () => ({ getApplicantExportRows: vi.fn() }))

const endpoint = 'https://unima.example.com/api/admin/applicants/export'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function applicant(index = 0): ApplicantExportRow {
  return {
    id: `private-applicant-${index}`, full_name: `Applicant ${index}`, nim: String(index).padStart(8, '0'),
    email: null, phone: '081234567890', gender: null, place_of_birth: null, date_of_birth: null,
    faculty: null, study_program: null, semester: null, ipk: 0, selection_year: 2026,
    status: 'verified', selection_stage: null, created_at: null, height_cm: null,
    weight_kg: null, address: null, city: null, province: null, occupation: null,
    education: null, foreign_language: null, instagram: null, tiktok: null, facebook: null, essay: null,
  }
}

async function load(response: Response) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await response.arrayBuffer())
  expect(workbook.worksheets.map(sheet => sheet.name)).toEqual(['Pendaftar'])
  return workbook.getWorksheet('Pendaftar')!
}

beforeEach(() => {
  vi.mocked(getApplicantExportRows).mockReset().mockResolvedValue([])
  vi.spyOn(applicantWorkbook, 'createApplicantWorkbook')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('GET /api/admin/applicants/export', () => {
  it.each([
    ['Unauthorized', 401, 'Silakan login sebagai admin untuk mengekspor pendaftar.'],
    ['Forbidden', 403, 'Hanya admin yang dapat mengekspor pendaftar.'],
  ])('returns %s without creating an Excel workbook', async (message, status, error) => {
    vi.mocked(getApplicantExportRows).mockRejectedValue(new Error(message))

    const response = await GET(new Request(endpoint))

    expect(response.status).toBe(status)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('content-type')).toMatch(/^application\/json\b/)
    expect(response.headers.get('content-disposition')).toBeNull()
    expect(await response.json()).toEqual({ error })
    expect(getApplicantExportRows).toHaveBeenCalledTimes(1)
    expect(applicantWorkbook.createApplicantWorkbook).not.toHaveBeenCalled()
    expect(console.error).not.toHaveBeenCalled()
  })

  it('returns a real 1101-row XLSX with private headers and a WITA-dated download filename', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-12-31T18:30:00Z'))
    const rows = Array.from({ length: 1101 }, (_, index) => applicant(index))
    const extras = {
      user_id: 'private-user-id', ktp_url: 'https://private.invalid/ktp',
      photo_url: 'https://private.invalid/photo', cv_url: 'https://private.invalid/cv',
    }
    Object.assign(rows[0], extras)
    vi.mocked(getApplicantExportRows).mockResolvedValue(rows)

    const response = await GET(new Request(endpoint))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('content-type')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="pendaftar-unima-2027-01-01.xlsx"')
    expect(getApplicantExportRows).toHaveBeenCalledExactlyOnceWith(undefined)
    expect(applicantWorkbook.createApplicantWorkbook).toHaveBeenCalledExactlyOnceWith(rows)
    const sheet = await load(response)
    expect(sheet.columnCount).toBe(28)
    expect(sheet.rowCount).toBe(1102)
    expect(sheet.autoFilter).toBe('A1:AB1102')
    expect(rows.map((_, index) => {
      const row = sheet.getRow(index + 2)
      return [row.getCell(1).value, row.getCell(2).value, row.getCell(3).value]
    })).toEqual(rows.map((row, index) => [index + 1, row.full_name, row.nim]))
    expect(sheet.getCell('E2').value).toBe('081234567890')
    expect(sheet.getCell('L2').value).toBe(0)
    const serialized = JSON.stringify(sheet.getSheetValues())
    for (const secret of [rows[0].id, ...Object.values(extras)]) expect(serialized).not.toContain(secret)
    expect(console.error).not.toHaveBeenCalled()
  })

  it.each(['', 'scope=all'])('ignores q for all-applicant scope (%s), including an overlong q', async (scope) => {
    const params = new URLSearchParams(scope)
    params.set('q', 'ignored'.repeat(40))

    const response = await GET(new Request(`${endpoint}?${params}`))

    expect(response.status).toBe(200)
    expect(getApplicantExportRows).toHaveBeenCalledExactlyOnceWith(undefined)
    expect(applicantWorkbook.createApplicantWorkbook).toHaveBeenCalledExactlyOnceWith([])
  })

  it.each(['  MaRiA + %_&  ', '', 'a'.repeat(200)])('forwards the raw search query without trimming or normalization (%s)', async (query) => {
    const params = new URLSearchParams({ scope: 'search', q: query })

    const response = await GET(new Request(`${endpoint}?${params}`))

    expect(response.status).toBe(200)
    expect(getApplicantExportRows).toHaveBeenCalledExactlyOnceWith(query)
  })

  it.each([
    { scope: 'invalid', q: '' },
    { scope: 'ALL', q: '' },
    { scope: 'search', q: 'a'.repeat(201) },
  ])('rejects invalid scope or overlong search before fetching data: $scope', async (params) => {
    const response = await GET(new Request(`${endpoint}?${new URLSearchParams(params)}`))

    expect(response.status).toBe(400)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('content-type')).toMatch(/^application\/json\b/)
    expect(await response.json()).toEqual({ error: 'Pilihan ekspor atau pencarian tidak valid.' })
    expect(getApplicantExportRows).not.toHaveBeenCalled()
    expect(applicantWorkbook.createApplicantWorkbook).not.toHaveBeenCalled()
    expect(console.error).not.toHaveBeenCalled()
  })

  it('returns a valid header-only workbook for an empty search result', async () => {
    const response = await GET(new Request(`${endpoint}?scope=search&q=no-match`))
    const sheet = await load(response)

    expect(response.status).toBe(200)
    expect(getApplicantExportRows).toHaveBeenCalledExactlyOnceWith('no-match')
    expect(sheet.rowCount).toBe(1)
    expect(sheet.columnCount).toBe(28)
    expect(sheet.getCell('A1').value).toBe('No')
    expect(sheet.getCell('AB1').value).toBe('Esai Motivasi')
    expect(sheet.autoFilter).toBe('A1:AB1')
  })

  it.each(['query', 'workbook', 'non-Error'])('sanitizes a %s failure in both the JSON response and logged metadata', async (failure) => {
    const privateFields = {
      full_name: 'Private Applicant', email: 'private@example.com', phone: '081234567891',
      user_id: 'secret-user-id', ktp_url: 'https://private.invalid/document',
      query: 'SELECT private_data FROM applicants', code: 'DB_PRIVATE',
    }
    const message = `Export failed: ${Object.values(privateFields).join(', ')}`
    const error = failure === 'non-Error'
      ? { message, ...privateFields }
      : Object.assign(new Error(message), privateFields)
    if (failure === 'workbook') {
      vi.mocked(getApplicantExportRows).mockResolvedValue([applicant()])
      vi.mocked(applicantWorkbook.createApplicantWorkbook).mockRejectedValueOnce(error)
    } else {
      vi.mocked(getApplicantExportRows).mockRejectedValueOnce(error)
    }

    const response = await GET(new Request(endpoint))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('content-type')).toMatch(/^application\/json\b/)
    expect(response.headers.get('content-disposition')).toBeNull()
    expect(console.error).toHaveBeenCalledTimes(1)
    const [label, metadata] = vi.mocked(console.error).mock.calls[0]
    expect(label).toBe('Applicant export error')
    expect(metadata).toEqual({ reference: expect.stringMatching(uuid), name: failure === 'non-Error' ? 'UnknownError' : 'Error' })
    expect(body).toEqual({ error: `Ekspor Excel gagal. Silakan coba lagi. Referensi: ${metadata.reference}` })
    const exposed = JSON.stringify({ body, logs: vi.mocked(console.error).mock.calls })
    for (const secret of [message, ...Object.values(privateFields)]) expect(exposed).not.toContain(secret)
    if (failure !== 'workbook') expect(applicantWorkbook.createApplicantWorkbook).not.toHaveBeenCalled()
  })
})
