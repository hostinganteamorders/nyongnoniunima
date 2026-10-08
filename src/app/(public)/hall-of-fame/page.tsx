import { getHallOfFame } from '@/server/actions/finalists'
import { Crown, Award } from 'lucide-react'
import { HallOfFameFilter } from './filter'

const CATEGORY_LABELS: Record<string, string> = {
  'Nyong Berbakat': 'Nyong Berbakat',
  'Noni Berbakat': 'Noni Berbakat',
  'Nyong Favorit': 'Nyong Favorit',
  'Noni Favorit': 'Noni Favorit',
  'Best Leadership': 'Best Leadership',
  'Best Public Speaking': 'Best Public Speaking',
  'Best Social Project': 'Best Social Project',
  'Best Academic Achievement': 'Best Academic Achievement',
}

export default async function HallOfFamePage({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string; kota?: string; category?: string }>
}) {
  const params = await searchParams
  const entries = await getHallOfFame().catch(() => []) as any[]

  const years = [...new Set(entries.map((e: any) => e.tahun))].sort((a, b) => b - a)
  const cities = [...new Set(entries.map((e: any) => e.kabupaten_kota))].sort()
  const categories = [...new Set(entries.map((e: any) => e.category).filter(Boolean))].sort() as string[]

  const filtered = entries.filter((e: any) => {
    if (params.tahun && e.tahun !== Number(params.tahun)) return false
    if (params.kota && e.kabupaten_kota !== params.kota) return false
    if (params.category && e.category !== params.category) return false
    return true
  })

  return (
    <div className="bg-white min-h-screen pb-[120px]">
      <section className="relative flex flex-col items-center justify-center pt-[180px] pb-[96px] px-[20px] text-center border-b border-border">
        <div className="max-w-4xl mx-auto">
          <p className="text-caption text-dark-secondary uppercase tracking-widest mb-4">Pemenang</p>
          <div className="flex items-center justify-center gap-4 mb-8 animate-fade-in">
            <Crown className="h-10 w-10 text-accent" />
            <h1 className="text-display-xl text-dark-text tracking-tighter">
              Hall of Fame
            </h1>
            <Crown className="h-10 w-10 text-accent" />
          </div>
          <p className="text-subhead text-dark-secondary max-w-2xl mx-auto">
            Penghargaan khusus Nyong Noni UNIMA — para penerima penghargaan berbakat, favorit, dan prestasi terbaik
          </p>
        </div>
      </section>

      <section className="py-[96px]">
        <div className="mx-auto max-w-7xl px-[20px]">
          <div className="mb-12">
            <HallOfFameFilter
              tahun={params.tahun}
              kota={params.kota}
              category={params.category}
              years={years}
              cities={cities}
              categories={categories}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-body-lg text-dark-secondary">Belum ada data Hall of Fame</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((entry: any) => (
                <div
                  key={entry.id}
                  className="product-mockup-tile flex flex-col p-6 interactive-hover active-scale"
                >
                  {/* Category badge */}
                  <div className="mb-4 flex items-center gap-2">
                    <Award className="h-4 w-4 text-accent" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-accent-dark bg-accent/10 px-3 py-1 rounded-full">
                      {entry.category || 'Hall of Fame'}
                    </span>
                  </div>

                  {/* Year */}
                  <span className="text-caption text-dark-secondary mb-3">{entry.tahun}</span>

                  {/* Pair photos */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="text-center">
                      <div className="aspect-square rounded-xl overflow-hidden bg-light-gray border border-border mb-2">
                        {entry.nyong_photo_url ? (
                          <img src={entry.nyong_photo_url} alt={entry.nyong_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-display-md text-dark-secondary">
                            {entry.nyong_name?.charAt(0) || 'N'}
                          </div>
                        )}
                      </div>
                      <p className="text-body-sm font-semibold text-dark-text">{entry.nyong_name}</p>
                      <p className="text-[11px] text-dark-secondary mt-0.5">{entry.kabupaten_kota}</p>
                    </div>
                    <div className="text-center">
                      <div className="aspect-square rounded-xl overflow-hidden bg-light-gray border border-border mb-2">
                        {entry.noni_photo_url ? (
                          <img src={entry.noni_photo_url} alt={entry.noni_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-display-md text-dark-secondary">
                            {entry.noni_name?.charAt(0) || 'N'}
                          </div>
                        )}
                      </div>
                      <p className="text-body-sm font-semibold text-dark-text">{entry.noni_name}</p>
                      <p className="text-[11px] text-dark-secondary mt-0.5">{entry.kabupaten_kota}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
