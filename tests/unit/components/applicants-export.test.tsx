import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApplicantsClient } from '@/app/admin/applicants/applicants-client'
import { getFaculties, getStudyPrograms } from '@/server/actions/unima'

vi.mock('@/server/actions/unima', () => ({ getFaculties: vi.fn(), getStudyPrograms: vi.fn() }))
vi.mock('@/server/actions/applicants', () => ({
  updateApplicantStatus: vi.fn(), deleteApplicant: vi.fn(), createApplicant: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const applicants = [{
  id: 'a1', full_name: 'Noni & Nyong + Unima', email: 'contoh@example.test', phone: '0800000000',
  city: 'Tondano', province: 'Sulawesi Utara', status: 'pending', created_at: '2026-10-01T00:00:00Z',
}]
const stats = { total: 1, pending: 1, verified: 0, rejected: 0, finalist: 0 }
const fetchMock = vi.fn<typeof fetch>()
const createURL = vi.fn(() => 'blob:applicants-export')
const revokeURL = vi.fn()
let downloads: { filename: string; href: string; connected: boolean }[]

function excelResponse(disposition = 'attachment; filename="pendaftar-2026.xlsx"') {
  return new Response(new Blob(['PK-test-workbook'], { type: MIME }), {
    headers: { 'Content-Type': MIME, 'Content-Disposition': disposition },
  })
}

function renderApplicants(empty = false) {
  return render(<ApplicantsClient applicants={empty ? [] : applicants} stats={empty ? { ...stats, total: 0, pending: 0 } : stats} />)
}

async function expectNoDownload(message: string | RegExp) {
  expect(await screen.findByRole('alert')).toHaveTextContent(message)
  expect(screen.getByRole('alert')).toHaveClass('bg-red-50')
  expect(downloads).toEqual([])
  expect(createURL).not.toHaveBeenCalled()
  expect(revokeURL).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Ekspor Excel' })).toBeEnabled()
  expect(screen.getByRole('combobox', { name: 'Cakupan ekspor' })).toBeEnabled()
}

describe('Applicants Excel export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getFaculties).mockResolvedValue([])
    vi.mocked(getStudyPrograms).mockResolvedValue([])
    fetchMock.mockReset().mockResolvedValue(excelResponse())
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = createURL
      static revokeObjectURL = revokeURL
    })
    downloads = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push({ filename: this.download, href: this.href, connected: this.isConnected })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('defaults to all, ignores search, and downloads the server filename with URL cleanup', async () => {
    const user = userEvent.setup()
    renderApplicants()
    expect(screen.getByRole('combobox', { name: 'Cakupan ekspor' })).toHaveValue('all')
    await user.type(screen.getByPlaceholderText('Cari pendaftar...'), 'no matching applicant')
    expect(screen.getByRole('button', { name: 'Ekspor Excel' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Ekspor Excel' }))
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/applicants/export?scope=all', { cache: 'no-store' })
    expect(createURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(downloads).toEqual([{ filename: 'pendaftar-2026.xlsx', href: 'blob:applicants-export', connected: true }])
    expect(document.querySelector('a[download]')).toBeNull()
    await waitFor(() => expect(revokeURL).toHaveBeenCalledExactlyOnceWith('blob:applicants-export'))
    expect(screen.queryByText(/berhasil|disimpan/i)).not.toBeInTheDocument()
  })

  it.each(['Noni & Nyong +', ' & ', 'contoh@example.test', 'Tondano'])('exports the raw encoded search matching %s', async (search) => {
    const user = userEvent.setup()
    renderApplicants()
    await user.type(screen.getByPlaceholderText('Cari pendaftar...'), search)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Cakupan ekspor' }), 'search')
    expect(screen.getByRole('option', { name: 'Hasil pencarian (1)' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ekspor Excel' }))
    const params = new URLSearchParams({ scope: 'search', q: search })
    expect(fetchMock).toHaveBeenCalledWith(`/api/admin/applicants/export?${params}`, { cache: 'no-store' })
    const url = new URL(fetchMock.mock.calls[0][0] as string, 'https://example.test')
    expect(url.searchParams.get('q')).toBe(search)
    if (search === 'Noni & Nyong +') expect(url.search).toBe('?scope=search&q=Noni+%26+Nyong+%2B')
    await waitFor(() => expect(revokeURL).toHaveBeenCalledExactlyOnceWith('blob:applicants-export'))
  })

  it('disables an empty search scope only, and disables all when there are no applicants', async () => {
    const user = userEvent.setup()
    const view = renderApplicants()
    await user.type(screen.getByPlaceholderText('Cari pendaftar...'), 'missing')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Cakupan ekspor' }), 'search')
    expect(screen.getByRole('option', { name: 'Hasil pencarian (0)' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ekspor Excel' }))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Ekspor Excel' })).toBeDisabled()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Cakupan ekspor' }), 'all')
    expect(screen.getByRole('button', { name: 'Ekspor Excel' })).toBeEnabled()
    view.unmount()
    await act(async () => { renderApplicants(true) })
    expect(screen.getByRole('button', { name: 'Ekspor Excel' })).toBeDisabled()
  })

  it.each([
    ['attachment; filename=pendaftar.xlsx', 'pendaftar.xlsx'],
    ['attachment; filename="Data Pendaftar (2026).xlsx"', 'Data Pendaftar (2026).xlsx'],
    ['', 'pendaftar-unima.xlsx'],
    ['attachment; filename="../../private.xlsx"', 'pendaftar-unima.xlsx'],
    ['attachment; filename="C:\\private.xlsx"', 'pendaftar-unima.xlsx'],
    ['attachment; filename="unsafe.exe"', 'pendaftar-unima.xlsx'],
    ['inline; filename="inline.xlsx"', 'pendaftar-unima.xlsx'],
    ['attachment; filename="unsafe<name>.xlsx"', 'pendaftar-unima.xlsx'],
    ['attachment; filename="unsafe\tname.xlsx"', 'pendaftar-unima.xlsx'],
  ])('uses a safe download filename for %s', async (disposition, expected) => {
    fetchMock.mockResolvedValue(excelResponse(disposition))
    renderApplicants()
    await userEvent.click(screen.getByRole('button', { name: 'Ekspor Excel' }))
    expect(downloads[0]?.filename).toBe(expected)
    await waitFor(() => expect(revokeURL).toHaveBeenCalledExactlyOnceWith('blob:applicants-export'))
  })

  it.each([401, 403])('explains login/admin access for HTTP %s without downloading', async (status) => {
    fetchMock.mockResolvedValue(Response.json({ error: 'Unauthorized' }, { status }))
    renderApplicants()
    await userEvent.click(screen.getByRole('button', { name: 'Ekspor Excel' }))
    await expectNoDownload(/login kembali dengan akun admin/i)
  })

  it('shows the human JSON error for HTTP 500', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'Ekspor sedang tidak tersedia' }, { status: 500 }))
    renderApplicants()
    await userEvent.click(screen.getByRole('button', { name: 'Ekspor Excel' }))
    await expectNoDownload('Ekspor sedang tidak tersedia')
  })

  it.each(['not json', '{', 'null', '{"error":{}}'])('handles malformed/non-message error JSON: %s', async (body) => {
    fetchMock.mockResolvedValue(new Response(body, { status: 500 }))
    renderApplicants()
    await userEvent.click(screen.getByRole('button', { name: 'Ekspor Excel' }))
    await expectNoDownload('Gagal mengekspor Excel. Silakan coba lagi.')
  })

  it.each(['text/html', 'application/json', 'application/octet-stream', ''])('rejects content type %s', async (type) => {
    fetchMock.mockResolvedValue(new Response('not an Excel download', { headers: { 'Content-Type': type } }))
    renderApplicants()
    await userEvent.click(screen.getByRole('button', { name: 'Ekspor Excel' }))
    await expectNoDownload('Respons ekspor bukan file Excel yang valid')
  })

  it('rejects an empty download body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { headers: { 'Content-Type': MIME } }))
    renderApplicants()
    await userEvent.click(screen.getByRole('button', { name: 'Ekspor Excel' }))
    await expectNoDownload('File Excel kosong atau tidak dapat diunduh')
  })

  it('handles a failed body read without downloading', async () => {
    const response = excelResponse()
    vi.spyOn(response, 'blob').mockRejectedValue(new TypeError('body interrupted'))
    fetchMock.mockResolvedValue(response)
    renderApplicants()
    await userEvent.click(screen.getByRole('button', { name: 'Ekspor Excel' }))
    await expectNoDownload('File Excel kosong atau tidak dapat diunduh')
  })

  it('handles network failures and allows retry', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    renderApplicants()
    await userEvent.click(screen.getByRole('button', { name: 'Ekspor Excel' }))
    await expectNoDownload(/Periksa koneksi Anda/)
    await userEvent.click(screen.getByRole('button', { name: 'Ekspor Excel' }))
    expect(downloads).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(revokeURL).toHaveBeenCalledExactlyOnceWith('blob:applicants-export'))
  })

  it('guards clicks before state flush and stays pending until the body is ready', async () => {
    let resolveBody!: (blob: Blob) => void
    const response = excelResponse()
    vi.spyOn(response, 'blob').mockReturnValue(new Promise<Blob>((resolve) => { resolveBody = resolve }))
    fetchMock.mockResolvedValue(response)
    renderApplicants()
    const button = screen.getByRole('button', { name: 'Ekspor Excel' })
    act(() => {
      // Both events run before React can commit the disabled state.
      button.click()
      button.click()
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Mengekspor...' })).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button.querySelector('.animate-spin')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Cakupan ekspor' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Tambah Pendaftar' })).toBeEnabled()
    await waitFor(() => expect(response.blob).toHaveBeenCalledOnce())
    expect(downloads).toEqual([])
    expect(screen.queryByText(/berhasil|disimpan/i)).not.toBeInTheDocument()
    await act(async () => { resolveBody(new Blob(['workbook'], { type: MIME })) })
    expect(downloads).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Ekspor Excel' })).toBeEnabled()
    await waitFor(() => expect(revokeURL).toHaveBeenCalledExactlyOnceWith('blob:applicants-export'))
  })

  it('removes the anchor and revokes its URL even when browser triggering fails', async () => {
    vi.mocked(HTMLAnchorElement.prototype.click).mockImplementation(() => { throw new Error('blocked') })
    renderApplicants()
    fireEvent.click(screen.getByRole('button', { name: 'Ekspor Excel' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('tidak dapat diunduh')
    expect(document.querySelector('a[download]')).toBeNull()
    await waitFor(() => expect(revokeURL).toHaveBeenCalledExactlyOnceWith('blob:applicants-export'))
  })
})
