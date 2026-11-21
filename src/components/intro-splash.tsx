'use client'

import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'nn-intro-seen'
const HOLD_MS = 3400 // lama intro tampil sebelum memudar
const FADE_MS = 700

// Intro pembuka: hanya tampil di kunjungan pertama (per browser). Kunjungan berikutnya
// disembunyikan sejak sebelum render oleh skrip kecil di <head> (kelas "intro-seen" pada <html>),
// jadi tidak ada kedipan layar navy.
export function IntroSplash() {
  const [phase, setPhase] = useState<'show' | 'out' | 'done'>('show')

  const finish = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {}
    setPhase('out')
  }, [])

  useEffect(() => {
    let seen = false
    try {
      seen = localStorage.getItem(STORAGE_KEY) === '1'
    } catch {}
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (seen || reduce) {
      try {
        localStorage.setItem(STORAGE_KEY, '1')
      } catch {}
      setPhase('done')
      return
    }

    document.body.style.overflow = 'hidden'
    const t = setTimeout(finish, HOLD_MS)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [finish])

  useEffect(() => {
    if (phase !== 'out') return
    document.body.style.overflow = ''
    const t = setTimeout(() => setPhase('done'), FADE_MS)
    return () => clearTimeout(t)
  }, [phase])

  if (phase === 'done') return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Selamat datang di Nyong Noni UNIMA"
      className="intro-overlay fixed inset-0 z-[200] flex flex-col items-center justify-center bg-navy px-6 text-center"
      style={{
        opacity: phase === 'out' ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: phase === 'out' ? 'none' : 'auto',
      }}
    >
      <div className="diamond-pattern absolute inset-0 opacity-30" aria-hidden />

      <Image
        src="/images/logo-nyong-noni-unima.png"
        alt=""
        width={720}
        height={796}
        priority
        className="intro-logo relative h-28 w-auto brightness-0 invert sm:h-36"
      />
      <h1 className="intro-title relative mt-8 font-serif text-4xl font-semibold text-white sm:text-6xl">
        Nyong &amp; Noni <span className="text-gold">UNIMA</span>
      </h1>
      <div className="intro-line relative mt-6 h-px w-40 bg-gold sm:w-64" aria-hidden />
      <div className="intro-tagline relative mt-8 inline-flex items-center gap-2.5 text-xs text-white/70 sm:text-sm">
        Powered by
        <span className="inline-flex items-center rounded-full bg-white px-3 py-1.5">
          <Image src="/images/orders.png" alt="ORDERS" width={1000} height={353} className="h-5 w-auto sm:h-6" />
        </span>
      </div>

      <button
        type="button"
        onClick={finish}
        className="absolute right-5 top-5 inline-flex min-h-11 items-center rounded-full border border-white/30 px-5 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10"
      >
        Lewati
      </button>
    </div>
  )
}
