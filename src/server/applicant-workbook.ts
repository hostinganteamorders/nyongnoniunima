import ExcelJS from 'exceljs'
import { Writable } from 'node:stream'
import type { ApplicantExportRow } from './applicant-export'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu Verifikasi', verified: 'Terverifikasi', rejected: 'Ditolak', finalist: 'Finalis',
}
const STAGE_LABELS: Record<string, string> = {
  semifinalist: 'Semifinalis', finalist_draft: 'Draf Finalis', finalist: 'Finalis',
  not_selected_faculty: 'Tidak Lolos Fakultas', not_selected_university: 'Tidak Lolos ke Final',
}

function excelDate(value: string | null, timestamp = false): Date | string {
  if (!value) return ''
  const date = new Date(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value) ? `${value.replace(' ', 'T')}Z` : value)
  if (!Number.isFinite(date.getTime())) return value
  // Excel dates have no timezone; shift UTC timestamps to the WITA wall clock.
  return timestamp ? new Date(date.getTime() + 8 * 60 * 60 * 1000) : date
}

export async function createApplicantWorkbook(rows: ApplicantExportRow[]): Promise<Buffer> {
  // Byte streams avoid splitting Unicode surrogate pairs in large XML strings.
  const chunks: Buffer[] = []
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(Buffer.from(chunk))
      callback()
    },
  })
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream, useStyles: true, useSharedStrings: true })
  workbook.creator = 'Nyong Noni UNIMA'
  const sheet = workbook.addWorksheet('Pendaftar', {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }],
  })
  sheet.columns = [
    { header: 'No', key: 'number', width: 7 },
    { header: 'Nama Lengkap', key: 'full_name', width: 32 },
    { header: 'NIM', key: 'nim', width: 22, style: { numFmt: '@' } },
    { header: 'Email', key: 'email', width: 32 },
    { header: 'Nomor Telepon', key: 'phone', width: 24, style: { numFmt: '@' } },
    { header: 'Jenis Kelamin', key: 'gender', width: 18 },
    { header: 'Tempat Lahir', key: 'place_of_birth', width: 22 },
    { header: 'Tanggal Lahir', key: 'date_of_birth', width: 18, style: { numFmt: 'dd/mm/yyyy' } },
    { header: 'Fakultas', key: 'faculty', width: 48 },
    { header: 'Program Studi', key: 'study_program', width: 48 },
    { header: 'Semester', key: 'semester', width: 12 },
    { header: 'IPK', key: 'ipk', width: 12, style: { numFmt: '0.00' } },
    { header: 'Tahun Seleksi', key: 'selection_year', width: 16, style: { numFmt: '0' } },
    { header: 'Status Pendaftar', key: 'status', width: 24 },
    { header: 'Tahap Seleksi', key: 'selection_stage', width: 26 },
    { header: 'Tanggal Pendaftaran (WITA)', key: 'created_at', width: 28, style: { numFmt: 'dd/mm/yyyy hh:mm:ss' } },
    { header: 'Tinggi Badan (cm)', key: 'height_cm', width: 19, style: { numFmt: '0.##' } },
    { header: 'Berat Badan (kg)', key: 'weight_kg', width: 19, style: { numFmt: '0.##' } },
    { header: 'Alamat', key: 'address', width: 48 },
    { header: 'Kabupaten/Kota', key: 'city', width: 24 },
    { header: 'Provinsi', key: 'province', width: 26 },
    { header: 'Pekerjaan', key: 'occupation', width: 22 },
    { header: 'Pendidikan', key: 'education', width: 22 },
    { header: 'Bahasa Asing', key: 'foreign_language', width: 26 },
    { header: 'Instagram', key: 'instagram', width: 26 },
    { header: 'TikTok', key: 'tiktok', width: 26 },
    { header: 'Facebook', key: 'facebook', width: 32 },
    { header: 'Esai Motivasi', key: 'essay', width: 60 },
  ]

  const header = sheet.getRow(1)
  header.height = 32
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF123C69' } }
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { vertical: 'middle', wrapText: true }
  })
  header.commit()

  rows.forEach((applicant, index) => {
    const row = sheet.addRow({
      number: index + 1,
      full_name: applicant.full_name,
      nim: applicant.nim ?? '',
      email: applicant.email ?? '',
      phone: applicant.phone ?? '',
      gender: applicant.gender ?? '',
      place_of_birth: applicant.place_of_birth ?? '',
      date_of_birth: excelDate(applicant.date_of_birth),
      faculty: applicant.faculty ?? '',
      study_program: applicant.study_program ?? '',
      semester: applicant.semester ?? '',
      ipk: applicant.ipk ?? '',
      selection_year: applicant.selection_year ?? '',
      status: STATUS_LABELS[applicant.status] || applicant.status,
      selection_stage: applicant.selection_stage ? STAGE_LABELS[applicant.selection_stage] || applicant.selection_stage : 'Belum Ditetapkan',
      created_at: excelDate(applicant.created_at, true),
      height_cm: applicant.height_cm ?? '',
      weight_kg: applicant.weight_kg ?? '',
      address: applicant.address ?? '',
      city: applicant.city ?? '',
      province: applicant.province ?? '',
      occupation: applicant.occupation ?? '',
      education: applicant.education ?? '',
      foreign_language: applicant.foreign_language ?? '',
      instagram: applicant.instagram ?? '',
      tiktok: applicant.tiktok ?? '',
      facebook: applicant.facebook ?? '',
      essay: applicant.essay ?? '',
    })
    row.height = 45
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'top', wrapText: true }
      cell.font = { name: 'Calibri', size: 11 }
    })
    row.commit()
  })

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: sheet.columns.length } }
  await workbook.commit()
  return Buffer.concat(chunks)
}
