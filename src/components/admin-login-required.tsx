import Link from 'next/link'
import { LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AdminLoginRequired() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white p-12 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary-blue/10">
        <LogIn className="size-6 text-primary-blue" />
      </span>
      <h2 className="text-headline text-dark-text">Silakan login</h2>
      <p className="mt-2 max-w-md text-body-sm text-muted">
        Sesi admin tidak ditemukan. Silakan login terlebih dahulu untuk melihat data di halaman ini.
      </p>
      <Button asChild className="mt-6">
        <Link href="/admin/login">Ke Halaman Login</Link>
      </Button>
    </div>
  )
}
