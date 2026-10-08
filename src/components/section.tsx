import { type ReactNode } from 'react'

interface SectionProps {
  children: ReactNode
  className?: string
  id?: string
  variant?: 'default' | 'blue' | 'accent' | 'light'
}

const variantStyles: Record<string, string> = {
  default: 'bg-white',
  blue: 'bg-primary-blue text-white',
  accent: 'bg-accent text-dark-text',
  light: 'bg-light-gray',
}

export function Section({ children, className = '', id, variant = 'default' }: SectionProps) {
  return (
    <section id={id} className={`py-section ${variantStyles[variant]} ${className}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {children}
      </div>
    </section>
  )
}
