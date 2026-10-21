export const STORAGE_BUCKETS = [
  'titleholders',
  'finalists',
  'gallery',
  'events',
  'news',
  'sponsors',
  'hall-of-fame',
  'alumni',
] as const

export type StorageBucketName = (typeof STORAGE_BUCKETS)[number]

export interface StorageFileRef {
  bucket: StorageBucketName
  path: string
}

function isValidRef(bucket: string, filePath: string): bucket is StorageBucketName {
  if (!(STORAGE_BUCKETS as readonly string[]).includes(bucket)) return false
  if (!filePath || filePath.includes('..')) return false
  if (filePath.startsWith('/')) return false
  return true
}

export function parseStorageUrl(url: string | null | undefined): StorageFileRef | null {
  if (!url) return null

  const publicMatch = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
  if (publicMatch) {
    const bucket = decodeURIComponent(publicMatch[1])
    const filePath = decodeURIComponent(publicMatch[2])
    if (!isValidRef(bucket, filePath)) return null
    return { bucket, path: filePath }
  }

  const localMatch = url.match(/^\/uploads\/([^/]+)\/([^/?#]+)$/)
  if (localMatch) {
    const bucket = decodeURIComponent(localMatch[1])
    const filePath = decodeURIComponent(localMatch[2])
    if (!isValidRef(bucket, filePath)) return null
    if (filePath.includes('/')) return null
    return { bucket, path: filePath }
  }

  return null
}
