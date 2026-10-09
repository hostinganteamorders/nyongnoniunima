import { createClient } from '@/lib/supabase/client'
import { createSignedUpload, uploadLocalImage, type StorageBucket } from '@/server/actions/uploads'

export function isSupabaseMode(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  return url !== '' && url !== 'https://placeholder.supabase.co'
}

export async function ensureAdminSession(): Promise<boolean> {
  if (!isSupabaseMode()) return true
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  return !!data.session
}

export async function uploadToStorage(bucket: StorageBucket, file: File): Promise<{ url: string }> {
  if (isSupabaseMode()) {
    const signed = await createSignedUpload({ bucket, contentType: file.type })
    if ('error' in signed || !signed.path || !signed.token) {
      throw new Error('error' in signed && signed.error ? signed.error : 'Gagal menyiapkan unggahan')
    }

    const supabase = createClient()
    const { error } = await supabase.storage
      .from(bucket)
      .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type })
    if (error) throw error

    const { data } = supabase.storage.from(bucket).getPublicUrl(signed.path)
    return { url: data.publicUrl }
  }

  const fd = new FormData()
  fd.append('file', file)
  const res = await uploadLocalImage(fd, bucket)
  if (res && 'error' in res && res.error) throw new Error(String(res.error))
  if (!res || !('url' in res)) throw new Error('Gagal mengunggah foto')
  return { url: String(res.url) }
}
