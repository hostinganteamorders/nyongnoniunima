import { Calendar, MapPin, Clock } from 'lucide-react'
import { getPublicEvents } from '@/server/actions/content'

const CATEGORIES = [
  'Open Registration',
  'Technical Meeting',
  'Interview',
  'Training Camp',
  'Talent Show',
  'Social Project',
  'Grand Final',
] as const

const CATEGORY_COLORS: Record<string, string> = {
  'Grand Final': 'bg-accent text-white',
  'Training Camp': 'bg-primary-blue text-white',
  'Interview': 'bg-primary-blue/80 text-white',
  'Technical Meeting': 'bg-dark-secondary text-white',
  'Open Registration': 'bg-primary-blue-light text-white',
  'Talent Show': 'bg-accent-dark text-white',
  'Social Project': 'bg-accent-light text-primary-blue-dark',
}

interface EventItem {
  id: string
  title: string
  description: string
  date: string
  location: string
  category: string
  image_url?: string | null
  published?: boolean
}

export default async function EventsPage() {
  let events: EventItem[] = []
  try {
    events = (await getPublicEvents().catch(() => [])) as EventItem[]
  } catch {}

  const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="bg-white min-h-screen pb-[120px]">
      {/* ─── HERO ─── */}
      <section className="gradient-hero relative flex flex-col items-center justify-center pt-[180px] pb-[96px] px-[20px] text-center">
        <div className="max-w-4xl mx-auto">
          <p className="text-caption text-accent-light uppercase tracking-widest mb-4">Event & Kegiatan</p>
          <h1 className="text-display-xxl text-white tracking-tighter mb-8 animate-fade-in">
            Jadwal Acara <br />
            <span className="text-accent">Nyong Noni UNIMA</span>
          </h1>
          <p className="text-subhead text-white/80 max-w-2xl mx-auto">
            Ikuti setiap kegiatan mulai dari pendaftaran, technical meeting, hingga malam puncak Grand Final.
          </p>
        </div>
      </section>

      <section className="py-[96px] bg-light-gray">
        <div className="mx-auto max-w-7xl px-[20px]">
          {/* ─── CATEGORY LEGEND ─── */}
          <div className="flex flex-wrap gap-3 mb-16 justify-center">
            {CATEGORIES.map((cat) => (
              <div
                key={cat}
                className={`px-4 py-2 rounded-full text-body-sm font-medium ${
                  CATEGORY_COLORS[cat] || 'bg-border text-dark-secondary'
                }`}
              >
                {cat}
              </div>
            ))}
          </div>

          {sortedEvents.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-body-lg text-dark-secondary">Belum ada acara yang dijadwalkan.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {sortedEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-white rounded-xl border border-border overflow-hidden shadow-sm interactive-hover"
                >
                  {event.image_url && (
                    <div className="aspect-[16/7] overflow-hidden bg-light-gray">
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-8 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          CATEGORY_COLORS[event.category] || 'bg-light-gray text-dark-secondary'
                        }`}
                      >
                        {event.category}
                      </span>
                      <span className="flex items-center gap-1.5 text-caption text-dark-secondary">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(event.date).toLocaleDateString('id-ID', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <h3 className="text-headline text-dark-text mb-3">{event.title}</h3>
                    <p className="text-body-sm text-dark-secondary mb-6 leading-relaxed">
                      {event.description}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-4 text-body-sm text-dark-secondary border-t border-border pt-4">
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary-blue" />
                        {new Date(event.date).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary-blue" />
                        {event.location}
                      </span>
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
