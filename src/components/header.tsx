'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavLink = { label: string; href: string }
type NavGroup = { label: string; items: NavLink[] }
type NavEntry = NavLink | NavGroup

const NAV: NavEntry[] = [
  { label: 'Tentang', href: '/about' },
  {
    label: 'Titleholders',
    items: [
      { label: 'Arsip Titleholders', href: '/titleholders' },
      { label: 'Titleholders Saat Ini', href: '/current-titleholders' },
      { label: 'Hall of Fame', href: '/hall-of-fame' },
      { label: 'Prestasi Alumni', href: '/alumni-achievements' },
    ],
  },
  {
    label: 'Kabar',
    items: [
      { label: 'Berita', href: '/news' },
      { label: 'Acara', href: '/events' },
      { label: 'Pengumuman', href: '/announcements' },
    ],
  },
  { label: 'Galeri', href: '/gallery' },
]

const isGroup = (e: NavEntry): e is NavGroup => 'items' in e

export function Header() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const navRef = useRef<HTMLElement>(null)

  const active = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href))

  useEffect(() => {
    setMobileOpen(false)
    setOpenGroup(null)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  useEffect(() => {
    if (!openGroup) return
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenGroup(null)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [openGroup])

  const finalisActive = active('/finalists')

  return (
    <>
      <a
        href="#main-content"
        className="fixed -top-12 left-4 z-[100] rounded-md bg-navy px-4 py-2 text-sm font-medium text-white transition-all focus:top-4"
      >
        Langsung ke konten
      </a>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-ivory/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Nyong Noni UNIMA — Beranda">
            <Image
              src="/images/logo-nyong-noni-unima.png"
              alt=""
              width={40}
              height={44}
              className="h-10 w-auto"
              priority
            />
            <span className="hidden font-serif text-lg font-semibold leading-none text-navy sm:block">
              Nyong Noni UNIMA
            </span>
          </Link>

          <nav ref={navRef} className="hidden items-center gap-1 lg:flex" aria-label="Navigasi utama">
            {NAV.map((entry) =>
              isGroup(entry) ? (
                <div key={entry.label} className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenGroup(openGroup === entry.label ? null : entry.label)}
                    aria-expanded={openGroup === entry.label}
                    aria-haspopup="true"
                    className={cn(
                      'flex min-h-11 items-center gap-1 rounded-full px-4 text-sm font-medium transition-colors hover:bg-chip',
                      entry.items.some((i) => active(i.href)) ? 'text-navy' : 'text-navy/70',
                    )}
                  >
                    {entry.label}
                    <ChevronDown
                      className={cn('size-4 transition-transform', openGroup === entry.label && 'rotate-180')}
                      aria-hidden
                    />
                  </button>
                  {openGroup === entry.label && (
                    <div className="absolute left-0 top-full mt-2 w-60 rounded-2xl border border-line bg-white p-2 shadow-xl">
                      {entry.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          aria-current={active(item.href) ? 'page' : undefined}
                          className={cn(
                            'block rounded-xl px-4 py-3 text-sm font-medium transition-colors hover:bg-chip',
                            active(item.href) ? 'bg-chip text-navy' : 'text-navy/80',
                          )}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={entry.href}
                  href={entry.href}
                  aria-current={active(entry.href) ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center rounded-full px-4 text-sm font-medium transition-colors hover:bg-chip',
                    active(entry.href) ? 'text-navy' : 'text-navy/70',
                  )}
                >
                  {entry.label}
                </Link>
              ),
            )}
            <Link
              href="/finalists"
              aria-current={finalisActive ? 'page' : undefined}
              className="ml-2 inline-flex min-h-11 items-center rounded-full bg-navy px-5 text-sm font-bold text-gold transition-colors hover:bg-navy-2"
            >
              Finalis 2026
            </Link>
          </nav>

          <button
            type="button"
            className="relative z-50 flex size-11 items-center justify-center rounded-full border border-line bg-white text-navy transition-colors hover:bg-chip lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        <div
          className={cn(
            'fixed inset-0 z-40 overflow-y-auto bg-ivory pt-[72px] transition-transform duration-300 lg:hidden',
            mobileOpen ? 'translate-x-0' : 'translate-x-full',
          )}
          aria-hidden={!mobileOpen}
          inert={!mobileOpen}
        >
          <nav className="flex flex-col gap-6 px-5 py-6" aria-label="Navigasi mobile">
            <Link
              href="/finalists"
              className="flex min-h-12 items-center justify-center rounded-full bg-navy text-base font-bold text-gold"
            >
              Finalis 2026
            </Link>
            {NAV.map((entry) =>
              isGroup(entry) ? (
                <div key={entry.label}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold-deep">{entry.label}</p>
                  <div className="flex flex-col">
                    {entry.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active(item.href) ? 'page' : undefined}
                        className={cn(
                          'flex min-h-12 items-center border-b border-line text-base font-medium',
                          active(item.href) ? 'text-navy' : 'text-navy/75',
                        )}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link
                  key={entry.href}
                  href={entry.href}
                  aria-current={active(entry.href) ? 'page' : undefined}
                  className="flex min-h-12 items-center border-b border-line text-base font-semibold text-navy"
                >
                  {entry.label}
                </Link>
              ),
            )}
          </nav>
        </div>
      </header>
    </>
  )
}
