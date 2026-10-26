import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisterForm } from '@/app/(public)/register/register-form'
import { getFaculties, getStudyPrograms } from '@/server/actions/unima'

vi.mock('@/server/actions/unima', () => ({
  getFaculties: vi.fn(),
  getStudyPrograms: vi.fn(),
}))

// Prevent the old submission path from reaching a database during the migration.
vi.mock('@/server/actions/applicants', () => ({
  submitRegistration: vi.fn(() => { throw new Error('Registration must use the mocked fetch transport') }),
}))

const fetchMock = vi.fn<typeof fetch>()
const applicantId = '5e302f52-a0a8-458b-aec3-927cb52570fa'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const essay = 'Saya ingin menjadi duta UNIMA untuk memperkenalkan budaya Sulawesi Utara dan menginspirasi mahasiswa berkarya.'

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  vi.mocked(getFaculties).mockResolvedValue([
    { id: 'fip', name: 'Fakultas Ilmu Pendidikan', code: 'FIP' },
  ])
  vi.mocked(getStudyPrograms).mockResolvedValue([
    { id: 'fip_pgsd', faculty_id: 'fip', name: 'Pendidikan Guru Sekolah Dasar', code: 'PGSD' },
  ])
  fetchMock.mockResolvedValue(Response.json({ data: { id: applicantId } }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function advance(user: ReturnType<typeof userEvent.setup>, heading: string) {
  await user.click(screen.getByRole('button', { name: 'Selanjutnya' }))
  expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
}

async function completeForm({ semester = '3', gender = 'Perempuan', height = '160', weight = '55' } = {}) {
  const user = userEvent.setup()
  const view = render(<RegisterForm auditionStart="2026-10-26" />)

  await user.type(screen.getByLabelText('Nama Lengkap'), 'Maria Manado')
  await user.type(screen.getByLabelText('Email'), 'maria@example.com')
  await user.type(screen.getByLabelText('Nomor Telepon'), '081234567890')
  await user.type(screen.getByLabelText('NIM (Nomor Induk Mahasiswa)'), '23012345')
  await user.type(screen.getByLabelText('Tempat Lahir'), 'Manado')
  await user.type(screen.getByLabelText('Tanggal Lahir'), '2005-05-15')
  await user.selectOptions(screen.getByLabelText('Jenis Kelamin'), gender)
  await user.type(screen.getByLabelText('Semester'), semester)
  if (Number(semester) >= 3) await user.type(screen.getByLabelText('IPK'), '3.75')
  await screen.findByRole('option', { name: 'Fakultas Ilmu Pendidikan' })
  await user.selectOptions(screen.getByLabelText('Fakultas'), 'fip')
  await screen.findByRole('option', { name: 'Pendidikan Guru Sekolah Dasar' })
  await user.selectOptions(screen.getByLabelText('Program Studi'), 'fip_pgsd')
  await advance(user, 'Alamat & Fisik')

  await user.type(screen.getByLabelText('Alamat'), 'Jalan Kampus Unima Nomor 10')
  await user.type(screen.getByLabelText('Kabupaten/Kota'), 'Manado')
  await user.type(screen.getByLabelText('Provinsi'), 'Sulawesi Utara')
  await user.type(screen.getByLabelText('Tinggi Badan (cm)'), height)
  await user.type(screen.getByLabelText('Berat Badan (kg)'), weight)
  await user.type(screen.getByLabelText('Pekerjaan'), 'Mahasiswa')
  await user.type(screen.getByLabelText('Pendidikan Terakhir'), 'SMA')
  await advance(user, 'Dokumen & Esai')

  await user.type(screen.getByLabelText('Instagram'), '@maria')
  await user.type(screen.getByLabelText('Bahasa Asing yang Dikuasai'), 'Inggris')
  await user.click(screen.getByLabelText('Esai Motivasi'))
  await user.paste(essay)
  await user.click(screen.getByRole('checkbox', { name: /Saya menyatakan/ }))
  await advance(user, 'Konfirmasi')

  expect(fetchMock).not.toHaveBeenCalled()
  return { user, ...view }
}

function submittedData(index = 0) {
  const [url, options] = fetchMock.mock.calls[index]
  expect(url).toBe('/api/register')
  expect(options).toEqual(expect.objectContaining({
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: expect.any(FormData),
  }))
  const body = options!.body as FormData
  expect(body.get('submission_id')).toMatch(uuid)
  return body
}

describe('RegisterForm', () => {
  it.each([
    { gender: 'Laki-laki', height: '125', weight: '25' },
    { gender: 'Perempuan', height: '250', weight: '180' },
  ])('accepts measurements outside the former limits: $height cm / $weight kg', async (measurements) => {
    const { user } = await completeForm(measurements)
    await user.click(screen.getByRole('button', { name: 'Kirim Pendaftaran' }))
    await screen.findByRole('heading', { name: 'Pendaftaran Berhasil' })
    expect(submittedData().get('height_cm')).toBe(measurements.height)
    expect(submittedData().get('weight_kg')).toBe(measurements.weight)
  })
  it.each([
    { gender: 'Perempuan', height: '160' },
    { gender: 'Laki-laki', height: '170' },
  ])('submits a valid $gender journey and shows confirmed success', async ({ gender, height }) => {
    const { user } = await completeForm({ gender, height })
    expect(screen.getByText('Fakultas Ilmu Pendidikan')).toBeInTheDocument()
    expect(screen.getByText('Pendidikan Guru Sekolah Dasar')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Kirim Pendaftaran' }))

    expect(await screen.findByRole('heading', { name: 'Pendaftaran Berhasil' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(Object.fromEntries(submittedData())).toEqual(expect.objectContaining({
      full_name: 'Maria Manado',
      email: 'maria@example.com',
      phone: '081234567890',
      nim: '23012345',
      date_of_birth: '2005-05-15',
      place_of_birth: 'Manado',
      gender,
      faculty: 'fip',
      study_program: 'fip_pgsd',
      semester: '3',
      ipk: '3.75',
      address: 'Jalan Kampus Unima Nomor 10',
      city: 'Manado',
      province: 'Sulawesi Utara',
      height_cm: height,
      weight_kg: '55',
      occupation: 'Mahasiswa',
      education: 'SMA',
      instagram: '@maria',
      foreign_language: 'Inggris',
      essay,
      consent: 'true',
    }))
    expect(screen.getByRole('link', { name: 'Lihat Pengumuman Seleksi' })).toHaveAttribute('href', '/announcements')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it.each(['1', '2'])('omits empty IPK rather than serializing undefined in semester %s', async (semester) => {
    const { user } = await completeForm({ semester })
    await user.click(screen.getByRole('button', { name: 'Kirim Pendaftaran' }))
    await screen.findByRole('heading', { name: 'Pendaftaran Berhasil' })

    const body = submittedData()
    expect(body.get('semester')).toBe(semester)
    expect(body.has('ipk')).toBe(false)
    expect([...body.values()]).not.toContain('undefined')
    expect([...body.values()]).not.toContain('null')
  })

  it('displays an API validation failure as an alert without showing success', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'NIM sudah terdaftar' }, { status: 422 }))
    const { user } = await completeForm()
    await user.click(screen.getByRole('button', { name: 'Kirim Pendaftaran' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('NIM sudah terdaftar')
    expect(screen.queryByRole('heading', { name: 'Pendaftaran Berhasil' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Konfirmasi' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Kirim Pendaftaran' })).toBeEnabled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each(['fetch', 'json'])('keeps the same submission_id for a manual retry after %s rejection', async (failure) => {
    if (failure === 'fetch') {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    } else {
      const response = Response.json({ data: { id: applicantId } })
      vi.spyOn(response, 'json').mockRejectedValueOnce(new SyntaxError('Response body lost'))
      fetchMock.mockResolvedValueOnce(response)
    }
    const { user } = await completeForm()
    await user.click(screen.getByRole('button', { name: 'Kirim Pendaftaran' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/mungkin.*(?:tersimpan|disimpan)/i)
    expect(alert).toHaveTextContent(/coba lagi/i)
    expect(alert).toHaveTextContent(/halaman (?:ini|yang sama)/i)
    expect(screen.queryByRole('heading', { name: 'Pendaftaran Berhasil' })).not.toBeInTheDocument()
    const first = Object.fromEntries(submittedData())
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Kirim Pendaftaran' }))
    await screen.findByRole('heading', { name: 'Pendaftaran Berhasil' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(Object.fromEntries(submittedData(1))).toEqual(first)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('creates a different submission_id when the user changes data after a failed attempt', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Connection lost'))
    const { user } = await completeForm()
    await user.click(screen.getByRole('button', { name: 'Kirim Pendaftaran' }))
    await screen.findByRole('alert')
    const firstToken = submittedData().get('submission_id')

    await user.click(screen.getByRole('button', { name: 'Sebelumnya' }))
    await user.clear(screen.getByLabelText('Bahasa Asing yang Dikuasai'))
    await user.type(screen.getByLabelText('Bahasa Asing yang Dikuasai'), 'Inggris, Mandarin')
    await advance(user, 'Konfirmasi')
    await user.click(screen.getByRole('button', { name: 'Kirim Pendaftaran' }))
    await screen.findByRole('heading', { name: 'Pendaftaran Berhasil' })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const second = submittedData(1)
    expect(second.get('foreign_language')).toBe('Inggris, Mandarin')
    expect(second.get('submission_id')).not.toBe(firstToken)
  })

  it('reuses the token when edited numeric input still parses to the same payload', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Connection lost'))
    const { user } = await completeForm()
    await user.click(screen.getByRole('button', { name: 'Kirim Pendaftaran' }))
    await screen.findByRole('alert')
    const first = Object.fromEntries(submittedData())

    for (let step = 0; step < 3; step++) {
      await user.click(screen.getByRole('button', { name: 'Sebelumnya' }))
    }
    await user.clear(screen.getByLabelText('IPK'))
    await user.type(screen.getByLabelText('IPK'), '3.750')
    await advance(user, 'Alamat & Fisik')
    await advance(user, 'Dokumen & Esai')
    await advance(user, 'Konfirmasi')
    await user.click(screen.getByRole('button', { name: 'Kirim Pendaftaran' }))
    await screen.findByRole('heading', { name: 'Pendaftaran Berhasil' })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(Object.fromEntries(submittedData(1))).toEqual(first)
  })

  it('makes only one request for a double-click on submit', async () => {
    let resolve!: (response: Response) => void
    fetchMock.mockReturnValueOnce(new Promise<Response>((done) => { resolve = done }))
    const { user } = await completeForm()
    await user.dblClick(screen.getByRole('button', { name: 'Kirim Pendaftaran' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('heading', { name: 'Pendaftaran Berhasil' })).not.toBeInTheDocument()
    await act(async () => { resolve(Response.json({ data: { id: applicantId } })) })
    await screen.findByRole('heading', { name: 'Pendaftaran Berhasil' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('disables previous and submit navigation while the request is pending', async () => {
    let resolve!: (response: Response) => void
    fetchMock.mockReturnValueOnce(new Promise<Response>((done) => { resolve = done }))
    const { user } = await completeForm()
    await user.click(screen.getByRole('button', { name: 'Kirim Pendaftaran' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const previous = screen.getByRole('button', { name: 'Sebelumnya' })
    expect(previous).toBeDisabled()
    expect(screen.getByRole('button', { name: /Mengirim/ })).toBeDisabled()
    await user.click(previous)
    expect(screen.getByRole('heading', { name: 'Konfirmasi' })).toBeInTheDocument()

    await act(async () => { resolve(Response.json({ error: 'Silakan periksa data' }, { status: 422 })) })
    expect(await screen.findByRole('alert')).toHaveTextContent('Silakan periksa data')
    expect(previous).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Kirim Pendaftaran' })).toBeEnabled()
  })

  it.each([
    ['undefined JSON', undefined],
    ['null JSON', null],
    ['empty object', {}],
    ['unexpected object', { message: 'ok' }],
    ['missing applicant ID', { data: {} }],
    ['empty applicant ID', { data: { id: '' } }],
  ])('never treats %s as success', async (_name, payload) => {
    const response = Response.json({})
    vi.spyOn(response, 'json').mockResolvedValue(payload)
    fetchMock.mockResolvedValueOnce(response)
    const { user } = await completeForm()
    await user.click(screen.getByRole('button', { name: 'Kirim Pendaftaran' }))

    expect(await screen.findByRole('alert')).not.toBeEmptyDOMElement()
    expect(screen.queryByRole('heading', { name: 'Pendaftaran Berhasil' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Kirim Pendaftaran' })).toBeEnabled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not show success when fetch resolves without a response', async () => {
    fetchMock.mockResolvedValueOnce(undefined as unknown as Response)
    const { user } = await completeForm()
    await user.click(screen.getByRole('button', { name: 'Kirim Pendaftaran' }))

    expect(await screen.findByRole('alert')).not.toBeEmptyDOMElement()
    expect(screen.queryByRole('heading', { name: 'Pendaftaran Berhasil' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Kirim Pendaftaran' })).toBeEnabled()
  })

  it('returns to the first invalid earlier step when final schema validation fails', async () => {
    const { user, rerender } = await completeForm()
    // A changed audition date invalidates the retained DOB without mocking form internals.
    rerender(<RegisterForm auditionStart="2030-10-26" />)
    await user.click(screen.getByRole('button', { name: 'Kirim Pendaftaran' }))

    expect(await screen.findByRole('heading', { name: 'Biodata' })).toBeInTheDocument()
    expect(screen.getByText('Usia maksimal 22 tahun (364 hari) saat audisi')).toBeInTheDocument()
    expect(screen.getByLabelText('Tanggal Lahir')).toHaveValue('2005-05-15')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('heading', { name: 'Pendaftaran Berhasil' })).not.toBeInTheDocument()
  })
})
