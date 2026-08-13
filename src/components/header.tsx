'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Beranda', href: '/' },
  { label: 'Tentang', href: '/about' },
  { label: 'Titleholders', href: '/titleholders' },
  { label: 'Finalis', href: '/finalists' },
  { label: 'Hall of Fame', href: '/hall-of-fame' },
  { label: 'Prestasi Alumni', href: '/alumni-achievements' },
  { label: 'Galeri', href: '/gallery' },
  { label: 'Berita', href: '/news' },
  { label: 'Acara', href: '/events' },
]

export function Header() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <>
      <a
        href="#main-content"
        className="fixed -top-10 left-4 z-[100] bg-primary-blue text-white px-4 py-2 text-sm font-medium rounded-md transition-all focus:top-4"
      >
        Langsung ke konten
      </a>

      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-border transition-all duration-300">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 group active-scale">
            <Image
              src="/images/logo-nyong-noni-unima.png"
              alt="Logo Nyong Noni UNIMA"
              width={40}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Navigasi utama">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'text-primary-blue'
                      : 'text-dark-text/70 hover:text-primary-blue',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-4/5 bg-gold rounded-full" />
                  )}
                </Link>
              )
            })}
          </nav>

          <button
            className="lg:hidden relative z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-border text-dark-text hover:bg-light-gray transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <div
          className={cn(
            'fixed inset-0 z-40 bg-white lg:hidden transition-transform duration-300 pt-[72px]',
            isOpen ? 'translate-x-0' : 'translate-x-full',
          )}
          aria-hidden={!isOpen}
        >
          <nav
            className="flex flex-col px-4 py-6 space-y-1"
            aria-label="Navigasi mobile"
          >
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-lg px-4 py-3.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'text-primary-blue bg-primary-blue/5 border-l-2 border-gold'
                      : 'text-dark-text/70 hover:text-primary-blue hover:bg-light-gray',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>
    </>
  )
}
