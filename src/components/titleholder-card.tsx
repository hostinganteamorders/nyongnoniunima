import Image from 'next/image'
import { Instagram, GraduationCap, BookOpen, Quote } from 'lucide-react'
import { genderBadge, shortGelar, titleLabel } from '@/lib/titleholders'

interface TitleholderCardProps {
  item: {
    title: string
    name: string
    faculty?: string | null
    study_program?: string | null
    photo_url?: string | null
    instagram?: string | null
    biography?: string | null
  }
  showGelar?: boolean
  gelarShort?: boolean
}

export function TitleholderCard({ item, showGelar, gelarShort }: TitleholderCardProps) {
  return (
    <div className="bg-white rounded-[20px] border border-border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      {/* Photo */}
      <div className="relative aspect-[3/4] overflow-hidden bg-light-gray">
        {item.photo_url ? (
          <Image
            src={item.photo_url}
            alt={item.name}
            fill
            className="object-cover transition-transform duration-500 hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-blue/5 to-accent/5">
            <span className="text-display-xl text-primary-blue/20 font-bold">
              {item.name?.charAt(0) || '?'}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5">
        {showGelar ? (
          <div className="mb-2 inline-block px-2 py-0.5 rounded-md bg-primary-blue/10 text-primary-blue text-[10px] font-semibold uppercase tracking-widest">
            {gelarShort ? shortGelar(item.title) : titleLabel(item.title)}
          </div>
        ) : (
          <div className="mb-2 inline-flex items-center px-2 py-0.5 rounded-md bg-light-gray text-[10px] font-semibold uppercase tracking-widest text-dark-secondary">
            {genderBadge(item.title)}
          </div>
        )}
        <h3 className="text-headline text-dark-text mb-1">{item.name}</h3>

        {item.faculty && (
          <p className="flex items-center gap-1.5 text-body-sm text-dark-secondary mb-1">
            <GraduationCap className="h-4 w-4 shrink-0" />
            {item.faculty}
          </p>
        )}
        {item.study_program && (
          <p className="flex items-center gap-1.5 text-body-sm text-dark-secondary mb-3">
            <BookOpen className="h-4 w-4 shrink-0" />
            {item.study_program}
          </p>
        )}

        {item.instagram && (
          <a
            href={`https://instagram.com/${item.instagram.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-body-sm text-primary-blue hover:opacity-80 transition-opacity mb-3"
          >
            <Instagram className="h-4 w-4" />
            @{item.instagram}
          </a>
        )}

        {item.biography && (
          <p className="text-body-sm text-dark-secondary italic leading-relaxed border-t border-border pt-3 mt-3">
            <Quote className="h-3.5 w-3.5 text-dark-secondary/30 inline mr-1" />
            {item.biography}
          </p>
        )}
      </div>
    </div>
  )
}
