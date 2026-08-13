import { Crown, Instagram, GraduationCap, BookOpen } from 'lucide-react'
import { getTitleholders } from '@/server/actions/finalists'
import { TitleholdersFilter } from './titleholders-filter'

const CATEGORY_ORDER: Record<string, number> = {
  'Juara Utama': 1,
  'Wakil I': 2,
  'Wakil II': 3,
  'Harapan I': 4,
  'Harapan II': 5,
  'Berbakat': 10,
  'Favorit': 11,
  'Fotogenik': 12,
  'Duta Lingkungan': 13,
  'Duta Sosial': 14,
  'Duta Budaya': 15,
  'Duta Bahasa': 16,
  'Duta Seni': 17,
  'Persahabatan': 18,
  'Intelegensia': 19,
  'Digital': 20,
  'Other': 99,
}

function renderInitial(name: string) {
  return name?.trim().charAt(0).toUpperCase() || 'N'
}

function TitleholderCard({ item, gender }: { item: any; gender: string }) {
  const isCombined = item.category?.startsWith('Duta') || item.category === 'Berbakat' || item.category === 'Fotogenik' || item.category === 'Persahabatan' || item.category === 'Intelegensia'
  return (
    <div className="rounded-[20px] border border-border bg-white overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      <div className="aspect-[3/4] overflow-hidden bg-light-gray">
        {item.photo_url ? (
          <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-display-xl text-dark-secondary">
            {renderInitial(item.name)}
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gold-dark bg-gold/10 px-2.5 py-1 rounded-full">
            {item.category}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-dark-secondary">
            {isCombined ? 'Nyong Noni' : gender}
          </span>
        </div>
        <h3 className="text-headline text-dark-text mb-1">{item.name}</h3>

        {item.faculty && (
          <p className="flex items-center gap-1.5 text-body-sm text-dark-secondary mb-1">
            <GraduationCap className="h-4 w-4 shrink-0" />
            {item.faculty}
          </p>
        )}
        {item.study_program && (
          <p className="flex items-center gap-1.5 text-body-sm text-dark-secondary mb-3">
            <BookOpen className="h-4 w-4 shrink-0" />
            {item.study_program}
          </p>
        )}

        {item.instagram && (
          <a
            href={`https://instagram.com/${item.instagram.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-body-sm text-primary-blue hover:opacity-80 transition-opacity"
          >
            <Instagram className="h-4 w-4" />
            @{item.instagram}
          </a>
        )}
      </div>
    </div>
  )
}

export default async function TitleholdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string }>
}) {
  const params = await searchParams
  const selectedYear = Number(params.tahun) || undefined
  const allTitleholders = await getTitleholders().catch(() => []) as any[]

  const years = [...new Set(allTitleholders.map((item: any) => item.tahun))].sort((a, b) => b - a)
  const titleholders = selectedYear
    ? allTitleholders.filter((item: any) => item.tahun === selectedYear)
    : allTitleholders

  const individuals = titleholders
    .flatMap((item: any) => {
      const cards: { id: string; name: string; photo_url?: string; instagram?: string; category: string; faculty?: string; study_program?: string; gender: string }[] = []
      if (item.nyong_name) {
        cards.push({
          id: `${item.id}-nyong`,
          name: item.nyong_name,
          photo_url: item.nyong_photo_url,
          instagram: item.nyong_instagram,
          category: item.category,
          faculty: item.faculty,
          study_program: item.study_program,
          gender: 'Nyong',
        })
      }
      if (item.noni_name) {
        cards.push({
          id: `${item.id}-noni`,
          name: item.noni_name,
          photo_url: item.noni_photo_url,
          instagram: item.noni_instagram,
          category: item.category,
          faculty: item.faculty,
          study_program: item.study_program,
          gender: 'Noni',
        })
      }
      return cards
    })
    .sort((a, b) => (CATEGORY_ORDER[a.category] || 99) - (CATEGORY_ORDER[b.category] || 99))

  return (
    <div className="min-h-screen bg-white pb-[120px]">
      <section className="relative flex flex-col items-center justify-center border-b border-border px-[20px] pb-[96px] pt-[180px] text-center">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 text-caption uppercase tracking-widest text-dark-secondary">Nyong &amp; Noni</p>
          <div className="mb-8 flex items-center justify-center gap-4 animate-fade-in">
            <Crown className="h-10 w-10 text-gold" />
            <h1 className="text-display-xl tracking-tighter text-dark-text">Titleholders</h1>
            <Crown className="h-10 w-10 text-gold" />
          </div>
          <p className="mx-auto max-w-2xl text-subhead text-dark-secondary">
            Para pemegang gelar Nyong dan Noni UNIMA. Setiap gelar adalah bentuk apresiasi bagi para duta yang mewakili daerahnya masing-masing.
          </p>
        </div>
      </section>

      <section className="py-[96px]">
        <div className="mx-auto max-w-7xl px-[20px]">
          <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-caption uppercase tracking-widest text-dark-secondary">Arsip</p>
              <h2 className="mt-2 text-display-lg text-dark-text">Daftar Titleholders</h2>
            </div>
            <TitleholdersFilter years={years} selectedYear={selectedYear} />
          </div>

          {individuals.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-body-lg text-dark-secondary">Belum ada data titleholders</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {individuals.map((item) => (
                <TitleholderCard key={item.id} item={item} gender={item.gender} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
