import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Footer } from '@/components/footer'

describe('Footer', () => {
  it('renders brand section', () => {
    render(<Footer />)
    expect(screen.getByAltText('Logo Nyong Noni UNIMA')).toBeInTheDocument()
    expect(screen.getByText(/Wadah pengembangan mahasiswa/i)).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    render(<Footer />)
    expect(screen.getByText('Finalis')).toBeInTheDocument()
    expect(screen.getByText('Hall of Fame')).toBeInTheDocument()
    expect(screen.getByText('Prestasi Alumni')).toBeInTheDocument()
  })

  it('renders contact information', () => {
    render(<Footer />)
    expect(screen.getByText('Universitas Negeri Manado, Tondano, Sulawesi Utara')).toBeInTheDocument()
    expect(screen.getByText('nyongnoni@unima.ac.id')).toBeInTheDocument()
  })

  it('renders social media links', () => {
    render(<Footer />)
    const instagramLink = screen.getByLabelText('Instagram Nyong Noni UNIMA')
    expect(instagramLink).toBeInTheDocument()
    expect(instagramLink).toHaveAttribute('href', 'https://instagram.com/nyongnoniunima')

    const emailLink = screen.getByLabelText('Email Nyong Noni UNIMA')
    expect(emailLink).toBeInTheDocument()
    expect(emailLink).toHaveAttribute('href', 'mailto:nyongnoni@unima.ac.id')
  })

  it('renders copyright notice with current year', () => {
    render(<Footer />)
    const year = new Date().getFullYear()
    expect(screen.getByText(new RegExp(`${year}`))).toBeInTheDocument()
  })

  it('renders bottom links', () => {
    render(<Footer />)
    const tentangLinks = screen.getAllByText('Tentang')
    expect(tentangLinks.length).toBeGreaterThan(1)
    const unimaLinks = screen.getAllByText('UNIMA')
    expect(unimaLinks.length).toBeGreaterThan(0)
    expect(unimaLinks.some((el) => (el.closest('a') as HTMLAnchorElement | null)?.href.includes('unima.ac.id'))).toBe(true)
  })
})
