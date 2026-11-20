import { notFound } from 'next/navigation'
import { getPublicFinalist } from '@/server/actions/finalists'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Cake, GraduationCap, Instagram, ArrowLeft, Heart } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { FACULTY_NAMES, GENDER_LABEL, getFinalist2026 } from '@/lib/finalists-2026'
import { VoteButton } from '@/components/vote-modal'
import { VOTE_PRICE_IDR } from '@/lib/site-config'

export default async function FinalistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const official = getFinalist2026(id)
  if (official) {
    return (
      <div className="bg-ivory pb-24">
        <section className="gradient-hero relative overflow-hidden px-5 pb-28 pt-12">
          <div className="relative mx-auto max-w-5xl">
            <Link
              href="/finalists"
              className="inline-flex min-h-11 items-center gap-1 text-sm text-white/75 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali ke Finalis
            </Link>
          </div>
        </section>

        <section className="relative z-10 mx-auto -mt-20 max-w-5xl px-5">
          <div className="grid gap-8 md:grid-cols-[1fr_1.4fr]">
            <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-line bg-chip shadow-lg">
              <Image
                src={official.photo}
                alt={`Foto ${official.name}`}
                fill
                priority
                sizes="(min-width:768px) 40vw, 100vw"
                className="object-cover"
              />
              <span className="absolute left-4 top-4 rounded-full bg-navy/90 px-4 py-1.5 text-sm font-bold text-gold">
                No. {official.no}
              </span>
            </div>

            <div className="flex flex-col justify-end pb-2 md:pt-24">
              <span className="text-xs font-semibold uppercase tracking-widest text-gold-deep">
                Finalis {GENDER_LABEL[official.gender]} UNIMA 2026
              </span>
              <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-navy sm:text-5xl">
                {official.name}
              </h1>

              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-line bg-white p-4">
                <GraduationCap className="mt-0.5 size-5 shrink-0 text-gold-deep" aria-hidden />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-dark-secondary">Fakultas</p>
                  <p className="font-semibold text-navy">{official.faculty}</p>
                  <p className="text-sm text-dark-secondary">{FACULTY_NAMES[official.faculty]}</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-navy p-5 text-white">
                <p className="text-sm text-white/75">
                  Dukung {official.name.split(' ')[0]} lewat QRIS. Rp{VOTE_PRICE_IDR.toLocaleString('id-ID')} = 1 suara.
                </p>
                <VoteButton finalist={official} className="mt-4 w-full">
                  Vote {official.name.split(' ')[0]}
                </VoteButton>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  const finalist = await getPublicFinalist(id)

  if (!finalist) notFound()

  return (
    <div className="bg-white min-h-screen pb-[120px]">
      {/* ─── HERO ─── */}
      <section className="gradient-hero pt-[140px] pb-[60px] px-[20px]">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/finalists"
            className="inline-flex items-center gap-1 text-body-sm text-white/70 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Finalis
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-[20px] -mt-20 relative z-10">
        <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
          {/* ─── PHOTO CARD ─── */}
          <Card className="overflow-hidden border-border shadow-lg">
            <div className="aspect-[3/4] bg-light-gray flex items-center justify-center">
              {finalist.photo_url ? (
                <img src={finalist.photo_url} alt={finalist.full_name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-8xl font-bold text-primary-blue/20">{finalist.full_name?.charAt(0)}</span>
              )}
            </div>
            <CardContent className="p-6 text-center">
              <Badge className="mb-2 bg-accent text-white border-0">
                Finalis {finalist.profile?.tahun || new Date().getFullYear()}
              </Badge>
              <div className="flex justify-center gap-3 mt-4">
                {finalist.instagram && (
                  <a
                    href={`https://instagram.com/${finalist.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-light-gray flex items-center justify-center text-dark-secondary hover:bg-primary-blue hover:text-white transition-colors"
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ─── INFO ─── */}
          <div className="space-y-8">
            <div>
              <h1 className="text-display-xl text-dark-text tracking-tight mb-2">{finalist.full_name}</h1>
            </div>

            {/* Bio */}
            {finalist.bio && (
              <div className="bg-light-gray rounded-xl p-6 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="h-4 w-4 text-primary-blue" />
                  <h2 className="text-headline text-dark-text">Tentang</h2>
                </div>
                <p className="text-body text-dark-secondary leading-relaxed">{finalist.bio}</p>
              </div>
            )}

            {/* Personal Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              {finalist.faculty && (
                <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-border">
                  <GraduationCap className="h-5 w-5 text-primary-blue mt-0.5 shrink-0" />
                  <div>
                    <p className="text-caption text-dark-secondary uppercase mb-1">Fakultas</p>
                    <p className="text-body-sm font-semibold text-dark-text">{finalist.faculty}</p>
                    {finalist.study_program && (
                      <p className="text-body-sm text-dark-secondary">{finalist.study_program}</p>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-border">
                <Cake className="h-5 w-5 text-primary-blue mt-0.5 shrink-0" />
                <div>
                  <p className="text-caption text-dark-secondary uppercase mb-1">Umur</p>
                  <p className="text-body-sm font-semibold text-dark-text">{finalist.umur != null ? `${finalist.umur} tahun` : '-'}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  )
}
