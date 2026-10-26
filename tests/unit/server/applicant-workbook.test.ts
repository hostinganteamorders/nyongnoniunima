// @vitest-environment node

import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import type { ApplicantExportRow } from '@/server/applicant-export'
import { createApplicantWorkbook } from '@/server/applicant-workbook'

const headers = [
  'No', 'Nama Lengkap', 'NIM', 'Email', 'Nomor Telepon', 'Jenis Kelamin',
  'Tempat Lahir', 'Tanggal Lahir', 'Fakultas', 'Program Studi', 'Semester', 'IPK',
  'Tahun Seleksi', 'Status Pendaftar', 'Tahap Seleksi', 'Tanggal Pendaftaran (WITA)',
  'Tinggi Badan (cm)', 'Berat Badan (kg)', 'Alamat', 'Kabupaten/Kota', 'Provinsi',
  'Pekerjaan', 'Pendidikan', 'Bahasa Asing', 'Instagram', 'TikTok', 'Facebook', 'Esai Motivasi',
]

function applicant(overrides: Partial<ApplicantExportRow> = {}): ApplicantExportRow {
  return {
    id: 'private-applicant-id', full_name: 'Maria Manado', nim: null, email: null,
    phone: null, gender: null, place_of_birth: null, date_of_birth: null,
    faculty: null, study_program: null, semester: null, ipk: null,
    selection_year: null, status: 'pending', selection_stage: null, created_at: null,
    height_cm: null, weight_kg: null, address: null, city: null, province: null,
    occupation: null, education: null, foreign_language: null, instagram: null,
    tiktok: null, facebook: null, essay: null, ...overrides,
  }
}

async function load(rows: ApplicantExportRow[]) {
  const buffer = await createApplicantWorkbook(rows)
  expect(Buffer.isBuffer(buffer)).toBe(true)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(new Uint8Array(buffer).buffer)
  expect(workbook.worksheets.map(sheet => sheet.name)).toEqual(['Pendaftar'])
  return workbook.getWorksheet('Pendaftar')!
}

