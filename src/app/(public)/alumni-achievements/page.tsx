import { getAlumniAchievements } from '@/server/actions/finalists'
import { Trophy, Instagram, Briefcase, Building2 } from 'lucide-react'

const ACHIEVEMENT_COLORS: Record<string, string> = {
  'ASN': 'bg-primary-blue/10 text-primary-blue',
  'Dokter': 'bg-green-500/20 text-green-700',
  'Pengusaha': 'bg-accent/20 text-accent-dark',
  'Influencer': 'bg-accent-magenta/20 text-accent-magenta',
  'Duta Nasional': 'bg-primary-blue/20 text-primary-blue',
}

function renderPhoto(achievement: any) {
  if (achievement.photo_url) {
    return (
      <img
        src={achievement.photo_url}
        alt={achievement.alumni_name}
        className="h-full w-full object-cover"
      />
    )
  }
  return (
    <span className="text-headline text-dark-text">
      {achievement.alumni_name?.charAt(0) || 'A'}
    </span>
  )
}

export default async function AlumniAchievementsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const params = await searchParams
  const achievements = await getAlumniAchievements().catch(() => []) as any[]

  const types = [...new Set(achievements.map((a: any) => a.achievement_type))]

  const filtered = params.type
    ? achievements.filter((a: any) => a.achievement_type === params.type)
    : achievements

  return (
    <div className="bg-white min-h-screen pb-[120px]">
      <section className="relative flex flex-col items-center justify-center pt-[180px] pb-[96px] px-[20px] text-center border-b border-border">
        <div className="max-w-4xl mx-auto">
          <p className="text-caption text-dark-secondary uppercase tracking-widest mb-4">Alumni</p>
          <div className="flex items-center justify-center gap-4 mb-8 animate-fade-in">
            <Trophy className="h-10 w-10 text-accent" />
            <h1 className="text-display-xl text-dark-text tracking-tighter">
              Prestasi
            </h1>
            <Trophy className="h-10 w-10 text-accent" />
          </div>
          <p className="text-subhead text-dark-secondary max-w-2xl mx-auto">
            Alumni Nyong Noni UNIMA yang berhasil di berbagai bidang
          </p>
        </div>
      </section>

      <section className="py-[96px]">
        <div className="mx-auto max-w-7xl px-[20px]">
          {/* Filter badges */}
          <div className="flex flex-wrap gap-3 mb-16 justify-center">
            <form>
              <button
                type="submit"
                name="type"
                value=""
                className={`rounded-full px-5 py-2 text-sm font-medium transition-colors border ${
                  !params.type
                    ? 'bg-primary-blue text-white border-primary-blue shadow-md'
                    : 'bg-white text-dark-secondary border-border hover:bg-light-gray hover:text-dark-text'
                }`}
              >
                Semua
              </button>
            </form>
            {types.map((t) => (
              <form key={t}>
                <button
                  type="submit"
                  name="type"
                  value={t}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-colors border ${
                    params.type === t
                      ? 'bg-primary-blue text-white border-primary-blue shadow-md'
                      : 'bg-white text-dark-secondary border-border hover:bg-light-gray hover:text-dark-text'
                  }`}
                >
                  {t}
                </button>
              </form>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-body-lg text-dark-secondary">Belum ada data prestasi alumni</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((a: any) => (
                <div key={a.id} className="product-mockup-tile flex flex-col p-8 interactive-hover active-scale">
                  {/* Header with photo */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="h-16 w-16 rounded-full bg-white border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {renderPhoto(a)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-headline text-dark-text mb-1 truncate">{a.alumni_name}</h3>
                      <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${ACHIEVEMENT_COLORS[a.achievement_type] || 'bg-white text-dark-text'}`}>
                        {a.achievement_type}
                      </span>
                    </div>
                  </div>

                  {/* Current position & organization */}
                  {(a.current_position || a.organization) && (
                    <div className="mb-4 space-y-1.5">
                      {a.current_position && (
                        <p className="flex items-center gap-2 text-body-sm text-dark-text">
                          <Briefcase className="h-4 w-4 text-dark-secondary shrink-0" />
                          {a.current_position}
                        </p>
                      )}
                      {a.organization && (
                        <p className="flex items-center gap-2 text-body-sm text-dark-secondary">
                          <Building2 className="h-4 w-4 text-dark-secondary shrink-0" />
                          {a.organization}
                        </p>
                      )}
                    </div>
                  )}

                  <p className="text-body-sm text-dark-secondary leading-relaxed mb-6 flex-grow">{a.description}</p>

                  <div className="flex items-center gap-4 mt-auto text-sm text-dark-secondary border-t border-border pt-4">
                    <span className="font-medium text-dark-text">{a.tahun}</span>
                    {a.instagram && (
                      <a href={`https://instagram.com/${a.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary-blue hover:opacity-80 transition-opacity ml-auto">
                        <Instagram className="h-4 w-4" /> <span className="truncate max-w-[120px]">{a.instagram}</span>
                      </a>
                    )}
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
