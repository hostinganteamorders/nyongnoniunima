import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({ open: vi.fn(), rules: vi.fn() }))
vi.mock('@/server/actions/unima', () => ({ isRegistrationOpen: mocks.open }))
vi.mock('@/server/actions/registration-rules', () => ({ getRegistrationRules: mocks.rules }))
vi.mock('@/app/(public)/register/register-form', () => ({
  RegisterForm: ({ auditionStart }: { auditionStart: string }) => <div data-testid="registration-form">{auditionStart}</div>,
}))
vi.mock('@/components/syarat-ketentuan', () => ({ SyaratKetentuan: () => null }))

import RegisterPage from '@/app/(public)/register/page'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.open.mockResolvedValue(true)
  mocks.rules.mockResolvedValue({ year: 2027, auditionStart: '2027-10-26' })
})

describe('public registration rules', () => {
  it('passes the configured audition date to the form', async () => {
    render(await RegisterPage())
    expect(screen.getByTestId('registration-form')).toHaveTextContent('2027-10-26')
  })

  it('does not fetch rules or render a form when registration is closed', async () => {
    mocks.open.mockResolvedValue(false)
    render(await RegisterPage())
    expect(mocks.rules).not.toHaveBeenCalled()
    expect(screen.queryByTestId('registration-form')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Coming Soon' })).toBeInTheDocument()
  })

  it('fails closed with a public message when the selection year has no audition date', async () => {
    mocks.rules.mockRejectedValue(new Error('Atur tanggal audisi untuk tahun 2027 sebelum membuka pendaftaran'))
    render(await RegisterPage())
    expect(screen.queryByTestId('registration-form')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pendaftaran Belum Tersedia' })).toBeInTheDocument()
    expect(screen.getByText(/Jadwal audisi dan ketentuan pendaftaran sedang disiapkan/)).toBeInTheDocument()
  })

  it('does not expose internal settings errors to public visitors', async () => {
    mocks.rules.mockRejectedValue(new Error('Internal database credentials error'))
    render(await RegisterPage())
    expect(screen.queryByText(/credentials/)).not.toBeInTheDocument()
    expect(screen.queryByTestId('registration-form')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kembali ke Beranda' })).toHaveAttribute('href', '/')
  })
})
