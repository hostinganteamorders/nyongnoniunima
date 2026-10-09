'use server'

import { requireAdmin, getAdminClient } from '@/lib/supabase/admin'
import { isUsingLocalDb } from '@/lib/db/local'
import { UPLOAD_IMAGE_TYPES } from '@/lib/image-types'

export type StorageBucket = 'titleholders' | 'finalists' | 'gallery'

export async function createSignedUpload(input: { bucket: StorageBucket; contentType: string }) {
  await requireAdmin()

  if (input.bucket === 'finalists') {
    if (input.contentType !== 'image/png') return { error: 'Hanya file PNG yang diizinkan' }
  } else if (!UPLOAD_IMAGE_TYPES[input.contentType]) {
    return { error: 'Hanya gambar JPG, PNG, WebP, atau AVIF yang diizinkan' }
  }

  if (isUsingLocalDb()) return { error: 'Unggahan langsung hanya tersedia dengan Supabase' }

  const ext = input.bucket === 'finalists' ? 'png' : UPLOAD_IMAGE_TYPES[input.contentType]
  const path = `${crypto.randomUUID()}.${ext}`

  const { data, error } = await getAdminClient().storage.from(input.bucket).createSignedUploadUrl(path)
  if (error || !data?.token) return { error: error?.message || 'Gagal menyiapkan unggahan' }

  return { path, token: data.token }
}
