import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeDefined()
  })

  it('applies default variant classes', () => {
    render(<Button>Default</Button>)
    const button = screen.getByText('Default')
    expect(button.className).toContain('bg-primary')
  })

  it('applies accent variant classes', () => {
    render(<Button variant="accent">Accent</Button>)
    const button = screen.getByText('Accent')
    expect(button.className).toContain('bg-accent')
  })

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    const button = screen.getByText('Custom')
    expect(button.className).toContain('custom-class')
  })

  it('renders as child when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link</a>
      </Button>
    )
    const link = screen.getByText('Link')
    expect(link.tagName).toBe('A')
  })

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByText('Disabled')
    expect(button).toBeDisabled()
  })
})
