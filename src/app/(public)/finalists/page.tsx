import { getPublicFinalists } from '@/server/actions/finalists'
import FinalistsClient from './FinalistsClient'

export default async function FinalistsPage() {
  const finalists = await getPublicFinalists().catch(() => [])

  return <FinalistsClient finalists={finalists} />
}
export const dynamic = 'force-dynamic'
