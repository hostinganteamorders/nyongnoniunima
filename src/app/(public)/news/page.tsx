import { Calendar } from 'lucide-react'
import { getPublicNews } from '@/server/actions/content'
import { NewsClient } from './news-client'

export default async function NewsPage() {
  const news = await getPublicNews().catch(() => [])

  return (
    <div className="bg-white min-h-screen pb-[120px]">
      {/* ─── HERO ─── */}
      <section className="relative flex flex-col items-center justify-center pt-[180px] pb-[96px] px-[20px] text-center border-b border-border">
        <div className="max-w-4xl mx-auto">
          <p className="text-caption text-dark-secondary uppercase tracking-widest mb-4">Berita</p>
          <h1 className="text-display-xl text-dark-text tracking-tighter mb-8 animate-fade-in">
            Informasi & <br />
            <span className="text-primary-blue">Berita</span>
          </h1>
          <p className="text-subhead text-dark-secondary max-w-2xl mx-auto">
            Informasi dan perkembangan terbaru Nyong Noni UNIMA
          </p>
        </div>
      </section>

      {/* ─── NEWS LIST ─── */}
      <section className="py-[96px]">
        <div className="mx-auto max-w-7xl px-[20px]">
          {news.length === 0 ? (
            <div className="py-20 text-center max-w-lg mx-auto">
              <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-border">
                <Calendar className="h-8 w-8 text-dark-secondary" />
              </div>
              <h2 className="text-display-md text-dark-text mb-4">Belum Ada Berita</h2>
              <p className="text-body-lg text-dark-secondary leading-relaxed">
                Pantau terus halaman ini untuk mendapatkan informasi terbaru seputar Nyong Noni UNIMA.
              </p>
            </div>
          ) : (
            <NewsClient news={news} />
          )}
        </div>
      </section>
    </div>
  )
}
