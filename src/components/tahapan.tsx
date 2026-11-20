import { CalendarDays, Check, MapPin } from 'lucide-react'
import { CURRENT_TAHAP, SHOW_SCHEDULE_DATES } from '@/lib/site-config'
import { cn } from '@/lib/utils'

interface Tahap {
  no: number
  nama: string
  deskripsi: string
  waktu: string
  tempat: string
}

const TAHAPAN: Tahap[] = [
  {
    no: 1,
    nama: 'Audisi',
    deskripsi:
      'Audisi merupakan tahap awal untuk menjaring mahasiswa yang memiliki potensi, karakter, kemampuan komunikasi, wawasan, dan kreativitas.',
    waktu: '26–30 Oktober 2026',
    tempat: 'Universitas Negeri Manado',
  },
  {
    no: 2,
    nama: 'Semifinal',
    deskripsi:
      'Semifinal merupakan tahap lanjutan untuk menyeleksi peserta dan menentukan kandidat yang akan melanjutkan ke tahapan berikutnya.',
    waktu: '05 November 2026',
    tempat: 'Auditorium Unima',
  },
  {
    no: 3,
    nama: 'Coaching Kampus',
    deskripsi:
      'Peserta akan mendapatkan berbagai materi dan pembekalan yang mendukung kemampuan serta kesiapan mereka sebagai calon Nyong dan Noni UNIMA.',
    waktu: '09–20 November 2026',
    tempat: 'Universitas Negeri Manado',
  },
  {
    no: 4,
    nama: 'Talent Show',
    deskripsi:
      'Campus Talent Show menjadi ruang untuk menampilkan kreativitas dan talenta mahasiswa melalui berbagai bentuk pertunjukan seperti musik, tari, seni, komunitas, dan bentuk kreativitas lainnya.',
    waktu: '18 November 2026',
    tempat: 'Segera Diumumkan',
  },
  {
    no: 5,
    nama: 'Karantina',
    deskripsi:
      'Karantina menjadi tahap persiapan dan pembekalan intensif bagi para finalis sebelum memasuki malam Grand Final.',
    waktu: '23–26 November 2026',
    tempat: 'Segera Diumumkan',
  },
  {
    no: 6,
    nama: 'Grand Final',
    deskripsi:
      'Grand Final merupakan puncak rangkaian Pemilihan Nyong Noni UNIMA 2026. Acara ini akan menjadi momen utama bagi para finalis untuk menampilkan kemampuan mereka sekaligus menjadi malam penobatan Nyong dan Noni UNIMA 2026. Grand Final juga dapat dikembangkan sebagai sebuah acara yang menghadirkan pertunjukan kreatif, komunitas, UMKM, serta aktivitas brand yang memberikan pengalaman berbeda bagi para penonton.',
    waktu: '26 November 2026',
    tempat: 'Auditorium Unima',
  },
]

export function TahapanPemilihan({
  showDates = SHOW_SCHEDULE_DATES,
  currentTahap = CURRENT_TAHAP,
}: {
  showDates?: boolean
  currentTahap?: number
}) {
  return (
    <section id="tahapan" className="bg-white py-section">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-gold-deep">Jadwal</span>
          <h2 className="mt-3 text-display-xl text-navy">Tahapan Pemilihan 2026</h2>
          <p className="mt-4 text-body-lg text-dark-secondary">
            Enam tahap dari audisi hingga malam penobatan Nyong dan Noni UNIMA 2026.
          </p>
        </div>

        <ol className="relative grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {TAHAPAN.map((t) => {
            const done = t.no < currentTahap
            const current = t.no === currentTahap
            return (
              <li
                key={t.no}
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'flex flex-col rounded-3xl border p-6 transition-shadow hover:shadow-md',
                  current ? 'border-gold bg-navy text-white shadow-lg' : 'border-line bg-white',
                )}
              >
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className={cn(
                      'flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                      current ? 'bg-gold text-navy' : done ? 'bg-chip text-gold-deep' : 'bg-navy text-white',
                    )}
                  >
                    {done ? <Check className="size-5" aria-label="Selesai" /> : String(t.no).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className={cn('font-serif text-xl font-semibold', current ? 'text-white' : 'text-navy')}>
                      {t.nama}
                    </h3>
                    {(done || current) && (
                      <span
                        className={cn(
                          'text-xs font-semibold uppercase tracking-wider',
                          current ? 'text-gold' : 'text-gold-deep',
                        )}
                      >
                        {current ? 'Sedang berlangsung' : 'Selesai'}
                      </span>
                    )}
                  </div>
                </div>
                <p className={cn('flex-1 text-sm leading-relaxed', current ? 'text-white/80' : 'text-dark-secondary')}>
                  {t.deskripsi}
                </p>
                <div className={cn('mt-5 space-y-2 border-t pt-4 text-sm', current ? 'border-white/15' : 'border-line')}>
                  {showDates && (
                    <p className="flex items-start gap-2">
                      <CalendarDays className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                      <span>
                        <span className="font-semibold">Waktu:</span> {t.waktu}
                      </span>
                    </p>
                  )}
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                    <span>
                      <span className="font-semibold">Tempat:</span> {t.tempat}
                    </span>
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
