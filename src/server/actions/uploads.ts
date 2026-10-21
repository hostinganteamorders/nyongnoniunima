'use server'

import path from 'node:path'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { requireAdmin, getAdminClient } from '@/lib/supabase/admin'
import { isUsingLocalDb } from '@/lib/db/local'
import { UPLOAD_IMAGE_TYPES } from '@/lib/image-types'
import { parseStorageUrl } from '@/lib/storage-url'

export type StorageBucket =
  | 'titleholders'
  | 'finalists'
  | 'gallery'
  | 'events'
  | 'news'
  | 'sponsors'
  | 'hall-of-fame'
  | 'alumni'

function imageValidationError(bucket: StorageBucket, contentType: string): string | null {
  if (bucket === 'finalists') {
    return contentType === 'image/png' ? null : 'Hanya file PNG yang diizinkan'
  }
  return UPLOAD_IMAGE_TYPES[contentType]
    ? null
    : 'Hanya gambar JPG, PNG, WebP, atau AVIF yang diizinkan'
}

function extensionFor(bucket: StorageBucket, contentType: string): string {
  return bucket === 'finalists' ? 'png' : UPLOAD_IMAGE_TYPES[contentType]
}

export async function createSignedUpload(input: { bucket: StorageBucket; contentType: string }) {
  await requireAdmin()

  const invalid = imageValidationError(input.bucket, input.contentType)
  if (invalid) return { error: invalid }

  if (isUsingLocalDb()) return { error: 'Unggahan langsung hanya tersedia dengan Supabase' }

  const path_ = `${crypto.randomUUID()}.${extensionFor(input.bucket, input.contentType)}`
  const { data, error } = await getAdminClient()
    .storage.from(input.bucket)
    .createSignedUploadUrl(path_)
  if (error || !data?.token) return { error: error?.message || 'Gagal menyiapkan unggahan' }

  return { path: path_, token: data.token }
}

export async function uploadLocalImage(formData: FormData, bucket: StorageBucket) {
  await requireAdmin()

  const file = formData.get('file') as File | null
  if (!file) return { error: 'File tidak ditemukan' }

  const invalid = imageValidationError(bucket, file.type)
  if (invalid) return { error: invalid }

  const buffer = Buffer.from(await file.arrayBuffer())
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', bucket)
  await mkdir(uploadDir, { recursive: true })
  const filename = `${crypto.randomUUID()}.${extensionFor(bucket, file.type)}`
  await writeFile(path.join(uploadDir, filename), buffer)
  return { url: `/uploads/${bucket}/${filename}` }
}

export async function removeStorageFile(url: string) {
  await requireAdmin()

  const ref = parseStorageUrl(url)
  if (!ref) return { ok: true as const }

  if (isUsingLocalDb()) {
    if (ref.path.includes('/')) return { ok: true as const }
    try {
      await unlink(path.join(process.cwd(), 'public', 'uploads', ref.bucket, ref.path))
    } catch {
      // file mungkin sudah tidak ada — abaikan
    }
    return { ok: true as const }
  }

  const { error } = await getAdminClient().storage.from(ref.bucket).remove([ref.path])
  if (error) return { error: error.message }
  return { ok: true as const }
}
