'use client'

import Image from 'next/image'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Instagram } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GENDER_TITLES, isCombinedTitle, shortGelar, titleLabel } from '@/lib/titleholders'

interface Titleholder {
  id: string
  title: string
  name: string
  faculty?: string | null
  study_program?: string | null
  photo_url?: string | null
  instagram?: string | null
}

function chipLabel(title: string) {
  if (title === 'Nyong UNIMA' || title === 'Noni UNIMA') return title.split(' ')[0]
  return shortGelar(title)
}

function Panel({
  label,
  items,
  align,
}: {
  label: string
  items: Titleholder[]
  align: 'left' | 'right'
}) {
  const [i, setI] = useState(0)
  if (items.length === 0) return null
  const cur = items[i]
  const go = (d: number) => setI((i + d + items.length) % items.length)
  // Panel kanan (Noni): chip tersusun dari kanan ke kiri, jadi arah panah dibalik
  // agar panah kiri bergerak ke kiri dan panah kanan ke kanan.
  const dir = align === 'right' ? -1 : 1

  return (
    <div className="flex flex-col">
      <p
        className={cn(
          'mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-gold-deep',
          align === 'right' && 'lg:text-right',
        )}
      >
        {label}
      </p>

      <div className="relative overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
        <div className="relative aspect-[4/5] bg-chip">
          {cur.photo_url ? (
            <Image
              key={cur.id}
              src={cur.photo_url}
              alt={cur.name}
              fill
              sizes="(min-width:1024px) 40vw, 100vw"
              className="object-cover object-top"
            />
          ) : (
            <div className="flex h-full items-center justify-center font-serif text-7xl text-navy/20">
              {cur.name.charAt(0)}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy via-navy/80 to-transparent p-5 pt-20 text-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">{cur.title}</p>
            <h3 className="mt-1 font-serif text-2xl font-semibold leading-tight">{cur.name}</h3>
            {(cur.faculty || cur.study_program) && (
              <p className="mt-1 text-sm text-white/80">
                {[cur.faculty, cur.study_program].filter(Boolean).join(' · ')}
              </p>
            )}
            {cur.instagram && (
              <a
                href={`https://instagram.com/${cur.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-sm text-gold hover:underline"
              >
                <Instagram className="size-4" aria-hidden /> @{cur.instagram.replace('@', '')}
              </a>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => go(-dir)}
          aria-label="Geser ke kiri"
          className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-navy shadow transition-colors hover:bg-white"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => go(dir)}
          aria-label="Geser ke kanan"
          className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-navy shadow transition-colors hover:bg-white"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div
        className={cn(
          'mt-4 flex flex-wrap gap-2',
          align === 'right' && 'flex-row-reverse',
        )}
        role="group"
        aria-label={`Pilih gelar ${label}`}
      >
        {items.map((it, idx) => (
          <button
            key={it.id}
            type="button"
            onClick={() => setI(idx)}
            aria-pressed={idx === i}
            className={cn(
              'min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors',
              idx === i ? 'border-navy bg-navy text-gold' : 'border-line bg-chip text-navy hover:bg-line',
            )}
          >
            {chipLabel(it.title)}
          </button>
        ))}
      </div>
    </div>
  )
}

function DutaCard({ item }: { item: Titleholder }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="relative aspect-[3/4] bg-chip">
        {item.photo_url ? (
          <Image
            src={item.photo_url}
            alt={item.name}
            fill
            sizes="(min-width:1024px) 20vw, (min-width:640px) 33vw, 50vw"
            className="object-cover object-top"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-serif text-5xl text-navy/20">
            {item.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gold-deep">
          {titleLabel(item.title).replace(/ Nyong Noni UNIMA.*$/i, '')}
        </p>
        <h3 className="mt-1 font-serif text-base font-semibold leading-tight text-navy">{item.name}</h3>
        {(item.faculty || item.study_program) && (
          <p className="mt-1 text-xs text-dark-secondary">
            {[item.faculty, item.study_program].filter(Boolean).join(' · ')}
          </p>
        )}
        {item.instagram && (
          <a
            href={`https://instagram.com/${item.instagram.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex min-h-8 items-center gap-1 text-xs text-gold-deep hover:underline"
          >
            <Instagram className="size-3.5" aria-hidden /> @{item.instagram.replace('@', '')}
          </a>
        )}
      </div>
    </article>
  )
}

export function TitleholdersShowcase({ titleholders }: { titleholders: Titleholder[] }) {
  const pick = (titles: readonly string[]) =>
    titles.map((t) => titleholders.find((th) => th.title === t)).filter(Boolean) as Titleholder[]
  const nyong = pick(GENDER_TITLES.nyong)
  const noni = pick(GENDER_TITLES.noni)
  const duta = titleholders.filter((th) => isCombinedTitle(th.title))

  return (
    <div className="space-y-16">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <Panel label="Nyong" items={nyong} align="left" />
        <Panel label="Noni" items={noni} align="right" />
      </div>

      {duta.length > 0 && (
        <div>
          <div className="mb-6 flex items-center gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-deep">Nyong Noni · Duta &amp; Gelar Khusus</p>
            <div className="h-px flex-1 bg-line" />
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {duta.map((it) => (
              <DutaCard key={it.id} item={it} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
