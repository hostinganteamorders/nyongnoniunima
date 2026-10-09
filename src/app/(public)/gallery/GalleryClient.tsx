'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { GalleryLightbox } from '@/components/gallery-lightbox'

interface GalleryItem {
  id: string
  title: string
  description?: string | null
  image_url: string
  category: string
  created_at?: string
  width?: number | null
  height?: number | null
}

interface GalleryClientProps {
  images: GalleryItem[]
}

export default function GalleryClient({ images }: GalleryClientProps) {
  const [activeTab, setActiveTab] = useState('All')
  const [yearFilter, setYearFilter] = useState('all')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const years = useMemo(() => {
    const set = new Set<string>()
    images.forEach((img) => {
      if (img.created_at) {
        const year = new Date(img.created_at).getFullYear().toString()
        set.add(year)
      }
    })
    return Array.from(set).sort((a, b) => Number(b) - Number(a))
  }, [images])

  const categories = useMemo(() => {
    const set = new Set<string>()
    images.forEach((img) => {
      if (img.category) set.add(img.category)
    })
    return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [images])

  const filteredImages = useMemo(() => {
    let result = images
    if (activeTab !== 'All') {
      result = result.filter((img) => img.category === activeTab)
    }
    if (yearFilter !== 'all') {
      result = result.filter((img) => {
        if (!img.created_at) return true
        return new Date(img.created_at).getFullYear().toString() === yearFilter
      })
    }
    return result
  }, [images, activeTab, yearFilter])

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  return (
    <div className="bg-white min-h-screen pb-[120px]">
      {/* ─── HERO ─── */}
      <section className="gradient-hero relative flex flex-col items-center justify-center pt-[180px] pb-[96px] px-[20px] text-center">
        <div className="max-w-4xl mx-auto">
          <p className="text-caption text-accent-light uppercase tracking-widest mb-4">Galeri</p>
          <h1 className="text-display-xxl text-white tracking-tighter mb-8 animate-fade-in">
            Dokumentasi <br />
            <span className="text-accent">Visual</span>
          </h1>
          <p className="text-subhead text-white/80 max-w-2xl mx-auto">
            Momen-momen terbaik dari perjalanan Nyong Noni UNIMA
          </p>
        </div>
      </section>

      {/* ─── CATEGORY TABS ─── */}
      <section className="py-[60px] border-b border-border">
        <div className="mx-auto max-w-7xl px-[20px]">
          <div className="flex flex-wrap gap-3 mb-6 justify-center">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-5 py-2.5 rounded-full text-body-sm font-medium transition-all duration-200 ${
                  activeTab === cat
                    ? 'bg-primary-blue text-white shadow-md'
                    : 'bg-light-gray text-dark-secondary hover:bg-border'
                }`}
              >
                {cat === 'All' ? 'Semua' : cat}
              </button>
            ))}
          </div>
          <div className="flex justify-center">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="bg-white border border-border rounded-lg px-4 py-2.5 text-body-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-blue/30"
            >
              <option value="all">Semua Tahun</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ─── PHOTOS GRID ─── */}
      <section className="py-[60px] bg-light-gray">
        <div className="mx-auto max-w-7xl px-[20px]">
          <div className="text-center mb-12">
            <h2 className="text-display-lg text-dark-text mb-2">
              {activeTab === 'All' ? 'Semua Foto' : activeTab}
            </h2>
            <p className="text-body text-dark-secondary">
              Menampilkan {filteredImages.length} foto
            </p>
          </div>

          {filteredImages.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-body-lg text-dark-secondary">Belum ada foto dalam kategori ini.</p>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
              {filteredImages.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => openLightbox(i)}
                  className="break-inside-avoid group relative rounded-xl overflow-hidden bg-white interactive-hover active-scale border border-border shadow-sm w-full"
                >
                  <Image
                    src={img.image_url}
                    alt={img.title}
                    width={img.width || 1600}
                    height={img.height || 1067}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 text-left">
                    <p className="text-headline text-white font-medium mb-1">{img.title}</p>
                    {img.description && (
                      <p className="text-body-sm text-white/80 line-clamp-2 leading-relaxed">{img.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {lightboxOpen && filteredImages.length > 0 && (
        <GalleryLightbox
          images={filteredImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  )
}
