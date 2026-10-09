import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { Countdown } from '@/components/countdown'

describe('Countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders countdown items for future date', () => {
    const targetDate = '2026-08-15T00:00:00Z'
    render(<Countdown targetDate={targetDate} />)

    expect(screen.getByText('Hari')).toBeInTheDocument()
    expect(screen.getByText('Jam')).toBeInTheDocument()
    expect(screen.getByText('Menit')).toBeInTheDocument()
    expect(screen.getByText('Detik')).toBeInTheDocument()
  })

  it('returns null for past date', () => {
    const targetDate = '2025-01-01T00:00:00Z'
    const { container } = render(<Countdown targetDate={targetDate} />)
    expect(container.innerHTML).toBe('')
  })

  it('displays correct number of days for future date', async () => {
    const targetDate = '2026-08-15T00:00:00Z'
    render(<Countdown targetDate={targetDate} />)

    await act(async () => {
      vi.advanceTimersByTime(100)
    })

    expect(screen.getByText('75')).toBeInTheDocument()
  })

  it('updates countdown value after each tick', async () => {
    const targetDate = '2026-06-01T00:00:30Z'
    render(<Countdown targetDate={targetDate} />)

    await act(async () => {
      vi.advanceTimersByTime(100)
    })

    expect(screen.getByText('30')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    expect(screen.getByText('29')).toBeInTheDocument()
  })

  it('applies custom className', async () => {
    const targetDate = '2026-08-15T00:00:00Z'
    render(<Countdown targetDate={targetDate} className="custom-class" />)

    await act(async () => {
      vi.advanceTimersByTime(100)
    })

    const el = document.querySelector('.custom-class')
    expect(el).toBeInTheDocument()
  })
})
