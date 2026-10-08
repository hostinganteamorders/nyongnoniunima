'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface FinalistCardData {
  id: string
  full_name: string
  city?: string
  faculty?: string
  study_program?: string
  photo_url: string | null
  umur: number | null
}

interface Props {
  items: FinalistCardData[]
  speed?: number
}

export function FinalistsCarousel({ items, speed = 0.4 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)
  const currentXRef = useRef(0)
  const isPausedRef = useRef(false)
  const isDraggingRef = useRef(false)
  const dragStartXRef = useRef(0)
  const dragStartPosRef = useRef(0)
  const lastTimeRef = useRef(performance.now())

  const duplicated = [...items, ...items]

  const animate = useCallback((time: number) => {
    const delta = time - lastTimeRef.current
    lastTimeRef.current = time

    if (!isPausedRef.current && !isDraggingRef.current) {
      currentXRef.current -= speed * (delta / 16.67)

      if (containerRef.current) {
        const halfWidth = containerRef.current.scrollWidth / 2
        if (Math.abs(currentXRef.current) >= halfWidth) {
          currentXRef.current = 0
        }
        containerRef.current.style.transform = `translateX(${currentXRef.current}px)`
      }
    }

    animationRef.current = requestAnimationFrame(animate)
  }, [speed])

  useEffect(() => {
    lastTimeRef.current = performance.now()
    animationRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationRef.current)
  }, [animate])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = true
    dragStartXRef.current = e.clientX
    dragStartPosRef.current = currentXRef.current
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing'
      containerRef.current.setPointerCapture(e.pointerId)
    }
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return
    const deltaX = e.clientX - dragStartXRef.current
    currentXRef.current = dragStartPosRef.current + deltaX
    containerRef.current.style.transform = `translateX(${currentXRef.current}px)`
    containerRef.current.style.transition = 'none'
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = false
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab'
      containerRef.current.releasePointerCapture(e.pointerId)
    }
  }, [])

  const handlePointerLeave = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  if (!items.length) return null

  return (
    <div className="relative w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 md:w-32 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 md:w-32 bg-gradient-to-l from-white to-transparent" />

      <div
        ref={containerRef}
        className="flex gap-5 md:gap-6 cursor-grab select-none"
        style={{ willChange: 'transform' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onMouseEnter={() => { isPausedRef.current = true }}
        onMouseLeave={() => { isPausedRef.current = false }}
        role="region"
        aria-label="Nyong Noni UNIMA Finalists"
        aria-roledescription="carousel"
      >
        {duplicated.map((item, idx) => (
          <Link
            key={`${item.id}-${idx}`}
            href={`/finalists/${item.id}`}
            className="group relative flex-shrink-0 w-[220px] sm:w-[260px] md:w-[280px] h-[340px] sm:h-[380px] md:h-[420px] rounded-xxl overflow-hidden shadow-md hover:shadow-xl transition-shadow"
          >
            {item.photo_url ? (
              <Image
                src={item.photo_url}
                alt={item.full_name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                sizes="(max-width: 640px) 220px, (max-width: 768px) 260px, 280px"
              />
            ) : (
              <div className="absolute inset-0 gradient-blue flex items-center justify-center">
                <span className="text-6xl text-white/30 font-bold">{item.full_name.charAt(0)}</span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-accent mb-1.5">
                Finalist 2026
              </p>
              <h3 className="text-headline text-white font-bold leading-tight">
                {item.full_name}
              </h3>
              {item.faculty && (
                <p className="text-sm text-white/70 mt-1">{item.faculty}</p>
              )}
            </div>

            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
