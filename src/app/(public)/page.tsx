import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { HeroSlideshow } from '@/components/hero-slideshow'
import { IntroSplash } from '@/components/intro-splash'
import { TitleholdersShowcase } from '@/components/titleholders-showcase'
import { TahapanPemilihan } from '@/components/tahapan'
import { FinalistCard } from '@/components/finalist-card'
import { Countdown } from '@/components/countdown'
import { FINALISTS_2026 } from '@/lib/finalists-2026'
import { SHOW_SCHEDULE_DATES } from '@/lib/site-config'
import { getPublicNews } from '@/server/actions/content'
import { getCurrentTitleholders, getSponsors, isRegistrationOpen } from '@/server/actions/unima'

const GALLERY = [
  { src: '/images/GRAND%20FINAL/IMG_9010.JPG', className: 'col-span-2 row-span-2' },
  { src: '/images/PRANATAL/IMG_8309.JPG', className: '' },
  { src: '/images/GRAND%20FINAL/IMG_9075.JPG', className: '' },
  { src: '/images/PHOTOSHOOT/DSC03295.JPG', className: '' },
  { src: '/images/PRANATAL/IMG_8503.JPG', className: '' },
  { src: '/images/GRAND%20FINAL/IMG_9116.JPG', className: 'col-span-2' },
]

function SectionHead({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string
  title: string
  action?: { href: string; label: string }
}) {
  return (
    <div className="mb-10 flex flex-col justify-between gap-5 md:mb-14 md:flex-row md:items-end">
      <div>
        <span className="text-xs font-semibold uppercase tracking-widest text-gold-deep">{eyebrow}</span>
        <h2 className="mt-3 text-display-xl text-navy">{title}</h2>
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-navy/25 px-6 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white md:self-auto"
        >
          {action.label} <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  )
}

