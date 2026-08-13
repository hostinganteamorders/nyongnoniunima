import Link from 'next/link'
import Image from 'next/image'
import { Instagram, Mail, MapPin } from 'lucide-react'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-primary-blue text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-xl bg-white p-1.5 inline-flex items-center justify-center">
                <Image
                  src="/images/logo-nyong-noni-unima.png"
                  alt="Logo Nyong Noni UNIMA"
                  width={48}
                  height={48}
                  className="h-11 w-11"
                />
              </div>
            </div>
            <p className="text-white/70 text-sm leading-relaxed max-w-md">
              Wadah pengembangan mahasiswa dalam kepemimpinan, budaya, pariwisata,
              dan prestasi akademik di Universitas Negeri Manado.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <a
                href="https://instagram.com/nyongnoniunima"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center rounded-full bg-white/10 text-white size-10 hover:bg-gold hover:text-primary-blue transition-all duration-200"
                aria-label="Instagram Nyong Noni UNIMA"
              >
                <Instagram className="size-4.5" />
              </a>
              <a
                href="mailto:nyongnoni@unima.ac.id"
                className="flex items-center justify-center rounded-full bg-white/10 text-white size-10 hover:bg-gold hover:text-primary-blue transition-all duration-200"
                aria-label="Email Nyong Noni UNIMA"
              >
                <Mail className="size-4.5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gold uppercase tracking-wider mb-4">
              Menu
            </h4>
            <ul className="space-y-3">
              {[
                { label: 'Tentang', href: '/about' },
                { label: 'Titleholders', href: '/titleholders' },
                { label: 'Finalis', href: '/finalists' },
                { label: 'Hall of Fame', href: '/hall-of-fame' },
                { label: 'Prestasi Alumni', href: '/alumni-achievements' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/70 hover:text-gold text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gold uppercase tracking-wider mb-4">
              Kontak
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="size-4 shrink-0 text-gold mt-0.5" />
                <span className="text-white/70 text-sm leading-relaxed">
                  Universitas Negeri Manado, Tondano, Sulawesi Utara
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="size-4 shrink-0 text-gold" />
                <a
                  href="mailto:nyongnoni@unima.ac.id"
                  className="text-white/70 hover:text-gold text-sm transition-colors"
                >
                  nyongnoni@unima.ac.id
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Instagram className="size-4 shrink-0 text-gold" />
                <a
                  href="https://instagram.com/nyongnoniunima"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-gold text-sm transition-colors"
                >
                  @nyongnoniunima
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/50 text-xs">
            &copy; {year} Nyong Noni UNIMA. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/about"
              className="text-white/50 hover:text-gold text-xs transition-colors"
            >
              Tentang
            </Link>
            <a
              href="https://unima.ac.id"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/50 hover:text-gold text-xs transition-colors"
            >
              UNIMA
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
