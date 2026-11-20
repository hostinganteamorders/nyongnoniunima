import Link from 'next/link'
import Image from 'next/image'
import { Globe, Instagram, Mail, MapPin } from 'lucide-react'

const COLUMNS = [
  {
    title: 'Tentang',
    links: [
      { label: 'Tentang Kami', href: '/about' },
      { label: 'Finalis 2026', href: '/finalists' },
      { label: 'Daftar', href: '/register' },
    ],
  },
  {
    title: 'Titleholders',
    links: [
      { label: 'Arsip', href: '/titleholders' },
      { label: 'Saat Ini', href: '/current-titleholders' },
      { label: 'Hall of Fame', href: '/hall-of-fame' },
      { label: 'Prestasi Alumni', href: '/alumni-achievements' },
    ],
  },
  {
    title: 'Kabar',
    links: [
      { label: 'Berita', href: '/news' },
      { label: 'Acara', href: '/events' },
      { label: 'Pengumuman', href: '/announcements' },
      { label: 'Galeri', href: '/gallery' },
    ],
  },
]

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Image
              src="/images/logo-nyong-noni-unima.png"
              alt="Logo Nyong Noni UNIMA"
              width={720}
              height={796}
              className="h-14 w-auto brightness-0 invert"
            />
            <p className="mt-5 max-w-sm font-serif text-xl leading-snug text-white/90">
              Duta mahasiswa Universitas Negeri Manado.
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/65">
              Wadah pengembangan mahasiswa dalam kepemimpinan, budaya, pariwisata, dan prestasi akademik.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-white/75">
              <li className="flex items-center gap-3">
                <Globe className="size-4 shrink-0 text-gold" aria-hidden />
                <a href="https://ikatannyongnoniunima.com" className="hover:text-gold">
                  ikatannyongnoniunima.com
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Instagram className="size-4 shrink-0 text-gold" aria-hidden />
                <a
                  href="https://instagram.com/ikatannyongnoniunima"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gold"
                >
                  @ikatannyongnoniunima
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="size-4 shrink-0 text-gold" aria-hidden />
                <a href="mailto:nyongnoni@unima.ac.id" className="hover:text-gold">
                  nyongnoni@unima.ac.id
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                <span>Universitas Negeri Manado, Tondano, Sulawesi Utara</span>
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-gold">{col.title}</h4>
                <ul className="mt-4 space-y-1">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="inline-flex min-h-10 items-center text-sm text-white/75 transition-colors hover:text-gold"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-xs text-white/55">
            &copy; {year} Nyong Noni UNIMA. Hak cipta dilindungi undang-undang.
          </p>
          <a
            href="https://www.teamorders2k25.com/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Powered by ORDERS"
            className="group inline-flex items-center gap-2 text-[11px] text-white/50 transition-colors hover:text-white/80"
          >
            Powered by
            <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1">
              <Image src="/images/orders.png" alt="ORDERS" width={1000} height={353} className="h-4 w-auto" />
            </span>
          </a>
        </div>
      </div>
    </footer>
  )
}
