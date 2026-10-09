import { getGallery } from '@/server/actions/content'
import { GalleryClient } from './gallery-client'
import { isAuthError } from '@/lib/admin-error'
import { AdminLoginRequired } from '@/components/admin-login-required'

export default async function AdminGalleryPage() {
  try {
    const gallery = await getGallery()
    return <GalleryClient gallery={gallery as any[]} />
  } catch (error) {
    if (isAuthError(error)) return <AdminLoginRequired />
    throw error
  }
}
