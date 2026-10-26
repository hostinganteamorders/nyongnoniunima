import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AnnouncementsPage from '@/app/(public)/announcements/page'
import { getPublishedSelectionAnnouncements } from '@/server/actions/selection'
import type { SelectionAnnouncement } from '@/lib/selection'

vi.mock('@/server/actions/selection', () => ({ getPublishedSelectionAnnouncements: vi.fn() }))

const published: SelectionAnnouncement = {
  year: 2026, title: 'Hasil Resmi 2026', body: 'Baris pertama\n\n<script>alert("test")</script>',
  published_at: '2026-10-25T00:00:00Z', participants: [
    { id: 'a1', full_name: 'Finalis Contoh', faculty: 'Fakultas Bahasa', study_program: 'Pendidikan Bahasa', gender: 'Laki-laki', photo_url: null },
  ],
}

describe('Published announcements', () => {
  beforeEach(() => vi.resetAllMocks())

  it('shows the unpublished empty state', async () => {
    vi.mocked(getPublishedSelectionAnnouncements).mockResolvedValue([])
    render(await AnnouncementsPage())
    expect(screen.getByRole('heading', { name: 'Belum Ada Pengumuman' })).toBeInTheDocument()
  })

  it('renders published years and safe participants, preserving body as plain text and excluding drafts', async () => {
    const older = { ...published, year: 2025, title: 'Hasil Resmi 2025', participants: [] }
    const draft = { ...published, year: 2027, title: 'RAHASIA DRAF', published_at: null }
    vi.mocked(getPublishedSelectionAnnouncements).mockResolvedValue([older, draft, published])
    const { container } = render(await AnnouncementsPage())
    expect(screen.queryByText('RAHASIA DRAF')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Fakultas Bahasa' })).toBeInTheDocument()
    expect(screen.getByText('Finalis Contoh')).toBeInTheDocument()
    expect(screen.getByText('Pendidikan Bahasa')).toBeInTheDocument()
    expect(container.querySelector('time')).toHaveAttribute('dateTime', published.published_at)
    const body = container.querySelector('p.whitespace-pre-wrap')
    expect(body?.textContent).toBe(published.body)
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('article')).toHaveAttribute('id', 'tahun-2026')
    expect(container.innerHTML).not.toContain('wa.me')
    expect(container.innerHTML).not.toContain('chat.whatsapp.com')
  })

  it('does not silently turn a loading error into an empty published result', async () => {
    vi.mocked(getPublishedSelectionAnnouncements).mockRejectedValue(new Error('Gagal memuat pengumuman'))
    await expect(AnnouncementsPage()).rejects.toThrow('Gagal memuat pengumuman')
  })
})
