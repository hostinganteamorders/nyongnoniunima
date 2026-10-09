import { getNews } from '@/server/actions/content'
import { NewsClient } from './news-client'
import { isAuthError } from '@/lib/admin-error'
import { AdminLoginRequired } from '@/components/admin-login-required'

export default async function AdminNewsPage() {
  try {
    const news = await getNews()
    return <NewsClient news={news as any[]} />
  } catch (error) {
    if (isAuthError(error)) return <AdminLoginRequired />
    throw error
  }
}
