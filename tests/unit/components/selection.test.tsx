import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SelectionAdminData, SelectionApplicant } from '@/lib/selection'
import { SelectionClient } from '@/app/admin/selection/selection-client'
import AdminSelectionPage from '@/app/admin/selection/page'
import { getRegistrationRules, saveAuditionDate } from '@/server/actions/registration-rules'
import {
  getSelectionAdminData, publishFinalists, saveFacultyWhatsAppGroup,
  saveSelectionAnnouncement, setRegistrationYear, updateSelectionStage,
} from '@/server/actions/selection'

vi.mock('@/server/actions/selection', () => ({
  getSelectionAdminData: vi.fn(), publishFinalists: vi.fn(), saveFacultyWhatsAppGroup: vi.fn(),
  saveSelectionAnnouncement: vi.fn(), setRegistrationYear: vi.fn(), updateSelectionStage: vi.fn(),
}))
vi.mock('@/server/actions/registration-rules', () => ({
  getRegistrationRules: vi.fn(), saveAuditionDate: vi.fn(),
}))

function applicant(overrides: Partial<SelectionApplicant> = {}): SelectionApplicant {
  return {
    id: 'a1', full_name: 'Aldo Contoh', phone: '081234567890', faculty: 'f1',
    study_program: 'Pendidikan Bahasa', gender: 'Laki-laki', photo_url: null,
    status: 'verified', selection_year: 2026, stage: null, semifinalist_at: null, ...overrides,
  }
}

function data(overrides: Partial<SelectionAdminData> = {}): SelectionAdminData {
  return {
    year: 2026, activeYear: 2026, years: [2026, 2025],
    faculties: [{ id: 'f1', name: 'Fakultas Bahasa' }, { id: 'f2', name: 'Fakultas Teknik' }],
    applicants: [applicant()], groups: [{ faculty_id: 'f1', invite_url: 'https://chat.whatsapp.com/FacultyToken' }],
    announcement: { year: 2026, title: 'Finalis 2026', body: 'Selamat kepada finalis.\nSampai bertemu.', published_at: null, participants: [] },
    ...overrides,
  }
}

function row(name = 'Aldo Contoh') {
  return within(screen.getByRole('heading', { name }).closest('article')!)
}

