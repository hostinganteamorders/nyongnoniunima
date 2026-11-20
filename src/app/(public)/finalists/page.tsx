import type { Metadata } from 'next'
import FinalistsClient from './FinalistsClient'

export const metadata: Metadata = {
  title: 'Finalis 2026',
  description: 'Kenali 24 finalis Nyong Noni UNIMA 2026 dan dukung favoritmu lewat QRIS.',
}

export default function FinalistsPage() {
  return <FinalistsClient />
}
