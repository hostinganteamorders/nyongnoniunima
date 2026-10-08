import { getApplicantStats } from '@/server/actions/applicants'
import { getNews, getEvents } from '@/server/actions/content'
import { getAlumniAchievements, getTitleholders } from '@/server/actions/finalists'
import { getCurrentTitleholders } from '@/server/actions/unima'
import Link from 'next/link'
import { Users, UserCheck, Newspaper, Calendar, Award, Crown } from 'lucide-react'

export default async function AdminDashboard() {
  const [stats, news, events, alumni, titleholders, currentTitleholders] = await Promise.all([
    getApplicantStats().catch(() => ({ total: 0, pending: 0, verified: 0, rejected: 0, finalist: 0 })),
    getNews().catch(() => []),
    getEvents().catch(() => []),
    getAlumniAchievements().catch(() => []),
    getTitleholders().catch(() => []),
    getCurrentTitleholders().catch(() => []),
  ])

  const cards = [
    {
      label: 'Total Applicants',
      value: stats.total,
      icon: Users,
      href: '/admin/applicants',
      detail: `${stats.pending} pending · ${stats.verified} verified · ${stats.finalist} finalist`,
      iconBg: 'bg-primary-blue/10',
      iconColor: 'text-primary-blue',
    },
    {
      label: 'Total Finalists',
      value: stats.finalist,
      icon: UserCheck,
      href: '/admin/finalists',
      detail: `${stats.verified} verified applicants`,
      iconBg: 'bg-accent/20',
      iconColor: 'text-accent-dark',
    },
    {
      label: 'News',
      value: (news as any[]).length,
      icon: Newspaper,
      href: '/admin/news',
      detail: 'Manage news articles',
      iconBg: 'bg-primary-blue-light/15',
      iconColor: 'text-primary-blue-light',
    },
    {
      label: 'Events',
      value: (events as any[]).length,
      icon: Calendar,
      href: '/admin/events',
      detail: 'Manage events',
      iconBg: 'bg-primary-blue-dark/15',
      iconColor: 'text-primary-blue-dark',
    },
    {
      label: 'Alumni Achievements',
      value: (alumni as any[]).length,
      icon: Award,
      href: '/admin/alumni-achievements',
      detail: 'Alumni accomplishments',
      iconBg: 'bg-accent-light/40',
      iconColor: 'text-accent-dark',
    },
    {
      label: 'Titleholders',
      value: (titleholders as any[]).length + (currentTitleholders as any[]).length,
      icon: Crown,
      href: '/admin/titleholders',
      detail: `${(titleholders as any[]).length} past · ${(currentTitleholders as any[]).length} current`,
      iconBg: 'bg-primary-blue/5',
      iconColor: 'text-primary-blue',
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-display-md text-dark-text">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Welcome to the Nyong Noni UNIMA admin panel
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.href} href={card.href}>
              <div className="group cursor-pointer rounded-xl border border-border bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-4 flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.iconBg}`}>
                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                </div>
                <div className="text-3xl font-bold text-dark-text">{card.value}</div>
                <div className="mt-1 text-sm font-medium text-dark-text">{card.label}</div>
                <p className="mt-0.5 text-xs text-muted">{card.detail}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
