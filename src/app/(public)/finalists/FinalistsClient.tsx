'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { GraduationCap, MapPin, Clock } from 'lucide-react'

interface FinalistItem {
  id: string
  full_name: string
  faculty: string | null
  study_program: string | null
  gender: string | null
  photo_url: string | null
  city: string
  province: string
  profile?: { tahun?: string | number } | null
  created_at?: string
}

interface FinalistsClientProps {
  finalists: FinalistItem[]
}

export default function FinalistsClient({ finalists }: FinalistsClientProps) {
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [genderFilter, setGenderFilter] = useState<string>('all')

  const years = useMemo(() => {
    const set = new Set<string>()
    finalists.forEach((f) => {
      const tahun = f.profile?.tahun
      if (tahun) set.add(String(tahun))
    })
    return Array.from(set).sort((a, b) => Number(b) - Number(a))
  }, [finalists])

  const filtered = useMemo(() => {
    return finalists.filter((f) => {
      if (yearFilter !== 'all') {
        const tahun = String(f.profile?.tahun || '')
        if (tahun !== yearFilter) return false
      }
      if (genderFilter !== 'all') {
        if (f.gender?.toLowerCase() !== genderFilter.toLowerCase()) return false
      }
      return true
    })
  }, [finalists, yearFilter, genderFilter])

  return (
    <div className="bg-white min-h-screen pb-[120px]">
      {/* ─── HERO ─── */}
      <section className="gradient-hero relative flex flex-col items-center justify-center pt-[180px] pb-[96px] px-[20px] text-center">
        <div className="max-w-4xl mx-auto">
          <p className="text-caption text-accent-light uppercase tracking-widest mb-4">Finalis</p>
          <h1 className="text-display-xxl text-white tracking-tighter mb-8 animate-fade-in">
            Para <br />
            <span className="text-accent">Finalis</span>
          </h1>
          <p className="text-subhead text-white/80 max-w-2xl mx-auto">
            Mengenal lebih dekat para finalis Nyong Noni UNIMA {new Date().getFullYear()}
          </p>
        </div>
      </section>

      <section className="py-[96px] bg-light-gray">
        <div className="mx-auto max-w-7xl px-[20px]">
          {/* ─── FILTERS ─── */}
          <div className="flex flex-wrap gap-4 mb-12 justify-center">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="bg-white border border-border rounded-lg px-4 py-2.5 text-body-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-blue/30"
            >
              <option value="all">Semua Tahun</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="bg-white border border-border rounded-lg px-4 py-2.5 text-body-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-blue/30"
            >
              <option value="all">Semua Gender</option>
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="py-20 text-center max-w-xl mx-auto">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-blue/10">
                <Clock className="h-7 w-7 text-primary-blue" />
              </div>
              <h2 className="text-display-md text-dark-text mb-3">Segera Hadir</h2>
              <p className="text-body-lg text-dark-secondary leading-relaxed">
                Para finalis Nyong Noni UNIMA akan segera diumumkan. Pantau terus informasi terbaru dari kami.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((f) => (
                <Link key={f.id} href={`/finalists/${f.id}`} className="group active-scale block">
                  <div className="bg-white rounded-xl border border-border overflow-hidden p-0 h-full flex flex-col interactive-hover shadow-sm">
                    <div className="aspect-[3/4] overflow-hidden bg-light-gray flex items-center justify-center relative">
                      {f.photo_url ? (
                        <img src={f.photo_url} alt={f.full_name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                      ) : (
                        <span className="text-display-md text-dark-secondary font-bold">{f.full_name?.charAt(0)}</span>
                      )}
                      <span className="absolute top-4 right-4 bg-primary-blue text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                        Finalis
                      </span>
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                      <h3 className="text-headline text-dark-text mb-2">{f.full_name}</h3>
                      <div className="space-y-2 mt-auto">
                        {f.faculty && (
                          <div className="flex items-center gap-2 text-body-sm text-dark-secondary">
                            <GraduationCap className="h-4 w-4 shrink-0 text-primary-blue" />
                            <span className="truncate">{f.faculty}</span>
                          </div>
                        )}
                        {f.study_program && (
                          <div className="flex items-center gap-2 text-body-sm text-dark-secondary">
                            <MapPin className="h-4 w-4 shrink-0 text-primary-blue" />
                            <span className="truncate">{f.study_program}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