export default async function HomePage() {
  const [currentTitleholders, news, sponsors, registrationOpen] = await Promise.all([
    getCurrentTitleholders().catch(() => []),
    getPublicNews().catch(() => []),
    getSponsors().catch(() => []),
    isRegistrationOpen().catch(() => false),
  ])

  return (
    <>
      <IntroSplash />
      <HeroSlideshow registrationOpen={registrationOpen} />

      {/* ─── FINALIS 2026 ─── */}
      <section className="bg-ivory py-section">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHead eyebrow="Finalis 2026" title="Kenali & Dukung Finalis" action={{ href: '/finalists', label: 'Filter & cari finalis' }} />
          <p className="-mt-6 mb-10 max-w-2xl text-body-lg text-dark-secondary md:-mt-8">
            Setiap finalis punya kode QRIS sendiri. Rp2.000 = 1 suara.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {FINALISTS_2026.map((f) => (
              <FinalistCard key={f.no} finalist={f} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── COUNTDOWN (disembunyikan sampai jadwal final) ─── */}
      {SHOW_SCHEDULE_DATES && (
        <section className="bg-navy py-section">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <span className="text-xs font-semibold uppercase tracking-widest text-gold">Hitung Mundur Grand Final</span>
            <div className="mt-6">
              <Countdown targetDate="2026-11-26T19:00:00" />
            </div>
          </div>
        </section>
      )}

      {/* ─── TAHAPAN ─── */}
      <TahapanPemilihan />

      {/* ─── TITLEHOLDERS ─── */}
      {currentTitleholders.length > 0 && (
        <section className="bg-ivory py-section">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHead
              eyebrow="Nyong & Noni UNIMA 2025"
              title="Pemegang Gelar Terkini"
              action={{ href: '/current-titleholders', label: 'Lihat semua' }}
            />
            <TitleholdersShowcase titleholders={currentTitleholders as any[]} />
          </div>
        </section>
      )}

      {/* ─── TENTANG ─── */}
      <section className="bg-navy py-section text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-gold">Tentang</span>
            <h2 className="mt-3 text-display-xl text-white">Nyong Noni UNIMA</h2>
            <p className="mt-6 text-body-lg leading-relaxed text-white/80">
              Organisasi duta mahasiswa resmi Universitas Negeri Manado yang membina mahasiswa dalam
              kepemimpinan, budaya, promosi pariwisata, public speaking, dampak sosial, dan prestasi akademik.
            </p>
            <Link
              href="/about"
              className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-gold px-8 text-base font-bold text-navy transition-colors hover:bg-accent-light"
            >
              Selengkapnya <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <dl className="grid grid-cols-2 gap-4">
            {[
              ['Kepemimpinan', 'Program pembinaan'],
              ['Budaya', 'Pelestarian'],
              ['Pariwisata', 'Promosi daerah'],
              ['Sosial', 'Dampak nyata'],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-white/15 bg-white/5 p-5">
                <dt className="font-serif text-lg font-semibold text-gold">{t}</dt>
                <dd className="mt-1 text-sm text-white/70">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ─── GALERI ─── */}
      <section className="bg-white py-section">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHead eyebrow="Galeri" title="Momen Pilihan" action={{ href: '/gallery', label: 'Buka galeri' }} />
          <div className="grid auto-rows-[150px] grid-cols-2 gap-3 sm:auto-rows-[200px] md:grid-cols-4 md:gap-4">
            {GALLERY.map((g) => (
              <Link
                key={g.src}
                href="/gallery"
                aria-label="Buka galeri"
                className={`group relative overflow-hidden rounded-2xl bg-chip ${g.className}`}
              >
                <Image
                  src={g.src}
                  alt=""
                  fill
                  sizes="(min-width:768px) 25vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BERITA ─── */}
      {news.length > 0 && (
        <section className="bg-ivory py-section">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHead eyebrow="Berita Terkini" title="Berita & Pembaruan" action={{ href: '/news', label: 'Semua berita' }} />
            <div className="grid gap-6 md:grid-cols-3">
              {news.slice(0, 3).map((item: any) => (
                <Link
                  key={item.id}
                  href={`/news/${item.slug}`}
                  className="group overflow-hidden rounded-3xl border border-line bg-white transition-shadow hover:shadow-lg"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-chip">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt=""
                        fill
                        sizes="(min-width:768px) 33vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center font-serif text-4xl text-navy/20">NN</div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="line-clamp-2 font-serif text-lg font-semibold text-navy">{item.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-dark-secondary">{item.excerpt}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-gold-deep transition-all group-hover:gap-2">
                      Baca selengkapnya <ArrowRight className="size-3.5" aria-hidden />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── SPONSOR ─── */}
      {sponsors.length > 0 && (
        <section className="border-t border-line bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="mb-10 text-center text-xs font-semibold uppercase tracking-widest text-dark-secondary">
              Kolaborasi &amp; Sponsor
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-8">
              {sponsors.map((sponsor: any) => {
                const logo = sponsor.logo_url ? (
                  <Image
                    src={sponsor.logo_url}
                    alt={`Logo ${sponsor.name}`}
                    width={240}
                    height={72}
                    className="h-11 w-auto object-contain opacity-70 grayscale transition-all duration-300 group-hover:opacity-100 group-hover:grayscale-0"
                  />
                ) : (
                  <span className="font-bold text-dark-secondary transition-colors group-hover:text-navy">{sponsor.name}</span>
                )
                return sponsor.website ? (
                  <a key={sponsor.id} href={sponsor.website} target="_blank" rel="noopener noreferrer" className="group" aria-label={sponsor.name}>
                    {logo}
                  </a>
                ) : (
                  <div key={sponsor.id} className="group">
                    {logo}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── CTA ─── */}
      <section className="bg-navy py-section text-center">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-display-xl text-white">Dukung Finalis Favoritmu</h2>
          <p className="mx-auto mt-4 max-w-xl text-body-lg text-white/80">
            Pilih dari 24 finalis Nyong Noni UNIMA 2026 dan kirim dukunganmu lewat QRIS.
          </p>
          <Link
            href="/finalists"
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-gold px-10 text-base font-bold text-navy transition-colors hover:bg-accent-light"
          >
            Lihat Finalis
          </Link>
        </div>
      </section>
    </>
  )
}
