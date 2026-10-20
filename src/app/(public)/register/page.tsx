import Link from 'next/link'
import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SyaratKetentuan } from '@/components/syarat-ketentuan'
import { isRegistrationOpen } from '@/server/actions/unima'
import { RegisterForm } from './register-form'

export default async function RegisterPage() {
  const open = await isRegistrationOpen()

  return (
    <div className="min-h-screen bg-light-gray pb-section">
      {/* Hero */}
      <section className="gradient-hero relative overflow-hidden pt-24 pb-16 px-4 text-center">
        <div className="absolute inset-0 bg-[url('/hero-pattern.svg')] opacity-5" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-display-xl text-white font-bold mb-4">Pendaftaran</h1>
          <p className="text-body-lg text-white/80 max-w-2xl mx-auto">
            {open
              ? 'Daftarkan dirimu untuk menjadi duta mahasiswa Nyong Noni UNIMA berikutnya.'
              : 'Pendaftaran belum dibuka. Nantikan pengumuman resmi segera.'}
          </p>
        </div>
      </section>

      {open ? (
        <RegisterForm />
      ) : (
        <section className="py-12">
          <div className="mx-auto max-w-3xl px-4">
            <div className="bg-white rounded-xxl border border-border shadow-sm p-6 md:p-12 text-center space-y-5">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-blue/10 border border-primary-blue/20">
                <Clock className="h-8 w-8 text-primary-blue" />
              </div>
              <h2 className="text-display-md text-dark-text">Coming Soon</h2>
              <p className="text-body text-dark-secondary max-w-lg mx-auto">
                Pendaftaran Nyong Noni UNIMA saat ini sedang ditutup. Pantau terus website
                resmi dan media sosial kami untuk informasi jadwal pembukaan pendaftaran
                berikutnya.
              </p>
              <div className="pt-2">
                <Link href="/">
                  <Button variant="primary" className="bg-primary-blue text-white hover:bg-primary-blue-dark h-12 px-8">
                    Kembali ke Beranda
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <SyaratKetentuan />
    </div>
  )
}