describe('createApplicantWorkbook', () => {
  it('creates a styled, filterable header-only workbook with two frozen columns and one frozen row', async () => {
    const sheet = await load([])

    expect(sheet.rowCount).toBe(1)
    expect(sheet.columnCount).toBe(28)
    expect(sheet.getRow(1).values).toEqual([undefined, ...headers])
    expect(sheet.views).toEqual([expect.objectContaining({ state: 'frozen', xSplit: 2, ySplit: 1 })])
    expect(sheet.autoFilter).toBe('A1:AB1')
    expect(sheet.getRow(1).height).toBe(32)
    for (let column = 1; column <= headers.length; column++) {
      const cell = sheet.getCell(1, column)
      expect(cell.fill).toEqual({ type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF123C69' } })
      expect(cell.font).toMatchObject({ name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } })
      expect(cell.alignment).toMatchObject({ vertical: 'middle', wrapText: true })
      expect(sheet.getColumn(column).width).toBeGreaterThan(0)
    }
  })

  it('preserves leading zeros, numeric zero, measurements, resolved catalog names and the export whitelist', async () => {
    // Runtime data may contain private fields even when the declared type does not.
    const row = {
      ...applicant({
        nim: '00012345', email: 'maria@example.com', phone: '081234567890', gender: 'Perempuan',
        place_of_birth: 'Manado', faculty: 'Fakultas Ilmu Pendidikan',
        study_program: 'Pendidikan Guru Sekolah Dasar (Arsip)', semester: 0, ipk: 0,
        selection_year: 2026, status: 'verified', selection_stage: 'finalist_draft',
        height_cm: 165.5, weight_kg: 52.25, address: 'Jalan Kampus 10', city: 'Manado',
        province: 'Sulawesi Utara', occupation: 'Mahasiswa', education: 'SMA',
        foreign_language: 'Inggris', instagram: '@maria', tiktok: '@maria.video',
        facebook: 'Maria UNIMA', essay: 'Motivasi menjadi duta kampus.',
      }),
      user_id: 'private-user-id', ktp_url: 'https://private.invalid/ktp',
      photo_url: 'https://private.invalid/photo', cv_url: 'https://private.invalid/cv',
      document_links: ['https://private.invalid/document'], private_notes: 'private-notes',
    }
    const sheet = await load([row])

    expect(sheet.columnCount).toBe(28)
    expect(sheet.getRow(1).values).toEqual([undefined, ...headers])
    expect(sheet.getRow(2).values).toEqual([undefined,
      1, 'Maria Manado', '00012345', 'maria@example.com', '081234567890', 'Perempuan',
      'Manado', '', 'Fakultas Ilmu Pendidikan', 'Pendidikan Guru Sekolah Dasar (Arsip)',
      0, 0, 2026, 'Terverifikasi', 'Draf Finalis', '', 165.5, 52.25, 'Jalan Kampus 10',
      'Manado', 'Sulawesi Utara', 'Mahasiswa', 'SMA', 'Inggris', '@maria', '@maria.video',
      'Maria UNIMA', 'Motivasi menjadi duta kampus.',
    ])
    for (const address of ['C2', 'E2']) {
      expect(sheet.getCell(address).type).toBe(ExcelJS.ValueType.String)
      expect(sheet.getCell(address).numFmt).toBe('@')
    }
    expect(sheet.getCell('L2').type).toBe(ExcelJS.ValueType.Number)
    expect(sheet.getCell('L2').numFmt).toBe('0.00')
    expect(sheet.getCell('Q2').numFmt).toBe('0.##')
    expect(sheet.getCell('R2').numFmt).toBe('0.##')
    expect(sheet.autoFilter).toBe('A1:AB2')
    expect(sheet.getRow(2).height).toBe(45)
    expect(sheet.getCell('AB2').alignment).toMatchObject({ vertical: 'top', wrapText: true })
    expect(sheet.getCell('AB2').font).toMatchObject({ name: 'Calibri', size: 11 })
    const serialized = JSON.stringify(sheet.getSheetValues())
    for (const secret of [row.id, row.user_id, row.ktp_url, row.photo_url, row.cv_url, ...row.document_links, row.private_notes]) {
      expect(serialized).not.toContain(secret)
    }
  })

  it('renders nullable fields as blank rather than null/undefined text or numeric zeros', async () => {
    const sheet = await load([applicant()])

    expect(sheet.getCell('A2').value).toBe(1)
    expect(sheet.getCell('B2').value).toBe('Maria Manado')
    expect(sheet.getCell('N2').value).toBe('Menunggu Verifikasi')
    expect(sheet.getCell('O2').value).toBe('Belum Ditetapkan')
    for (let column = 3; column <= 28; column++) {
      if (column === 14 || column === 15) continue
      expect([null, '']).toContain(sheet.getCell(2, column).value)
    }
  })

  it('keeps formula-like input and international phone numbers as plain strings without formulas or hyperlinks', async () => {
    const values = {
      B2: '=HYPERLINK("https://attacker.invalid","click")',
      E2: '+6281234567890', S2: '+SUM(1,2)', Y2: '@SUM(1,2)', AB2: '-cmd|calc!A0',
      AA2: 'https://example.com/profile',
    }
    const sheet = await load([applicant({
      full_name: values.B2, phone: values.E2, address: values.S2,
      instagram: values.Y2, essay: values.AB2, facebook: values.AA2,
    })])

    for (const [address, value] of Object.entries(values)) {
      const cell = sheet.getCell(address)
      expect(cell.value).toBe(value)
      expect(cell.type).toBe(ExcelJS.ValueType.String)
      expect(cell.formula).toBeUndefined()
      expect(cell.hyperlink).toBeUndefined()
    }
    expect(sheet.getCell('E2').numFmt).toBe('@')
    sheet.eachRow(row => row.eachCell(cell => {
      expect(cell.type).not.toBe(ExcelJS.ValueType.Formula)
      expect(cell.type).not.toBe(ExcelJS.ValueType.Hyperlink)
    }))
  })

  it('does not shift birth dates and converts UTC, SQLite UTC and offset timestamps to WITA across rollovers', async () => {
    const cases = [
      ['2026-12-31T18:30:45Z', '2027-01-01T02:30:45.000Z'],
      ['2026-10-27 16:05:06', '2026-10-28T00:05:06.000Z'],
      ['2026-10-28T00:05:06+08:00', '2026-10-28T00:05:06.000Z'],
    ]
    const sheet = await load(cases.map(([created_at]) => applicant({ date_of_birth: '2005-05-15', created_at })))

    cases.forEach(([, expected], index) => {
      const birth = sheet.getCell(index + 2, 8)
      const registered = sheet.getCell(index + 2, 16)
      expect(birth.type).toBe(ExcelJS.ValueType.Date)
      expect((birth.value as Date).toISOString()).toBe('2005-05-15T00:00:00.000Z')
      expect(birth.numFmt).toBe('dd/mm/yyyy')
      expect(registered.type).toBe(ExcelJS.ValueType.Date)
      expect((registered.value as Date).toISOString()).toBe(expected)
      expect(registered.numFmt).toBe('dd/mm/yyyy hh:mm:ss')
    })
  })

  it('round-trips Unicode and a long multiline essay without truncation', async () => {
    const name = 'Jos\u00e9 \u2013 \u674e\u660e \ud83c\udf3a'
    const essay = 'Budaya Minahasa: \u00e9, \u674e\u660e, \ud83c\udf3a.\n'.repeat(600)
    const sheet = await load([applicant({ full_name: name, essay })])

    expect(essay.length).toBeGreaterThan(10000)
    expect(sheet.getCell('B2').value).toBe(name)
    expect(sheet.getCell('AB2').value).toBe(essay)
  })

  it('exports all 1101 applicants in order without a skipped, duplicated or truncated row', async () => {
    const rows = Array.from({ length: 1101 }, (_, index) => applicant({
      id: `private-${index}`, full_name: `Applicant ${index}`, nim: String(index).padStart(8, '0'),
    }))
    const sheet = await load(rows)

    expect(sheet.rowCount).toBe(1102)
    expect(sheet.actualRowCount).toBe(1102)
    expect(sheet.autoFilter).toBe('A1:AB1102')
    const actual = rows.map((_, index) => {
      const row = sheet.getRow(index + 2)
      return [row.getCell(1).value, row.getCell(2).value, row.getCell(3).value]
    })
    expect(actual).toEqual(rows.map((row, index) => [index + 1, row.full_name, row.nim]))
  })
})
