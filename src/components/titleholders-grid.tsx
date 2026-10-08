import { TitleholderCard } from '@/components/titleholder-card'
import { GENDER_TITLES, isCombinedTitle } from '@/lib/titleholders'

function ColumnHeader({ label, highlight }: { label: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className={`h-px flex-1 ${highlight ? 'bg-accent/30' : 'bg-hairline'}`} />
      <span
        className={`text-[13px] font-bold uppercase tracking-[0.15em] px-4 py-1.5 rounded-full ${
          highlight
            ? 'text-accent-dark bg-accent/10 border border-accent/20'
            : 'text-dark-secondary bg-white border border-border'
        }`}
      >
        {label}
      </span>
      <div className={`h-px flex-1 ${highlight ? 'bg-accent/30' : 'bg-hairline'}`} />
    </div>
  )
}

export function TitleholdersGrid({ titleholders }: { titleholders: any[] }) {
  const nyong = GENDER_TITLES.nyong
    .map((t) => titleholders.find((th: any) => th.title === t))
    .filter(Boolean)
  const noni = GENDER_TITLES.noni
    .map((t) => titleholders.find((th: any) => th.title === t))
    .filter(Boolean)
  const combined = titleholders.filter((th: any) => isCombinedTitle(th.title))

  return (
    <div className="space-y-16">
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <ColumnHeader label="Nyong" />
          <div className="flex flex-col gap-6">
            {nyong.map((th: any) => (
              <TitleholderCard key={th.id} item={th} showGelar gelarShort />
            ))}
          </div>
        </div>
        <div>
          <ColumnHeader label="Noni" />
          <div className="flex flex-col gap-6">
            {noni.map((th: any) => (
              <TitleholderCard key={th.id} item={th} showGelar gelarShort />
            ))}
          </div>
        </div>
      </div>

      {combined.length > 0 && (
        <div>
          <ColumnHeader label="Nyong Noni" highlight />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {combined.map((th: any) => (
              <TitleholderCard key={th.id} item={th} showGelar />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
