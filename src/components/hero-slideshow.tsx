'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const SLIDES = [
  '/images/PHOTOSHOOT/DSC02264.JPG',
  '/images/PHOTOSHOOT/DSC02279.JPG',
  '/images/PHOTOSHOOT/DSC02299.JPG',
  '/images/GRAND%20FINAL/IMG_9024.JPG',
  '/images/GRAND%20FINAL/IMG_9010.JPG',
]

export function HeroSlideshow({ registrationOpen }: { registrationOpen: boolean }) {
  const [index, setIndex] = useState(0)

  // Berganti otomatis; pengguna dengan "reduce motion" tetap melihat foto pertama saja.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 6000)
    return () => clearInterval(t)
  }, [])

  return (
    <section className="relative isolate overflow-hidden bg-navy md:flex md:min-h-[calc(100svh-72px)] md:items-end">
      {/* HP: foto tampil utuh di atas (rasio 3:2) lalu teks di bawahnya. Desktop: foto jadi latar penuh. */}
      <div className="relative aspect-[3/2] w-full md:absolute md:inset-0 md:aspect-auto">
        {SLIDES.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            className={cn(
              'object-cover object-center transition-opacity duration-[1600ms]',
              i === index ? 'opacity-100' : 'opacity-0',
            )}
          />
        ))}
        <div
          className="absolute inset-0 bg-gradient-to-t from-navy via-navy/10 to-transparent md:via-navy/60 md:to-navy/10"
          aria-hidden
        />
      </div>

      <div className="relative z-10 mx-auto -mt-10 w-full max-w-7xl px-4 pb-14 sm:px-6 md:mt-0 md:pb-16 md:pt-32 lg:px-8 lg:pb-20">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-navy/60 px-4 py-2 backdrop-blur">
          <span className={cn('size-2 rounded-full', registrationOpen ? 'animate-pulse bg-gold' : 'bg-white/60')} />
          <span className="text-xs font-semibold tracking-wide text-gold">
            {registrationOpen ? 'Pendaftaran Dibuka' : 'Pemilihan 2026 · Tahap Karantina'}
          </span>
        </div>
        <h1 className="max-w-3xl font-serif text-5xl font-semibold leading-[1.05] text-white sm:text-6xl lg:text-7xl">
          Nyong &amp; Noni <span className="text-gold">UNIMA</span> 2026
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
          Portal resmi duta mahasiswa Universitas Negeri Manado. Kenali 24 finalis dan dukung favoritmu.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/finalists"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-gold px-8 text-base font-bold text-navy transition-colors hover:bg-accent-light"
          >
            Lihat &amp; Vote Finalis
          </Link>
          <Link
            href="#tahapan"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/40 px-8 text-base font-semibold text-white transition-colors hover:bg-white/10"
          >
            Tahapan Pemilihan
          </Link>
        </div>
      </div>
    </section>
  )
}
