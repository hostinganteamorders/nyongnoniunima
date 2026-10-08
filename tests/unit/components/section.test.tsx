import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Section } from '@/components/section'

describe('Section', () => {
  it('renders children', () => {
    render(<Section><p>Test content</p></Section>)
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('applies default variant class', () => {
    const { container } = render(<Section>Content</Section>)
    expect(container.firstChild).toHaveClass('bg-white')
  })

  it('applies blue variant class', () => {
    const { container } = render(<Section variant="blue">Content</Section>)
    expect(container.firstChild).toHaveClass('bg-primary-blue')
  })

  it('applies light variant class', () => {
    const { container } = render(<Section variant="light">Content</Section>)
    expect(container.firstChild).toHaveClass('bg-light-gray')
  })

  it('applies accent variant class', () => {
    const { container } = render(<Section variant="accent">Content</Section>)
    expect(container.firstChild).toHaveClass('bg-accent')
  })

  it('applies custom className', () => {
    const { container } = render(<Section className="custom-class">Content</Section>)
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('sets id prop', () => {
    const { container } = render(<Section id="test-section">Content</Section>)
    expect(container.querySelector('#test-section')).toBeInTheDocument()
  })
})
