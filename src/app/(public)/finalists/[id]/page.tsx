import { notFound } from 'next/navigation'
import { getPublicFinalist } from '@/server/actions/finalists'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Cake, GraduationCap, Instagram, Facebook, Music2, Ruler, Weight, Briefcase, Mail, Phone, ArrowLeft, Heart } from 'lucide-react'
import Link from 'next/link'

export default async function FinalistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
                {finalist.facebook && (
                  <a
                    href={`https://facebook.com/${finalist.facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-light-gray flex items-center justify-center text-dark-secondary hover:bg-primary-blue hover:text-white transition-colors"
                  >
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
                {finalist.tiktok && (
                  <a
                    href={`https://tiktok.com/@${finalist.tiktok.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-light-gray flex items-center justify-center text-dark-secondary hover:bg-primary-blue hover:text-white transition-colors"
                  >
                    <Music2 className="h-4 w-4" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ─── INFO ─── */}
          <div className="space-y-8">
            <div>
              <h1 className="text-display-xl text-dark-text tracking-tight mb-2">{finalist.full_name}</h1>
              <p className="text-subhead text-dark-secondary">{finalist.occupation}</p>
            </div>

            {/* Bio */}
            {finalist.profile?.bio && (
              <div className="bg-light-gray rounded-xl p-6 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="h-4 w-4 text-primary-blue" />
                  <h2 className="text-headline text-dark-text">Tentang</h2>
                </div>
                <p className="text-body text-dark-secondary leading-relaxed">{finalist.profile.bio}</p>
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
                <MapPin className="h-5 w-5 text-primary-blue mt-0.5 shrink-0" />
                <div>
                  <p className="text-caption text-dark-secondary uppercase mb-1">Asal</p>
                  <p className="text-body-sm font-semibold text-dark-text">{finalist.city}</p>
                  {finalist.province && <p className="text-body-sm text-dark-secondary">{finalist.province}</p>}
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-border">
                <Cake className="h-5 w-5 text-primary-blue mt-0.5 shrink-0" />
                <div>
                  <p className="text-caption text-dark-secondary uppercase mb-1">Umur</p>
                  <p className="text-body-sm font-semibold text-dark-text">{finalist.umur} tahun</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-border">
                <Briefcase className="h-5 w-5 text-primary-blue mt-0.5 shrink-0" />
                <div>
                  <p className="text-caption text-dark-secondary uppercase mb-1">Pekerjaan</p>
                  <p className="text-body-sm font-semibold text-dark-text">{finalist.occupation}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-border">
                <Ruler className="h-5 w-5 text-primary-blue mt-0.5 shrink-0" />
                <div>
                  <p className="text-caption text-dark-secondary uppercase mb-1">Tinggi</p>
                  <p className="text-body-sm font-semibold text-dark-text">{finalist.height_cm} cm</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-border">
                <Weight className="h-5 w-5 text-primary-blue mt-0.5 shrink-0" />
                <div>
                  <p className="text-caption text-dark-secondary uppercase mb-1">Berat</p>
                  <p className="text-body-sm font-semibold text-dark-text">{finalist.weight_kg} kg</p>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-light-gray rounded-xl p-6 border border-border">
              <h2 className="text-headline text-dark-text mb-4">Kontak</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-body-sm text-dark-secondary">
                  <Mail className="h-4 w-4 text-primary-blue" /> {finalist.email}
                </div>
                <div className="flex items-center gap-3 text-body-sm text-dark-secondary">
                  <Phone className="h-4 w-4 text-primary-blue" /> {finalist.phone}
                </div>
                {finalist.instagram && (
                  <div className="flex items-center gap-3 text-body-sm text-dark-secondary">
                    <Instagram className="h-4 w-4 text-primary-blue" /> {finalist.instagram}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
