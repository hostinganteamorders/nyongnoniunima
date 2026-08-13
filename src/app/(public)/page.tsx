import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Countdown } from '@/components/countdown'
import { FinalistsCarousel } from '@/components/finalists-carousel'
import { TitleholdersGrid } from '@/components/titleholders-grid'
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
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-gold/5 to-transparent" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="max-w-3xl">
            <Image
              src="/images/logo-nyong-noni-unima.png"
              alt="Logo Nyong Noni UNIMA"
              width={120}
              height={120}
              className="w-28 h-28 sm:w-32 sm:h-32 object-contain mb-8"
              priority
            />
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-pill px-4 py-2 mb-6">
              <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
              <span className="text-gold text-sm font-semibold tracking-wide">Registration Open Now</span>
            </div>
            <h1 className="text-display-xxl text-white font-bold leading-tight mb-6">
              Nyong Noni UNIMA
              <br />
              <span className="text-gold">Official Portal</span>
            </h1>
            <p className="text-body-lg text-white/80 max-w-2xl mb-10 leading-relaxed">
              The Official Platform of Nyong &amp; Noni Universitas Negeri Manado — Empowering Student Ambassadors in Leadership, Culture, Tourism, Culture Preservation, and Academic Excellence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/register">
                <Button variant="primary" size="lg" className="bg-gold text-dark-text hover:bg-gold-light border-none h-14 px-8 text-body font-bold">
                  Register Now
                </Button>
              </Link>
              <Link href="/finalists">
                <Button variant="secondary" size="lg" className="bg-white/10 text-white hover:bg-white/20 border border-white/30 h-14 px-8 text-body font-semibold">
                  Coming Soon
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
              <h2 className="text-display-xl text-dark-text mt-3">Current Titleholders</h2>
              <div className="w-20 h-1 bg-gold mx-auto mt-4" />
            </div>

            <TitleholdersGrid titleholders={currentTitleholders} />

            <div className="text-center mt-10">
              <Link href="/current-titleholders">
                <Button variant="outline" className="border-primary-blue text-primary-blue hover:bg-primary-blue hover:text-white h-12 px-8">
                  View All Titleholders <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ─── COUNTDOWN ─── */}
      <section className="py-section bg-primary-blue">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-caption text-gold uppercase tracking-widest">Grand Final Countdown</span>
          <div className="mt-6">
            <Countdown targetDate="2026-12-15T19:00:00" />
          </div>
        </div>
      </section>

      {/* ─── SPOTLIGHT ─── */}
      <section className="py-section bg-light-gray">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-caption text-primary-blue font-semibold tracking-widest">EXPLORE</span>
            <h2 className="text-display-xl text-dark-text mt-3">Spotlight</h2>
            <div className="w-20 h-1 bg-gold mx-auto mt-4" />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="group block relative overflow-hidden rounded-xxl bg-primary-blue p-8 min-h-[280px] flex flex-col justify-end transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <span className="inline-flex items-center gap-1.5 text-gold text-xs font-semibold uppercase tracking-widest mb-3 relative">
                <Clock className="h-3.5 w-3.5" /> Coming Soon
              </span>
              <h3 className="text-display-md text-white mb-2 relative">Finalists</h3>
              <p className="text-body text-white/70 relative">Para finalis Nyong Noni UNIMA akan segera diumumkan.</p>
            </div>
            <Link href="/news" className="group block relative overflow-hidden rounded-xxl bg-dark-text p-8 min-h-[280px] flex flex-col justify-end transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-blue/20 rounded-full -translate-y-1/2 translate-x-1/2" />
              <h3 className="text-display-md text-white mb-2 relative">Latest News</h3>
              <p className="text-body text-white/70 relative">Stay updated with the latest news and announcements from Nyong Noni UNIMA.</p>
              <span className="inline-flex items-center gap-1 text-gold text-sm font-semibold mt-4 relative group-hover:gap-2 transition-all">
                Read News <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
            <Link href="/events" className="group block relative overflow-hidden rounded-xxl bg-primary-blue-dark p-8 min-h-[280px] flex flex-col justify-end transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <h3 className="text-display-md text-white mb-2 relative">Upcoming Events</h3>
              <p className="text-body text-white/70 relative">Check out the schedule of upcoming Nyong Noni UNIMA events and activities.</p>
              <span className="inline-flex items-center gap-1 text-gold text-sm font-semibold mt-4 relative group-hover:gap-2 transition-all">
                View Events <ArrowRight className="h-4 w-4" />
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
                <span className="text-caption text-primary-blue font-semibold tracking-widest">FINALISTS 2026</span>
                <h2 className="text-display-xl text-dark-text mt-2">Meet Them</h2>
              </div>
              <Link href="/finalists">
                <Button variant="outline" className="border-primary-blue text-primary-blue hover:bg-primary-blue hover:text-white">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
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
              <span className="text-caption text-primary-blue font-semibold tracking-widest">ABOUT</span>
              <h2 className="text-display-xl text-dark-text mt-3 mb-6">Nyong Noni UNIMA</h2>
              <div className="w-20 h-1 bg-gold mb-6" />
              <p className="text-body-lg text-dark-secondary leading-relaxed mb-6">
                Nyong Noni UNIMA is the official student ambassador organization of Universitas Negeri Manado. 
                We develop students in leadership, culture, tourism promotion, public speaking, social impact, and academic excellence.
              </p>
              <p className="text-body text-dark-secondary mb-8">
                Through various programs and activities, we empower students to become exemplary ambassadors 
                who promote the rich culture and tourism potential of North Sulawesi.
              </p>
              <Link href="/about">
                <Button variant="primary" className="bg-primary-blue text-white hover:bg-primary-blue-dark h-12 px-8">
                  Learn More <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Leadership', desc: 'Programs', icon: '👥' },
                { label: 'Culture', desc: 'Preservation', icon: '🏛️' },
                { label: 'Tourism', desc: 'Promotion', icon: '🌴' },
                { label: 'Social', desc: 'Impact', icon: '🤝' },
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
              <h2 className="text-display-xl text-dark-text mt-3">Our Faculties</h2>
              <div className="w-20 h-1 bg-gold mx-auto mt-4" />
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
            <span className="text-caption text-gold font-semibold tracking-widest">CAMPUS ACTIVITIES</span>
            <h2 className="text-display-xl text-white mt-3">Programs & Initiatives</h2>
            <div className="w-20 h-1 bg-gold mx-auto mt-4" />
          </div>
          <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-5">
            {[
              { title: 'Student Activities', icon: '🎓' },
              { title: 'Community Service', icon: '💚' },
              { title: 'Leadership Programs', icon: '⭐' },
              { title: 'Cultural Programs', icon: '🎭' },
              { title: 'Tourism Promotion', icon: '🗺️' },
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
                <span className="text-caption text-primary-blue font-semibold tracking-widest">LATEST NEWS</span>
                <h2 className="text-display-xl text-dark-text mt-2">News & Updates</h2>
              </div>
              <Link href="/news">
                <Button variant="outline" className="border-primary-blue text-primary-blue hover:bg-primary-blue hover:text-white">
                  All News <ArrowRight className="ml-2 h-4 w-4" />
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
                      Read More <ArrowRight className="h-3 w-3" />
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
          <h2 className="text-display-xl text-white mb-4">Be Part of History</h2>
          <p className="text-body-lg text-white/80 mb-8 max-w-xl mx-auto">
            Register now and become the next student ambassador of Universitas Negeri Manado. Represent your faculty and showcase your talent.
          </p>
          <Link href="/register">
            <Button variant="primary" size="lg" className="bg-gold text-dark-text hover:bg-gold-light border-none h-14 px-10 text-body font-bold">
              Register Now
            </Button>
          </Link>
        </div>
      </section>
    </>
  )
}
