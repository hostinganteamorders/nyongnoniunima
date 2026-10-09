import { createClient } from '@/lib/supabase/client'
import { createSignedUpload, uploadLocalImage, type StorageBucket } from '@/server/actions/uploads'

const NETWORKISH = /failed to fetch|networkerror|network error|load failed|fetch failed|network connection|aborted/i

export function isNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '')
  return NETWORKISH.test(msg)
}

export function friendlyUploadError(err: unknown): Error {
  if (isNetworkError(err)) {
    return new Error('Koneksi gagal saat mengunggah — periksa internet Anda lalu coba lagi.')
  }
  if (err instanceof Error) return err
  return new Error(String(err))
}

export async function withNetworkRetry<T>(fn: () => Promise<T>, tries = 2): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (!isNetworkError(err) || attempt === tries - 1) throw err
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)))
    }
  }
  throw lastError
}

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

async function doUpload(bucket: StorageBucket, file: File): Promise<{ url: string }> {
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

export async function uploadToStorage(bucket: StorageBucket, file: File): Promise<{ url: string }> {
  try {
    return await withNetworkRetry(() => doUpload(bucket, file))
  } catch (err) {
    console.error('[uploadToStorage]', bucket, err)
    throw friendlyUploadError(err)
  }
}
