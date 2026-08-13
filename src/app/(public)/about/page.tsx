import { Award, Globe, MapPin, Users, Target, Eye, ChevronRight, Calendar, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

const milestones = [
  { year: '2014', event: 'Penyelenggaraan pertama Nyong Noni Sulawesi Utara' },
  { year: '2016', event: 'Jangkauan diperluas ke seluruh kabupaten/kota se-Sulut' },
  { year: '2018', event: 'Kerjasama dengan Dinas Pariwisata Provinsi Sulawesi Utara' },
  { year: '2020', event: 'Platform digital dan pendaftaran online diperkenalkan' },
  { year: '2022', event: 'Alumni berprestasi di tingkat nasional dan internasional' },
  { year: '2024', event: 'Menjadi ajang duta wisata dan budaya terdepan di Sulawesi' },
  { year: '2026', event: 'Nyong Noni UNIMA hadir sebagai wajah baru generasi muda kampus' },
]

const values = [
  {
    icon: Award,
    title: 'Prestasi',
    desc: 'Melahirkan generasi muda berprestasi yang siap bersaing di kancah nasional dan internasional.',
  },
  {
    icon: Globe,
    title: 'Budaya',
    desc: 'Melestarikan dan mempromosikan kekayaan budaya Sulawesi Utara kepada dunia.',
  },
  {
    icon: MapPin,
    title: 'Wisata',
    desc: 'Mengembangkan potensi pariwisata daerah melalui duta-duta muda berbakat.',
  },
  {
    icon: Users,
    title: 'Generasi Muda',
    desc: 'Membentuk karakter pemuda yang peduli terhadap budaya, pariwisata, dan masyarakat.',
  },
]

const selectionSteps = [
  { step: 1, title: 'Pendaftaran Online', desc: 'Calon finalis mendaftar melalui platform resmi dengan melengkapi data diri dan persyaratan.' },
  { step: 2, title: 'Seleksi Berkas', desc: 'Tim juri menyeleksi berkas pendaftaran untuk memilih kandidat yang memenuhi kriteria.' },
  { step: 3, title: 'Technical Meeting', desc: 'Peserta terpilih mengikuti technical meeting untuk mendapatkan arahan teknis pelaksanaan.' },
  { step: 4, title: 'Wawancara & Talent Show', desc: 'Kandidat menjalani wawancara mendalam dan menampilkan bakat di depan dewan juri.' },
  { step: 5, title: 'Masa Karantina', desc: 'Finalis mengikuti pembekalan, pelatihan, dan simulasi selama masa karantina intensif.' },
  { step: 6, title: 'Malam Grand Final', desc: 'Puncak acara pemilihan Nyong Noni UNIMA yang menampilkan seluruh finalis.' },
]

const annualTimeline = [
  { month: 'Januari - Februari', event: 'Pendaftaran dibuka' },
  { month: 'Maret', event: 'Seleksi berkas dan pengumuman peserta lolos' },
  { month: 'April', event: 'Technical Meeting dan Wawancara' },
  { month: 'Mei', event: 'Talent Show dan pemilihan finalis' },
  { month: 'Juni - Juli', event: 'Masa Karantina dan pembekalan' },
  { month: 'Agustus', event: 'Malam Grand Final' },
]

const orgStructure = [
  { role: 'Dewan Pembina', desc: 'Rektor dan Wakil Rektor Universitas' },
  { role: 'Steering Committee', desc: 'Kepala Dinas Pariwisata & Akademisi' },
  { role: 'Panitia Pelaksana', desc: 'Mahasiswa aktif UNIMA' },
  { role: 'Dewan Juri', desc: 'Profesional di bidang pariwisata, budaya, dan entertainment' },
  { role: 'Mentor & Pelatih', desc: 'Alumni dan praktisi berpengalaman' },
]

export default function AboutPage() {
  return (
    <div className="bg-white min-h-screen pb-[120px]">
      {/* ─── HERO ─── */}
      <section className="gradient-hero relative flex flex-col items-center justify-center pt-[180px] pb-[96px] px-[20px] text-center">
        <div className="max-w-4xl mx-auto">
          <Image
            src="/images/logo-nyong-noni-unima.png"
            alt="Logo Nyong Noni UNIMA"
            width={128}
            height={128}
            className="w-28 h-28 sm:w-36 sm:h-36 object-contain mx-auto mb-8"
            priority
          />
          <p className="text-caption text-gold-light uppercase tracking-widest mb-4">Tentang</p>
          <h1 className="text-display-xxl text-white tracking-tighter mb-8 animate-fade-in">
            About Nyong Noni <br />
            <span className="text-gold">UNIMA</span>
          </h1>
          <p className="text-subhead text-white/80 max-w-2xl mx-auto">
            Ajang bergengsi pemilihan duta wisata dan budaya Universitas Negeri Manado yang melahirkan generasi muda terbaik Sulawesi Utara.
          </p>
        </div>
      </section>

      {/* ─── ABOUT TEXT ─── */}
      <section className="py-[96px]">
        <div className="mx-auto max-w-3xl px-[20px]">
          <p className="text-body-lg text-dark-secondary leading-relaxed">
            Nyong Noni UNIMA adalah program pemilihan duta wisata dan budaya yang diselenggarakan oleh Universitas Negeri Manado. 
            Program ini bertujuan untuk menemukan generasi muda yang berprestasi, berwawasan luas, dan siap menjadi duta 
            pariwisata serta budaya daerah, khususnya di lingkungan kampus UNIMA dan Sulawesi Utara secara umum.
          </p>
        </div>
      </section>

      {/* ─── CORE VALUES ─── */}
      <section className="py-[96px] bg-light-gray">
        <div className="mx-auto max-w-7xl px-[20px]">
          <div className="text-center mb-16">
            <p className="text-caption text-[#003DA5] uppercase tracking-widest mb-2">Nilai Inti</p>
            <h2 className="text-display-lg text-dark-text">Core Values</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => {
              const Icon = v.icon
              return (
                <div key={v.title} className="bg-white rounded-xl border border-border p-8 interactive-hover shadow-sm min-h-[250px]">
                  <div className="w-12 h-12 rounded-lg bg-[#003DA5]/10 flex items-center justify-center mb-6">
                    <Icon className="h-6 w-6 text-[#003DA5]" />
                  </div>
                  <h3 className="text-headline text-dark-text mb-3">{v.title}</h3>
                  <p className="text-body-sm text-dark-secondary leading-relaxed">{v.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── VISI & MISI ─── */}
      <section className="py-[96px]">
        <div className="mx-auto max-w-7xl px-[20px]">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="gradient-blue p-10 rounded-xl h-full flex flex-col justify-center text-white">
              <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center mb-6">
                <Eye className="h-6 w-6" />
              </div>
              <h2 className="text-display-md mb-4">Visi</h2>
              <p className="text-body-lg text-white/80 leading-relaxed">
                Menjadi ajang pemilihan duta wisata dan budaya terdepan yang mampu melahirkan generasi muda berkualitas, 
                berkarakter, dan siap mempromosikan potensi Universitas Negeri Manado dan Sulawesi Utara di kancah nasional 
                dan internasional.
              </p>
            </div>
            <div className="bg-light-gray p-10 rounded-xl h-full flex flex-col justify-center border border-border">
              <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center mb-6">
                <Target className="h-6 w-6 text-gold" />
              </div>
              <h2 className="text-display-md text-dark-text mb-6">Misi</h2>
              <ul className="space-y-4">
                {[
                  'Menjaring generasi muda berbakat dari seluruh fakultas di UNIMA',
                  'Membentuk duta wisata yang berpengetahuan luas tentang budaya dan pariwisata daerah',
                  'Mempromosikan keindahan alam, budaya, dan kuliner Sulawesi Utara',
                  'Menciptakan generasi muda yang peduli terhadap pariwisata dan lingkungan kampus',
                  'Menjalin kerjasama dengan Dinas Pariwisata dan stakeholder terkait',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <CheckCircle className="h-5 w-5 text-[#003DA5] mt-0.5 shrink-0" />
                    <span className="text-body text-dark-secondary">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ORGANIZATIONAL STRUCTURE ─── */}
      <section className="py-[96px] bg-light-gray">
        <div className="mx-auto max-w-7xl px-[20px]">
          <div className="text-center mb-16">
            <p className="text-caption text-[#003DA5] uppercase tracking-widest mb-2">Struktur</p>
            <h2 className="text-display-lg text-dark-text">Organizational Structure</h2>
          </div>
          <div className="flex flex-col items-center">
            {/* Top - Pembina */}
            <div className="gradient-blue px-8 py-4 rounded-xl text-white text-center mb-8">
              <p className="text-headline">{orgStructure[0].role}</p>
              <p className="text-body-sm text-white/70">{orgStructure[0].desc}</p>
            </div>
            {/* Connector line */}
            <div className="w-px h-8 bg-[#003DA5]/30" />
            {/* Tree branches */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 w-full max-w-4xl">
              {orgStructure.slice(1).map((item) => (
                <div key={item.role} className="bg-white rounded-xl border border-border p-6 text-center shadow-sm">
                  <p className="text-headline text-dark-text mb-2">{item.role}</p>
                  <p className="text-body-sm text-dark-secondary">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── SELECTION PROCESS ─── */}
      <section className="py-[96px]">
        <div className="mx-auto max-w-7xl px-[20px]">
          <div className="text-center mb-16">
            <p className="text-caption text-[#003DA5] uppercase tracking-widest mb-2">Tahapan</p>
            <h2 className="text-display-lg text-dark-text">Selection Process</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {selectionSteps.map((s) => (
              <div key={s.step} className="bg-white rounded-xl border border-border p-8 shadow-sm relative">
                <div className="w-10 h-10 rounded-full bg-[#003DA5] text-white flex items-center justify-center text-headline font-bold mb-4">
                  {s.step}
                </div>
                <h3 className="text-headline text-dark-text mb-2">{s.title}</h3>
                <p className="text-body-sm text-dark-secondary leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HISTORY TIMELINE ─── */}
      <section className="py-[96px] bg-light-gray">
        <div className="mx-auto max-w-3xl px-[20px]">
          <div className="text-center mb-16">
            <p className="text-caption text-[#003DA5] uppercase tracking-widest mb-2">Sejarah</p>
            <h2 className="text-display-lg text-dark-text">Perjalanan Sejarah</h2>
          </div>
          <div className="relative pl-8 border-l-2 border-[#003DA5]/20 ml-4 md:ml-0">
            <div className="space-y-12">
              {milestones.map((m) => (
                <div key={m.year} className="relative">
                  <div className="absolute -left-[45px] top-1.5 w-5 h-5 rounded-full bg-[#003DA5] outline outline-4 outline-light-gray" />
                  <span className="text-headline text-[#003DA5] block mb-2 font-bold">{m.year}</span>
                  <p className="text-body-sm text-dark-secondary">{m.event}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── ANNUAL TIMELINE ─── */}
      <section className="py-[96px]">
        <div className="mx-auto max-w-4xl px-[20px]">
          <div className="text-center mb-16">
            <p className="text-caption text-[#003DA5] uppercase tracking-widest mb-2">Kalender</p>
            <h2 className="text-display-lg text-dark-text">Annual Timeline</h2>
            <p className="text-body text-dark-secondary mt-2">Rangkaian kegiatan tahunan Nyong Noni UNIMA</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {annualTimeline.map((item) => (
              <div key={item.month} className="bg-white rounded-xl border border-border p-6 shadow-sm flex items-start gap-4">
                <Calendar className="h-5 w-5 text-[#003DA5] mt-0.5 shrink-0" />
                <div>
                  <p className="text-body-sm font-semibold text-dark-text mb-1">{item.month}</p>
                  <p className="text-body-sm text-dark-secondary">{item.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-[96px] gradient-hero text-center">
        <div className="mx-auto max-w-2xl px-[20px]">
          <h2 className="text-display-lg text-white mb-6">
            Bergabung Menjadi Bagian dari Sejarah
          </h2>
          <p className="text-body-lg text-white/80 mb-10">
            Daftarkan dirimu sekarang dan jadilah bagian dari perjalanan Nyong Noni UNIMA.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/register">
              <Button variant="gold" className="h-14 px-8 text-lg">
                Daftar Sekarang
              </Button>
            </Link>
            <Link href="/finalists">
              <Button variant="outline" className="h-14 px-8 text-lg border-white/30 text-white hover:bg-white/10">
                Lihat Finalis
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
