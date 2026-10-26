import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TahapanPemilihan } from '@/components/tahapan'

describe('TahapanPemilihan', () => {
  it('hides stage dates and times by default', () => {
    render(<TahapanPemilihan />)

    expect(screen.queryByText(/Waktu:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Oktober 2026/)).not.toBeInTheDocument()
    expect(screen.queryByText(/November 2026/)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Audisi' })).toBeInTheDocument()
    expect(screen.getAllByText(/Tempat:/)).toHaveLength(6)
  })

  it('renders stage dates when explicitly enabled', () => {
    render(<TahapanPemilihan showDates />)

    expect(screen.getAllByText(/Waktu:/)).toHaveLength(6)
    expect(screen.getByText(/26–30 Oktober 2026/)).toBeInTheDocument()
    expect(screen.getAllByText(/26 November 2026/).length).toBeGreaterThan(0)
  })
})
