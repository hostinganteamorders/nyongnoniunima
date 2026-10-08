'use client'

import { useState, useEffect } from 'react'

interface CountdownProps {
  targetDate: string
  className?: string
}

function calculateTimeLeft(target: Date) {
  const diff = target.getTime() - Date.now()
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

export function Countdown({ targetDate, className = '' }: CountdownProps) {
  const target = new Date(targetDate)
  const [timeLeft, setTimeLeft] = useState<ReturnType<typeof calculateTimeLeft>>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setTimeLeft(calculateTimeLeft(target))
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(target))
    }, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  if (!mounted) return null
  if (!timeLeft) return null

  const items = [
    { value: timeLeft.days, label: 'Days' },
    { value: timeLeft.hours, label: 'Hours' },
    { value: timeLeft.minutes, label: 'Minutes' },
    { value: timeLeft.seconds, label: 'Seconds' },
  ]

  return (
    <div className={`flex items-center justify-center gap-4 sm:gap-6 ${className}`}>
      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center">
          <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-xl bg-white/10 backdrop-blur border border-white/20">
            <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
              {String(item.value).padStart(2, '0')}
            </span>
          </div>
          <span className="mt-2 text-xs font-medium uppercase tracking-wider text-accent">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}
