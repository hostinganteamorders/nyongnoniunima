'use client'

import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export function PhotoPreview({
  src,
  onRemove,
  imgClassName = 'mt-2 max-h-96 w-full rounded-lg border border-border bg-white object-contain',
  alt = 'Pratinjau foto',
}: {
  src: string
  onRemove: () => void
  imgClassName?: string
  alt?: string
}) {
  if (!src) return null
  return (
    <div className="relative mt-2 inline-block max-w-full align-top">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className={imgClassName} />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="absolute right-2 top-2 rounded-md border border-border bg-white/95 text-red-600 shadow-sm hover:bg-white"
        onClick={onRemove}
      >
        <Trash2 className="mr-1 h-3.5 w-3.5" />
        Hapus foto
      </Button>
    </div>
  )
}
