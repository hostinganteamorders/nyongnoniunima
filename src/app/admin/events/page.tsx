import { getEvents } from '@/server/actions/content'
import { EventsClient } from './events-client'
import { isAuthError } from '@/lib/admin-error'
import { AdminLoginRequired } from '@/components/admin-login-required'

export default async function AdminEventsPage() {
  try {
    const events = await getEvents()
    return <EventsClient events={events as any[]} />
  } catch (error) {
    if (isAuthError(error)) return <AdminLoginRequired />
    throw error
  }
}
