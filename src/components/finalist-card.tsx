import Image from 'next/image'
import Link from 'next/link'
import { GENDER_LABEL, type Finalist2026 } from '@/lib/finalists-2026'
import { VoteButton } from '@/components/vote-modal'

export function FinalistCard({ finalist }: { finalist: Finalist2026 }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-white transition-shadow hover:shadow-lg">
      <Link href={`/finalists/${finalist.no}`} className="relative block aspect-[3/4] overflow-hidden bg-chip">
        <Image
          src={finalist.photo}
          alt={`Foto ${finalist.name}`}
          fill
          sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-navy/90 px-3 py-1 text-xs font-bold text-gold">
          {finalist.no}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-navy">
          {GENDER_LABEL[finalist.gender]}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-serif text-lg font-semibold leading-tight text-navy">{finalist.name}</h3>
          <p className="mt-0.5 text-sm text-dark-secondary">{finalist.faculty}</p>
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2">
          <Link
            href={`/finalists/${finalist.no}`}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-navy/20 text-sm font-semibold text-navy transition-colors hover:bg-chip"
          >
            Profil
          </Link>
          <VoteButton finalist={finalist} />
        </div>
      </div>
    </article>
  )
}
