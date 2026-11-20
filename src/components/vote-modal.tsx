'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Heart, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GENDER_LABEL, type Finalist2026 } from '@/lib/finalists-2026'
import { VOTE_PRICE_IDR } from '@/lib/site-config'

export function VoteButton({
  finalist,
  className,
  children,
}: {
  finalist: Finalist2026
  className?: string
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, close])

  const price = `Rp${VOTE_PRICE_IDR.toLocaleString('id-ID')}`

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gold px-5 text-sm font-bold text-navy transition-colors hover:bg-accent-light',
          className,
        )}
      >
        {children ?? (
          <>
            <Heart className="size-4" aria-hidden /> Vote
          </>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-navy/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`vote-title-${finalist.no}`}
            className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label="Tutup"
              className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-chip text-navy transition-colors hover:bg-line"
            >
              <X className="size-5" />
            </button>

            <p className="text-xs font-semibold uppercase tracking-widest text-gold-deep">
              Vote Finalis 2026 · No. {finalist.no}
            </p>
            <h2 id={`vote-title-${finalist.no}`} className="mt-1 pr-12 font-serif text-2xl font-semibold text-navy">
              {finalist.name}
            </h2>
            <p className="text-sm text-dark-secondary">
              {GENDER_LABEL[finalist.gender]} · {finalist.faculty}
            </p>

            <div className="mt-5 rounded-2xl border border-line bg-ivory p-4 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={finalist.qris}
                alt={`Kode QRIS untuk ${finalist.name}`}
                width={520}
                height={520}
                className="mx-auto aspect-square w-full max-w-[300px] rounded-xl bg-white object-contain"
              />
              <p className="mt-3 text-xs font-semibold tracking-wide text-navy">
                QRIS · NYONG NONI UNIMA {finalist.no}
              </p>
              <p className="text-xs text-dark-secondary">NMID {finalist.nmid}</p>
            </div>

            <p className="mt-4 rounded-xl bg-navy px-4 py-3 text-center text-sm font-semibold text-white">
              {price} = 1 suara
            </p>
            <p className="mt-3 text-center text-xs leading-relaxed text-dark-secondary">
              Pindai kode QRIS di atas dengan aplikasi bank atau e-wallet. Kamu bisa bayar lebih dari satu kali
              untuk menambah jumlah suara.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
