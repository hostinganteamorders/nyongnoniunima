'use client'

import { useMemo, useState } from 'react'
import { FinalistCard } from '@/components/finalist-card'
import { FACULTY_NAMES, FINALISTS_2026, type FinalistGender } from '@/lib/finalists-2026'
import { VOTE_PRICE_IDR } from '@/lib/site-config'
import { cn } from '@/lib/utils'

const GENDERS: { value: 'all' | FinalistGender; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'nyong', label: 'Nyong' },
  { value: 'noni', label: 'Noni' },
]

export default function FinalistsClient() {
  const [gender, setGender] = useState<'all' | FinalistGender>('all')
  const [faculty, setFaculty] = useState('all')

  const faculties = useMemo(() => Array.from(new Set(FINALISTS_2026.map((f) => f.faculty))).sort(), [])
  const list = FINALISTS_2026.filter(
    (f) => (gender === 'all' || f.gender === gender) && (faculty === 'all' || f.faculty === faculty),
  )

  const chip = (active: boolean) =>
    cn(
      'min-h-11 rounded-full border px-5 text-sm font-semibold transition-colors',
      active ? 'border-navy bg-navy text-gold' : 'border-line bg-white text-navy hover:bg-chip',
    )

  return (
    <>
      <section className="gradient-hero relative overflow-hidden py-16 text-white sm:py-24">
        <div className="diamond-pattern absolute inset-0 opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-semibold uppercase tracking-widest text-gold">Pemilihan 2026</span>
          <h1 className="mt-3 text-display-xxl text-white">Finalis Nyong Noni UNIMA</h1>
          <p className="mt-5 max-w-2xl text-body-lg text-white/80">
            24 finalis dari tujuh fakultas. Setiap finalis punya kode QRIS sendiri: Rp
            {VOTE_PRICE_IDR.toLocaleString('id-ID')} = 1 suara.
          </p>
        </div>
      </section>

      <section className="bg-ivory py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter Nyong atau Noni">
              {GENDERS.map((g) => (
                <button key={g.value} type="button" aria-pressed={gender === g.value} onClick={() => setGender(g.value)} className={chip(gender === g.value)}>
                  {g.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter fakultas">
              <button type="button" aria-pressed={faculty === 'all'} onClick={() => setFaculty('all')} className={chip(faculty === 'all')}>
                Semua fakultas
              </button>
              {faculties.map((code) => (
                <button
                  key={code}
                  type="button"
                  title={FACULTY_NAMES[code]}
                  aria-pressed={faculty === code}
                  onClick={() => setFaculty(code)}
                  className={chip(faculty === code)}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          <p className="mb-6 text-sm text-dark-secondary" aria-live="polite">
            Menampilkan {list.length} dari {FINALISTS_2026.length} finalis
          </p>

          {list.length === 0 ? (
            <p className="rounded-2xl border border-line bg-white p-10 text-center text-dark-secondary">
              Tidak ada finalis untuk filter ini.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
              {list.map((f) => (
                <FinalistCard key={f.no} finalist={f} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