describe('Selection admin', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getSelectionAdminData).mockResolvedValue(data())
  })

  it('requires confirmation, saves stage, then offers a user-gesture WhatsApp link', async () => {
    const user = userEvent.setup()
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    vi.mocked(getSelectionAdminData).mockResolvedValue(data({ applicants: [applicant({ stage: 'semifinalist', semifinalist_at: '2026-10-01T00:00:00Z' })] }))
    render(<SelectionClient initialData={data()} />)
    expect(row().queryByRole('button', { name: 'Kirim Undangan WA' })).not.toBeInTheDocument()
    await user.click(row().getByRole('button', { name: 'Tetapkan sebagai Semifinalis' }))
    expect(updateSelectionStage).not.toHaveBeenCalled()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Konfirmasi dan Simpan' }))
    await waitFor(() => expect(updateSelectionStage).toHaveBeenCalledWith('a1', 'semifinalist'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.click(row().getByRole('button', { name: 'Kirim Undangan WA' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('heading', { name: 'Pratinjau Undangan WA' })).toBeInTheDocument()
    const link = dialog.getByRole('link', { name: 'Kirim Undangan WA' })
    const url = new URL(link.getAttribute('href')!)
    expect(url.hostname).toBe('wa.me')
    expect(url.pathname).toBe('/6281234567890')
    expect(url.searchParams.get('text')).toContain('Aldo Contoh')
    expect(url.searchParams.get('text')).toContain('Fakultas Bahasa')
    expect(url.searchParams.get('text')).toContain('2026')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(open).not.toHaveBeenCalled()
    open.mockRestore()
  })

  it('keeps a failed mutation visible without offering an invitation', async () => {
    const user = userEvent.setup()
    vi.mocked(updateSelectionStage).mockRejectedValue(new Error('Sesi berakhir'))
    render(<SelectionClient initialData={data()} />)
    await user.click(row().getByRole('button', { name: 'Tetapkan sebagai Semifinalis' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Konfirmasi dan Simpan' }))
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Sesi berakhir')
    expect(getSelectionAdminData).not.toHaveBeenCalled()
  })

  it.each(['semifinalist', 'finalist_draft', 'finalist'] as const)('offers invitations for %s with semifinalist history', async (stage) => {
    const user = userEvent.setup()
    render(<SelectionClient initialData={data({ applicants: [applicant({ stage, semifinalist_at: '2026-10-01' })] })} />)
    await user.click(row().getByRole('button', { name: 'Kirim Undangan WA' }))
    expect(within(screen.getByRole('dialog')).getByRole('link', { name: 'Kirim Undangan WA' })).toBeInTheDocument()
  })

  it('does not offer invitations without semifinalist history', () => {
    render(<SelectionClient initialData={data({ applicants: [applicant({ stage: 'finalist_draft' })] })} />)
    expect(row().queryByRole('button', { name: 'Kirim Undangan WA' })).not.toBeInTheDocument()
  })

  it.each([
    { applicants: [applicant({ stage: 'semifinalist', semifinalist_at: '2026-10-01', phone: 'invalid' })] },
    { applicants: [applicant({ stage: 'semifinalist', semifinalist_at: '2026-10-01' })], groups: [] },
  ])('disables invitations for an invalid phone or missing group', (overrides) => {
    render(<SelectionClient initialData={data(overrides)} />)
    expect(row().getByRole('button', { name: 'Kirim Undangan WA' })).toBeDisabled()
    expect(row().queryByRole('link')).not.toBeInTheDocument()
  })

  it('filters by faculty, stage, category, and search without hiding selected candidate preview', async () => {
    const user = userEvent.setup()
    render(<SelectionClient initialData={data({ applicants: [
      applicant(),
      applicant({ id: 'a2', full_name: 'Noni Contoh', faculty: 'f2', gender: 'Perempuan', stage: 'finalist_draft', semifinalist_at: '2026-10-01' }),
    ] })} />)
    await user.selectOptions(screen.getByLabelText('Fakultas'), 'Fakultas Bahasa')
    expect(screen.getByRole('heading', { name: 'Aldo Contoh' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Noni Contoh' })).not.toBeInTheDocument()
    expect(screen.getByText('Pratinjau kandidat terpilih (1)')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Fakultas'), 'all')
    await user.selectOptions(screen.getByLabelText('Tahap'), 'finalist_draft')
    await user.selectOptions(screen.getByLabelText('Kategori'), 'Noni')
    await user.type(screen.getByLabelText('Cari peserta'), 'Noni')
    expect(screen.getByRole('heading', { name: 'Noni Contoh' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Aldo Contoh' })).not.toBeInTheDocument()
  })

  it('allows pending and verified candidates to be marked not selected at faculty', () => {
    render(<SelectionClient initialData={data({ applicants: [applicant(), applicant({ id: 'a2', full_name: 'Pending Contoh', status: 'pending' })] })} />)
    expect(row().getByRole('button', { name: 'Tidak lolos fakultas' })).toBeEnabled()
    expect(row('Pending Contoh').getByRole('button', { name: 'Tidak lolos fakultas' })).toBeEnabled()
    expect(row('Pending Contoh').queryByRole('button', { name: 'Tetapkan sebagai Semifinalis' })).not.toBeInTheDocument()
  })

  it.each([
    ['semifinalist', 'Pilih untuk Draf Finalis', 'finalist_draft'],
    ['semifinalist', 'Tidak lolos ke final', 'not_selected_university'],
    ['finalist_draft', 'Reset Pilihan Draf', 'reset_finalist_draft'],
  ] as const)('saves the %s row action %s', async (stage, label, next) => {
    const user = userEvent.setup()
    render(<SelectionClient initialData={data({ applicants: [applicant({ stage, semifinalist_at: '2026-10-01' })] })} />)
    await user.click(row().getByRole('button', { name: label }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Konfirmasi dan Simpan' }))
    await waitFor(() => expect(updateSelectionStage).toHaveBeenCalledWith('a1', next))
  })

  it('loads the selected year without changing registration and saves registration explicitly', async () => {
    const user = userEvent.setup()
    vi.mocked(getSelectionAdminData).mockResolvedValue(data({ year: 2025, applicants: [] }))
    render(<SelectionClient initialData={data()} />)
    await user.selectOptions(screen.getByLabelText('Tahun seleksi'), '2025')
    await waitFor(() => expect(getSelectionAdminData).toHaveBeenCalledWith(2025))
    expect(setRegistrationYear).not.toHaveBeenCalled()
    const input = screen.getByLabelText('Tahun aktif baru')
    await user.clear(input)
    await user.type(input, '2027')
    const date = screen.getByLabelText('Tanggal audisi')
    expect(date).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Simpan Tahun Aktif' })).toBeDisabled()
    await user.type(date, '2027-10-25')
    expect(saveAuditionDate).not.toHaveBeenCalled()
    expect(setRegistrationYear).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Simpan Tahun Aktif' }))
    await waitFor(() => expect(setRegistrationYear).toHaveBeenCalledWith(2027))
    expect(saveAuditionDate).toHaveBeenCalledWith(2027, '2027-10-25')
    expect(vi.mocked(saveAuditionDate).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(setRegistrationYear).mock.invocationCallOrder[0])
  })

  it('shows the configured active date and explicitly saves date changes for the same year', async () => {
    const user = userEvent.setup()
    render(<SelectionClient initialData={data()} initialAuditionDate="2026-11-02" />)
    expect(screen.getByText('Tanggal audisi aktif: 2026-11-02')).toBeInTheDocument()
    const date = screen.getByLabelText('Tanggal audisi')
    expect(date).toHaveValue('2026-11-02')
    expect(screen.getByRole('button', { name: 'Simpan Tahun Aktif' })).toBeDisabled()
    await user.clear(date)
    await user.type(date, '2026-11-05')
    expect(saveAuditionDate).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Simpan Tahun Aktif' }))
    await waitFor(() => expect(setRegistrationYear).toHaveBeenCalledWith(2026))
    expect(saveAuditionDate).toHaveBeenCalledWith(2026, '2026-11-05')
    expect(screen.getByText('Tanggal audisi aktif: 2026-11-05')).toBeInTheDocument()
  })

  it('uses the initial 2026 default, but leaves an unconfigured later year empty', async () => {
    const user = userEvent.setup()
    render(<SelectionClient initialData={data()} />)
    expect(screen.getByLabelText('Tanggal audisi')).toHaveValue('2026-10-26')
    const year = screen.getByLabelText('Tahun aktif baru')
    await user.clear(year)
    await user.type(year, '2027')
    expect(screen.getByLabelText('Tanggal audisi')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Simpan Tahun Aktif' })).toBeDisabled()
    await user.type(screen.getByLabelText('Tanggal audisi'), '2026-10-26')
    expect(screen.getByRole('button', { name: 'Simpan Tahun Aktif' })).toBeDisabled()
    expect(saveAuditionDate).not.toHaveBeenCalled()
    expect(setRegistrationYear).not.toHaveBeenCalled()
  })

  it('requires a date when the initial active year is not configured', () => {
    render(<SelectionClient initialData={data({ activeYear: 2027 })} />)
    expect(screen.getByText('Tanggal audisi aktif: Belum diatur')).toBeInTheDocument()
    expect(screen.getByLabelText('Tanggal audisi')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Simpan Tahun Aktif' })).toBeDisabled()
  })

  it('does not activate the year if saving the audition date fails', async () => {
    const user = userEvent.setup()
    vi.mocked(saveAuditionDate).mockRejectedValue(new Error('Tanggal gagal disimpan'))
    render(<SelectionClient initialData={data()} />)
    await user.clear(screen.getByLabelText('Tanggal audisi'))
    await user.type(screen.getByLabelText('Tanggal audisi'), '2026-11-05')
    await user.click(screen.getByRole('button', { name: 'Simpan Tahun Aktif' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Tanggal gagal disimpan')
    expect(setRegistrationYear).not.toHaveBeenCalled()
    expect(screen.getByText('Tanggal audisi aktif: 2026-10-26')).toBeInTheDocument()
  })

  it('guards unsaved announcement previews before changing the selection year', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<SelectionClient initialData={data()} />)
    await user.type(screen.getByLabelText('Isi pengumuman'), '\nPerubahan belum disimpan')
    await user.selectOptions(screen.getByLabelText('Tahun seleksi'), '2025')
    expect(confirm).toHaveBeenCalled()
    expect(getSelectionAdminData).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Tahun seleksi')).toHaveValue('2026')
    expect(screen.getByLabelText('Isi pengumuman')).toHaveValue(`${data().announcement!.body}\nPerubahan belum disimpan`)
    confirm.mockRestore()
  })

  it('guards unsaved audition-date edits before changing the selection year', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<SelectionClient initialData={data()} />)
    await user.clear(screen.getByLabelText('Tanggal audisi'))
    await user.type(screen.getByLabelText('Tanggal audisi'), '2026-11-05')
    await user.selectOptions(screen.getByLabelText('Tahun seleksi'), '2025')
    expect(confirm).toHaveBeenCalled()
    expect(getSelectionAdminData).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Tanggal audisi')).toHaveValue('2026-11-05')
    confirm.mockRestore()
  })

  it('clears the faculty group only after explicit save', async () => {
    const user = userEvent.setup()
    render(<SelectionClient initialData={data()} />)
    const input = screen.getByLabelText('Fakultas Bahasa')
    await user.clear(input)
    expect(saveFacultyWhatsAppGroup).not.toHaveBeenCalled()
    await user.click(within(input.closest('form')!).getByRole('button', { name: 'Simpan Grup' }))
    await waitFor(() => expect(saveFacultyWhatsAppGroup).toHaveBeenCalledWith(2026, 'f1', ''))
  })

  it('saves announcement before publication, synchronizing backend-normalized text', async () => {
    const user = userEvent.setup()
    const selected = applicant({ stage: 'finalist_draft', semifinalist_at: '2026-10-01' })
    const initial = data({ applicants: [selected] })
    vi.mocked(getSelectionAdminData).mockResolvedValue(data({ applicants: [selected], announcement: { ...initial.announcement!, title: 'Judul baru' } }))
    render(<SelectionClient initialData={initial} />)
    const title = screen.getByLabelText('Judul pengumuman')
    await user.clear(title)
    await user.type(title, '  Judul baru  ')
    expect(screen.getByRole('button', { name: 'Terbitkan Pengumuman Finalis' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Simpan Draf Pengumuman' }))
    await waitFor(() => expect(title).toHaveValue('Judul baru'))
    expect(saveSelectionAnnouncement).toHaveBeenCalledWith(2026, '  Judul baru  ', initial.announcement!.body)
    expect(screen.getByRole('button', { name: 'Terbitkan Pengumuman Finalis' })).toBeEnabled()
    expect(publishFinalists).not.toHaveBeenCalled()
  })

  it('requires irreversible publication confirmation and then displays read-only snapshot results', async () => {
    const user = userEvent.setup()
    const initial = data({ applicants: [applicant({ stage: 'finalist_draft', semifinalist_at: '2026-10-01' })] })
    vi.mocked(getSelectionAdminData).mockResolvedValue(data({
      applicants: [applicant({ stage: 'finalist', semifinalist_at: '2026-10-01' })],
      announcement: { ...initial.announcement!, published_at: '2026-10-25T00:00:00Z', participants: [{ id: 'a1', full_name: 'Nama Snapshot', faculty: 'Fakultas Bahasa', study_program: 'Pendidikan Bahasa', gender: 'Laki-laki', photo_url: null }] },
    }))
    render(<SelectionClient initialData={initial} />)
    await user.click(screen.getByRole('button', { name: 'Terbitkan Pengumuman Finalis' }))
    expect(publishFinalists).not.toHaveBeenCalled()
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText(/tidak dapat dibatalkan/)).toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: 'Terbitkan Pengumuman Finalis' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(publishFinalists).toHaveBeenCalledWith(2026, {
      candidateIds: ['a1'], title: initial.announcement!.title, body: initial.announcement!.body,
    })
    expect(screen.getByText('Nama Snapshot')).toBeInTheDocument()
    expect(screen.queryByLabelText('Judul pengumuman')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Terbitkan Pengumuman Finalis' })).not.toBeInTheDocument()
    expect(row().queryByRole('button', { name: 'Reset Pilihan Draf' })).not.toBeInTheDocument()
  })

  it('submits the complete current preview even when candidate filters hide selected drafts', async () => {
    const user = userEvent.setup()
    const initial = data({ applicants: [
      applicant({ stage: 'finalist_draft', semifinalist_at: '2026-10-01' }),
      applicant({ id: 'a2', full_name: 'Noni Contoh', faculty: 'f2', gender: 'Perempuan', stage: 'finalist_draft', semifinalist_at: '2026-10-01' }),
      applicant({ id: 'a3', full_name: 'Semifinalis Contoh', stage: 'semifinalist', semifinalist_at: '2026-10-01' }),
    ] })
    render(<SelectionClient initialData={initial} />)
    await user.selectOptions(screen.getByLabelText('Fakultas'), 'Fakultas Bahasa')
    await user.click(screen.getByRole('button', { name: 'Terbitkan Pengumuman Finalis' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Terbitkan Pengumuman Finalis' }))
    await waitFor(() => expect(publishFinalists).toHaveBeenCalledWith(2026, {
      candidateIds: ['a1', 'a2'], title: initial.announcement!.title, body: initial.announcement!.body,
    }))
  })

  it('keeps backend stale-preview rejection visible without claiming publication succeeded', async () => {
    const user = userEvent.setup()
    const initial = data({ applicants: [applicant({ stage: 'finalist_draft', semifinalist_at: '2026-10-01' })] })
    vi.mocked(publishFinalists).mockRejectedValue(new Error('Pratinjau berubah. Muat ulang sebelum menerbitkan.'))
    render(<SelectionClient initialData={initial} />)
    await user.click(screen.getByRole('button', { name: 'Terbitkan Pengumuman Finalis' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Terbitkan Pengumuman Finalis' }))
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Pratinjau berubah')
    expect(getSelectionAdminData).not.toHaveBeenCalled()
    expect(screen.queryByText('Finalis yang diterbitkan')).not.toBeInTheDocument()
  })

  it.each([
    data(),
    data({ year: 2025, applicants: [applicant({ stage: 'finalist_draft', selection_year: 2025, semifinalist_at: '2025-10-01' })] }),
  ])('blocks publication without drafts or when viewing another year', (initialData) => {
    render(<SelectionClient initialData={initialData} />)
    expect(screen.getByRole('button', { name: 'Terbitkan Pengumuman Finalis' })).toBeDisabled()
  })
})

describe('Selection admin server page', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getSelectionAdminData).mockResolvedValue(data())
  })

  it('loads the configured active audition date separately from selection data', async () => {
    vi.mocked(getRegistrationRules).mockResolvedValue({ year: 2026, auditionStart: '2026-11-02' })
    const page = await AdminSelectionPage()
    expect(page.props.initialAuditionDate).toBe('2026-11-02')
    expect(page.props.initialData).toEqual(data())
  })

  it('keeps configuration available when registration rules have a missing date', async () => {
    vi.mocked(getRegistrationRules).mockRejectedValue(new Error('Atur tanggal audisi'))
    const page = await AdminSelectionPage()
    expect(page.props.initialAuditionDate).toBeUndefined()
    expect(page.props.initialData).toEqual(data())
  })

  it('does not attach an audition date from a different active year', async () => {
    vi.mocked(getRegistrationRules).mockResolvedValue({ year: 2027, auditionStart: '2027-11-02' })
    const page = await AdminSelectionPage()
    expect(page.props.initialAuditionDate).toBeUndefined()
  })
})
