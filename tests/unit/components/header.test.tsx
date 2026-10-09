import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => '/about',
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

import { Header } from '@/components/header'

describe('Header', () => {
  beforeEach(() => {
    window.scrollY = 0
    window.innerWidth = 1024
  })

  it('renders all navigation items (desktop + mobile)', () => {
    render(<Header />)
    const navItems = ['Beranda', 'Tentang', 'Titleholders', 'Finalis', 'Hall of Fame', 'Prestasi Alumni', 'Galeri', 'Berita', 'Acara']
    navItems.forEach((item) => {
      const links = screen.getAllByText(item)
      expect(links.length).toBe(2)
    })
  })

  it('highlights active link on desktop nav', () => {
    render(<Header />)
    const desktopNav = screen.getByLabelText('Navigasi utama')
    const tentangLink = within(desktopNav).getByText('Tentang')
    expect(tentangLink.closest('a')).toHaveAttribute('aria-current', 'page')
  })

  it('does not highlight non-active links on desktop nav', () => {
    render(<Header />)
    const desktopNav = screen.getByLabelText('Navigasi utama')
    const berandaLink = within(desktopNav).getByText('Beranda')
    expect(berandaLink.closest('a')).not.toHaveAttribute('aria-current')
  })

  it('renders brand logo', () => {
    render(<Header />)
    expect(screen.getByAltText('Logo Nyong Noni UNIMA')).toBeInTheDocument()
  })

  it('renders skip link', () => {
    render(<Header />)
    const skipLink = screen.getByText('Langsung ke konten')
    expect(skipLink).toBeInTheDocument()
    expect(skipLink.closest('a')).toHaveAttribute('href', '#main-content')
  })

  it('toggles mobile menu', async () => {
    window.innerWidth = 375
    const user = userEvent.setup()
    render(<Header />)

    const menuButton = screen.getByLabelText('Buka menu')
    expect(menuButton).toBeInTheDocument()
    await user.click(menuButton)
    expect(screen.getByLabelText('Tutup menu')).toBeInTheDocument()
  })

  it('renders mobile navigation links after opening menu', async () => {
    window.innerWidth = 375
    const user = userEvent.setup()
    render(<Header />)

    await user.click(screen.getByLabelText('Buka menu'))
    const mobileNav = screen.getByLabelText('Navigasi mobile')
    expect(within(mobileNav).getByText('Finalis')).toBeInTheDocument()
    expect(within(mobileNav).getByText('Acara')).toBeInTheDocument()
  })
})
