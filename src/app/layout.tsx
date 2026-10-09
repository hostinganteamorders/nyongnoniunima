import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Portal Resmi Nyong Noni UNIMA',
    template: '%s | Nyong Noni UNIMA',
  },
  description: 'Portal resmi Nyong & Noni Universitas Negeri Manado — Wadah pengembangan mahasiswa dalam kepemimpinan, budaya, pariwisata, dan prestasi akademik.',
  openGraph: {
    title: 'Portal Resmi Nyong Noni UNIMA',
    description: 'Portal resmi Nyong & Noni Universitas Negeri Manado.',
    type: 'website',
    locale: 'id_ID',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="min-h-screen bg-white text-dark-text font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
