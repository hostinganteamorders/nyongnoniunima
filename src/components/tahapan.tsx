import { CalendarDays, MapPin } from 'lucide-react'

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

export function TahapanPemilihan() {
  return (
    <section id="tahapan" className="py-section bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <span className="text-caption font-semibold tracking-widest text-primary-blue">JADWAL</span>
          <h2 className="mt-3 text-display-xl text-dark-text">Tahapan Pemilihan 2026</h2>
          <div className="mx-auto mt-4 h-1 w-20 bg-accent" />
          <p className="mx-auto mt-6 max-w-2xl text-body-lg text-dark-secondary">
            Enam tahap dari audisi hingga malam penobatan Nyong dan Noni UNIMA 2026.
          </p>
        </div>

        <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {TAHAPAN.map((t) => (
            <li
              key={t.no}
              className="flex flex-col rounded-xl border border-border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-blue text-body-sm font-bold text-white">
                  {String(t.no).padStart(2, '0')}
                </span>
                <h3 className="text-headline text-dark-text">{t.nama}</h3>
              </div>
              <p className="flex-1 text-body-sm leading-relaxed text-dark-secondary">{t.deskripsi}</p>
              <div className="mt-5 space-y-2 border-t border-border pt-4">
                <p className="flex items-start gap-2 text-body-sm text-dark-text">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary-blue" />
                  <span>
                    <span className="font-semibold">Waktu:</span> {t.waktu}
                  </span>
                </p>
                <p className="flex items-start gap-2 text-body-sm text-dark-text">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-blue" />
                  <span>
                    <span className="font-semibold">Tempat:</span> {t.tempat}
                  </span>
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
