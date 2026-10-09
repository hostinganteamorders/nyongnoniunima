import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Countdown } from '@/components/countdown'
import { FinalistsCarousel } from '@/components/finalists-carousel'
import { TitleholdersGrid } from '@/components/titleholders-grid'
import { TahapanPemilihan } from '@/components/tahapan'
import { getPublicFinalists } from '@/server/actions/finalists'
import { getPublicNews, getPublicEvents } from '@/server/actions/content'
import { getCurrentTitleholders, getFaculties } from '@/server/actions/unima'
import { ArrowRight, ChevronRight, Clock } from 'lucide-react'

export default async function HomePage() {
  const [finalists, currentTitleholders, news, events, faculties] = await Promise.all([
    getPublicFinalists().catch(() => []),
    getCurrentTitleholders().catch(() => []),
    getPublicNews().catch(() => []),
    getPublicEvents().catch(() => []),
    getFaculties().catch(() => []),
  ])

  return (
    <>
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden gradient-hero min-h-[90vh] flex items-center">
        <div className="absolute inset-0 bg-[url('/hero-pattern.svg')] opacity-10" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-accent/5 to-transparent" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
            <Image
              src="/images/logo-nyong-noni-unima.png"
              alt="Logo Nyong Noni UNIMA"
              width={720}
              height={796}
              className="w-40 sm:w-52 lg:w-60 h-auto mb-8 brightness-0 invert drop-shadow-lg"
              priority
            />
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-pill px-4 py-2 mb-6">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span className="text-accent text-sm font-semibold tracking-wide">Pendaftaran Dibuka</span>
            </div>
            <h1 className="text-display-xxl text-white font-bold leading-tight mb-6">
              Nyong Noni UNIMA
              <br />
              <span className="text-accent">Portal Resmi</span>
            </h1>
            <p className="text-body-lg text-white/80 max-w-2xl mb-10 leading-relaxed">
              Platform Resmi Nyong &amp; Noni Universitas Negeri Manado — Memberdayakan Duta Mahasiswa dalam Kepemimpinan, Budaya, Pariwisata, Pelestarian Budaya, dan Keunggulan Akademik.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button variant="primary" size="lg" className="bg-accent text-dark-text hover:bg-accent-light border-none h-14 px-8 text-body font-bold">
                  Daftar Sekarang
                </Button>
              </Link>
              <Link href="/finalists">
                <Button variant="secondary" size="lg" className="bg-white/10 text-white hover:bg-white/20 border border-white/30 h-14 px-8 text-body font-semibold">
                  Segera Hadir
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ─── CURRENT TITLEHOLDERS ─── */}
      {currentTitleholders.length > 0 && (
        <section className="py-section bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <span className="text-caption text-primary-blue font-semibold tracking-widest">
                NYONG & NONI UNIMA 2025
              </span>
              <h2 className="text-display-xl text-dark-text mt-3">Pemegang Gelar Terkini</h2>
              <div className="w-20 h-1 bg-accent mx-auto mt-4" />
            </div>

            <TitleholdersGrid titleholders={currentTitleholders} />

            <div className="text-center mt-10">
              <Link href="/current-titleholders">
                <Button variant="outline" className="border-primary-blue text-primary-blue hover:bg-primary-blue hover:text-white h-12 px-8">
                  Lihat Semua <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ─── COUNTDOWN ─── */}
      <section className="py-section bg-primary-blue">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-caption text-accent uppercase tracking-widest">Hitung Mundur Grand Final</span>
          <div className="mt-6">
            <Countdown targetDate="2026-11-26T19:00:00" />
          </div>
        </div>
      </section>

      {/* ─── TAHAPAN PEMILIHAN ─── */}
      <TahapanPemilihan />

      {/* ─── SPOTLIGHT ─── */}
      <section className="py-section bg-light-gray">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-caption text-primary-blue font-semibold tracking-widest">JELAJAHI</span>
            <h2 className="text-display-xl text-dark-text mt-3">Sorotan</h2>
            <div className="w-20 h-1 bg-accent mx-auto mt-4" />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="group block relative overflow-hidden rounded-xxl bg-primary-blue p-8 min-h-[280px] flex flex-col justify-end transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <span className="inline-flex items-center gap-1.5 text-accent text-xs font-semibold uppercase tracking-widest mb-3 relative">
                <Clock className="h-3.5 w-3.5" /> Segera Hadir
              </span>
              <h3 className="text-display-md text-white mb-2 relative">Finalis</h3>
              <p className="text-body text-white/70 relative">Para finalis Nyong Noni UNIMA akan segera diumumkan.</p>
            </div>
            <Link href="/news" className="group block relative overflow-hidden rounded-xxl bg-dark-text p-8 min-h-[280px] flex flex-col justify-end transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-blue/20 rounded-full -translate-y-1/2 translate-x-1/2" />
              <h3 className="text-display-md text-white mb-2 relative">Berita Terkini</h3>
              <p className="text-body text-white/70 relative">Ikuti berita dan pengumuman terbaru dari Nyong Noni UNIMA.</p>
              <span className="inline-flex items-center gap-1 text-accent text-sm font-semibold mt-4 relative group-hover:gap-2 transition-all">
                Baca Berita <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
            <Link href="/events" className="group block relative overflow-hidden rounded-xxl bg-primary-blue-dark p-8 min-h-[280px] flex flex-col justify-end transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <h3 className="text-display-md text-white mb-2 relative">Acara Mendatang</h3>
              <p className="text-body text-white/70 relative">Lihat jadwal acara dan kegiatan Nyong Noni UNIMA mendatang.</p>
              <span className="inline-flex items-center gap-1 text-accent text-sm font-semibold mt-4 relative group-hover:gap-2 transition-all">
                Lihat Acara <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FINALISTS PREVIEW ─── */}
      {finalists.length > 0 && (
        <section className="py-section bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
              <div>
                <span className="text-caption text-primary-blue font-semibold tracking-widest">FINALIS 2026</span>
                <h2 className="text-display-xl text-dark-text mt-2">Kenali Mereka</h2>
              </div>
              <Link href="/finalists">
                <Button variant="outline" className="border-primary-blue text-primary-blue hover:bg-primary-blue hover:text-white">
                  Lihat Semua <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <FinalistsCarousel items={finalists} />
          </div>
        </section>
      )}

      {/* ─── ABOUT ─── */}
      <section className="py-section bg-light-gray">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-caption text-primary-blue font-semibold tracking-widest">TENTANG</span>
              <h2 className="text-display-xl text-dark-text mt-3 mb-6">Nyong Noni UNIMA</h2>
              <div className="w-20 h-1 bg-accent mb-6" />
              <p className="text-body-lg text-dark-secondary leading-relaxed mb-6">
                Nyong Noni UNIMA adalah organisasi duta mahasiswa resmi Universitas Negeri Manado.
                Kami mengembangkan mahasiswa dalam kepemimpinan, budaya, promosi pariwisata, public speaking, dampak sosial, dan keunggulan akademik.
              </p>
              <p className="text-body text-dark-secondary mb-8">
                Melalui berbagai program dan kegiatan, kami memberdayakan mahasiswa untuk menjadi duta teladan
                yang mempromosikan nama Universitas Negeri Manado beserta kekayaan budaya dan potensi pariwisata daerah.
              </p>
              <Link href="/about">
                <Button variant="primary" className="bg-primary-blue text-white hover:bg-primary-blue-dark h-12 px-8">
                  Selengkapnya <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Kepemimpinan', desc: 'Program', icon: '👥' },
                { label: 'Budaya', desc: 'Pelestarian', icon: '🏛️' },
                { label: 'Pariwisata', desc: 'Promosi', icon: '🌴' },
                { label: 'Sosial', desc: 'Dampak', icon: '🤝' },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-xl border border-border p-6 text-center hover:shadow-md transition-all">
                  <span className="text-3xl mb-3 block">{item.icon}</span>
                  <h4 className="text-body-sm font-bold text-dark-text">{item.label}</h4>
                  <p className="text-body-sm text-dark-secondary">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FACULTIES ─── */}
      {faculties.length > 0 && (
        <section className="py-section bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <span className="text-caption text-primary-blue font-semibold tracking-widest">UNIVERSITAS NEGERI MANADO</span>
              <h2 className="text-display-xl text-dark-text mt-3">Fakultas Kami</h2>
              <div className="w-20 h-1 bg-accent mx-auto mt-4" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {faculties.map((f: any) => (
                <div key={f.id} className="bg-light-gray rounded-xl border border-border p-5 text-center hover:border-primary-blue/30 hover:shadow-sm transition-all">
                  <h4 className="text-body-sm font-bold text-dark-text">{f.code}</h4>
                  <p className="text-body-sm text-dark-secondary mt-1">{f.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── ACTIVITIES ─── */}
      <section className="py-section bg-primary-blue">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-caption text-accent font-semibold tracking-widest">KEGIATAN KAMPUS</span>
            <h2 className="text-display-xl text-white mt-3">Program &amp; Inisiatif</h2>
            <div className="w-20 h-1 bg-accent mx-auto mt-4" />
          </div>
          <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-5">
            {[
              { title: 'Kegiatan Mahasiswa', icon: '🎓' },
              { title: 'Pengabdian Masyarakat', icon: '💚' },
              { title: 'Program Kepemimpinan', icon: '⭐' },
              { title: 'Program Budaya', icon: '🎭' },
              { title: 'Promosi Pariwisata', icon: '🗺️' },
            ].map((item) => (
              <div key={item.title} className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6 text-center hover:bg-white/20 transition-all">
                <span className="text-3xl mb-3 block">{item.icon}</span>
                <h4 className="text-body-sm font-semibold text-white">{item.title}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LATEST NEWS ─── */}
      {news.length > 0 && (
        <section className="py-section bg-light-gray">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
              <div>
                <span className="text-caption text-primary-blue font-semibold tracking-widest">BERITA TERKINI</span>
                <h2 className="text-display-xl text-dark-text mt-2">Berita &amp; Pembaruan</h2>
              </div>
              <Link href="/news">
                <Button variant="outline" className="border-primary-blue text-primary-blue hover:bg-primary-blue hover:text-white">
                  Semua Berita <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {news.slice(0, 3).map((item: any) => (
                <Link key={item.id} href={`/news/${item.slug}`} className="group bg-white rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all">
                  <div className="aspect-[16/9] bg-light-gray relative overflow-hidden">
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary-blue/20 text-display-md font-bold">NN</div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-body-sm font-bold text-dark-text group-hover:text-primary-blue transition-colors line-clamp-2">{item.title}</h3>
                    <p className="text-body-sm text-dark-secondary mt-2 line-clamp-2">{item.excerpt}</p>
                    <span className="inline-flex items-center gap-1 text-primary-blue text-sm font-semibold mt-3 group-hover:gap-2 transition-all">
                      Baca Selengkapnya <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── CTA ─── */}
      <section className="py-section bg-gradient-to-r from-primary-blue to-primary-blue-dark text-center">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-display-xl text-white mb-4">Jadilah Bagian Sejarah</h2>
          <p className="text-body-lg text-white/80 mb-8 max-w-xl mx-auto">
            Daftar sekarang dan jadilah duta mahasiswa berikutnya Universitas Negeri Manado. Wakili fakultasmu dan tunjukkan bakatmu.
          </p>
          <Link href="/register">
            <Button variant="primary" size="lg" className="bg-accent text-dark-text hover:bg-accent-light border-none h-14 px-10 text-body font-bold">
              Daftar Sekarang
            </Button>
          </Link>
        </div>
      </section>
    </>
  )
}
