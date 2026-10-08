'use client'

import { useState, useMemo } from 'react'
import { Calendar, ArrowRight, Search, Newspaper } from 'lucide-react'

const CATEGORIES = [
  'Semua',
  'Campus News',
  'Competition',
  'Social Activities',
  'Achievements',
  'Announcements',
] as const

export function NewsClient({ news }: { news: any[] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('Semua')

  const filtered = useMemo(() => {
    return news.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory =
        activeCategory === 'Semua' ||
        item.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [news, searchQuery, activeCategory])

  return (
    <>
      {/* Search & Filter */}
      <div className="mb-12 space-y-6">
        {/* Search */}
        <div className="relative mx-auto max-w-md">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-dark-secondary" />
          <input
            type="text"
            placeholder="Cari berita..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-white py-3 pl-12 pr-4 text-body text-dark-text placeholder:text-dark-secondary focus:outline-none focus:ring-2 focus:ring-primary-blue/20 transition-all"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                activeCategory === cat
                  ? 'bg-primary-blue text-white shadow-md'
                  : 'bg-white text-dark-secondary border border-border hover:bg-light-gray hover:text-dark-text'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="mb-6 text-body-sm text-dark-secondary">
        {filtered.length} berita ditemukan
      </p>

      {/* News Grid */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center max-w-lg mx-auto">
          <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-border">
            <Newspaper className="h-8 w-8 text-dark-secondary" />
          </div>
          <h2 className="text-display-md text-dark-text mb-4">Berita Tidak Ditemukan</h2>
          <p className="text-body-lg text-dark-secondary leading-relaxed">
            Tidak ada berita yang sesuai dengan pencarian Anda. Coba kata kunci lain.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item: any) => {
            const dateStr = item.published_at || item.created_at
            const formattedDate = dateStr
              ? new Date(dateStr).toLocaleDateString('id-ID', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : ''

            return (
              <div key={item.id} className="product-mockup-tile cursor-pointer interactive-hover active-scale flex flex-col overflow-hidden">
                {/* Image */}
                {item.image_url ? (
                  <div className="aspect-[16/9] overflow-hidden bg-light-gray">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/9] flex items-center justify-center bg-gradient-to-br from-primary-blue/5 to-accent/5">
                    <Newspaper className="h-12 w-12 text-primary-blue/20" />
                  </div>
                )}

                <div className="flex flex-1 flex-col p-6">
                  {/* Category & Date */}
                  <div className="mb-3 flex items-center gap-3">
                    {item.category && (
                      <span className="rounded-full bg-primary-blue/10 px-3 py-0.5 text-[11px] font-semibold text-primary-blue">
                        {item.category}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-caption text-dark-secondary">
                      <Calendar className="h-3.5 w-3.5" />
                      {formattedDate}
                    </span>
                  </div>

                  <h3 className="text-headline text-dark-text mb-3 line-clamp-2 group-hover:text-primary-blue transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-body-sm text-dark-secondary line-clamp-3 leading-relaxed mb-6 flex-1">
                    {item.excerpt}
                  </p>

                  <div className="mt-auto flex items-center gap-2 text-sm font-medium text-primary-blue transition-all border-t border-border pt-4">
                    Baca selengkapnya <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
