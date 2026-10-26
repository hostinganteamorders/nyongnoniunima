import type { Metadata } from 'next'
import { Calendar, Megaphone } from 'lucide-react'
import type { SelectionAnnouncement } from '@/lib/selection'
import { getPublishedSelectionAnnouncements } from '@/server/actions/selection'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Pengumuman Seleksi | Nyong Noni UNIMA',
  description: 'Pengumuman resmi hasil seleksi finalis Nyong Noni Universitas Negeri Manado.',
}

export default async function AnnouncementsPage() {
  const announcements: SelectionAnnouncement[] = (await getPublishedSelectionAnnouncements())
    .filter((announcement) => Boolean(announcement.published_at))
    .sort((a, b) => b.year - a.year)

  return (
    <div className="min-h-screen bg-white pb-24">
      <section className="border-b border-border px-5 pb-16 pt-36 text-center sm:pb-24 sm:pt-44">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 text-caption uppercase tracking-widest text-dark-secondary">Informasi Resmi</p>
          <h1 className="text-4xl font-bold tracking-tight text-dark-text sm:text-6xl">Pengumuman <span className="text-primary-blue">Seleksi</span></h1>
          <p className="mx-auto mt-6 max-w-2xl text-body-lg text-dark-secondary">Hasil seleksi finalis Nyong Noni Universitas Negeri Manado yang telah resmi diterbitkan.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-12 sm:py-20" aria-label="Pengumuman yang diterbitkan">
        {announcements.length === 0 ? <div className="mx-auto max-w-lg py-12 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border"><Megaphone className="h-8 w-8 text-primary-blue" /></div>
          <h2 className="text-2xl font-bold text-dark-text">Belum Ada Pengumuman</h2>
          <p className="mt-4 leading-relaxed text-dark-secondary">Pengumuman hasil seleksi akan tersedia di halaman ini setelah diterbitkan oleh panitia.</p>
        </div> : <>
          <nav aria-label="Tahun pengumuman" className="mb-8 flex flex-wrap gap-2">
            {announcements.map((announcement) => <a key={announcement.year} href={`#tahun-${announcement.year}`} className="rounded-full border border-border px-5 py-2 text-sm font-medium text-primary-blue transition-colors hover:bg-primary-blue hover:text-white">{announcement.year}</a>)}
          </nav>
          <div className="space-y-12">
            {announcements.map((announcement) => {
              const faculties = [...new Set(announcement.participants.map((participant) => participant.faculty || 'Fakultas tidak tersedia'))].sort((a, b) => a.localeCompare(b, 'id'))
              return <article key={announcement.year} id={`tahun-${announcement.year}`} className="scroll-mt-28 overflow-hidden rounded-2xl border border-border">
                <div className="border-b border-border bg-light-gray p-5 sm:p-8">
                  <span className="inline-block rounded-full bg-accent px-4 py-1 text-xs font-bold text-primary-blue">Seleksi {announcement.year}</span>
                  <h2 className="mt-4 whitespace-pre-wrap break-words text-2xl font-bold text-dark-text sm:text-3xl">{announcement.title}</h2>
                  <p className="mt-4 flex items-center gap-2 text-sm text-dark-secondary"><Calendar className="h-4 w-4 shrink-0" /><time dateTime={announcement.published_at!}>{new Date(announcement.published_at!).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Makassar' })}</time></p>
                </div>
                <div className="p-5 sm:p-8">
                  <p className="whitespace-pre-wrap break-words text-sm leading-7 text-dark-text sm:text-base">{announcement.body}</p>
                  <div className="mt-10 border-t border-border pt-8">
                    <h3 className="text-xl font-bold text-primary-blue">Finalis Nyong Noni UNIMA {announcement.year}</h3>
                    <div className="mt-6 space-y-8">
                      {faculties.map((faculty) => <section key={faculty}>
                        <h4 className="border-l-2 border-accent pl-3 font-semibold text-dark-text">{faculty}</h4>
                        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                          {announcement.participants.filter((participant) => (participant.faculty || 'Fakultas tidak tersedia') === faculty).map((participant) => <li key={participant.id} className="rounded-lg border border-border p-4">
                            <p className="break-words font-semibold text-dark-text">{participant.full_name}</p>
                            <p className="mt-1 break-words text-sm text-dark-secondary">{participant.study_program || 'Program studi tidak tersedia'}</p>
                            {(participant.gender === 'Laki-laki' || participant.gender === 'Perempuan') && <span className="mt-3 inline-block rounded-full bg-primary-blue/5 px-3 py-1 text-xs font-medium text-primary-blue">{participant.gender === 'Laki-laki' ? 'Nyong' : 'Noni'}</span>}
                          </li>)}
                        </ul>
                      </section>)}
                    </div>
                  </div>
                </div>
              </article>
            })}
          </div>
        </>}
      </section>
    </div>
  )
}
