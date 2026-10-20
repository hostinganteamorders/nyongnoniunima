'use client'

import { Search, Filter } from 'lucide-react'

export function HallOfFameFilter({
  tahun,
  category,
  years,
  categories,
}: {
  tahun?: string
  category?: string
  years: number[]
  categories: string[]
}) {
  return (
    <div className="flex flex-wrap gap-4 mb-8 justify-center">
      <div className="relative w-44">
        <form>
          <select
            name="tahun"
            defaultValue={tahun || ''}
            onChange={(e) => {
              const url = new URL(window.location.href)
              url.searchParams.set('tahun', e.target.value)
              window.location.href = url.toString()
            }}
            className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-body-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-blue/20 appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 0.75rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.25rem',
            }}
          >
            <option value="">Semua Tahun</option>
            {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </form>
      </div>
      {categories.length > 0 && (
        <div className="relative w-44">
          <form>
            <select
              name="category"
              defaultValue={category || ''}
              onChange={(e) => {
                const url = new URL(window.location.href)
                url.searchParams.set('category', e.target.value)
                window.location.href = url.toString()
              }}
              className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-body-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-blue/20 appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.75rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.25rem',
              }}
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </form>
        </div>
      )}
    </div>
  )
}
