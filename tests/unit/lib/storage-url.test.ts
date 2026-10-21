import { describe, it, expect } from 'vitest'
import { parseStorageUrl, STORAGE_BUCKETS } from '@/lib/storage-url'

describe('parseStorageUrl', () => {
  const supabaseBase = 'https://proj.supabase.co/storage/v1/object/public'

  it('parse URL publik Supabase', () => {
    expect(parseStorageUrl(`${supabaseBase}/sponsors/abc-123.webp`)).toEqual({
      bucket: 'sponsors',
      path: 'abc-123.webp',
    })
  })

  it('parse URL lokal /uploads', () => {
    expect(parseStorageUrl('/uploads/news/xyz.png')).toEqual({
      bucket: 'news',
      path: 'xyz.png',
    })
  })

  it('tolak bucket di luar daftar', () => {
    expect(parseStorageUrl(`${supabaseBase}/avatars/x.png`)).toBeNull()
    expect(parseStorageUrl('/uploads/avatars/x.png')).toBeNull()
  })

  it('tolak path traversal', () => {
    expect(parseStorageUrl(`${supabaseBase}/news/../../secret`)).toBeNull()
    expect(parseStorageUrl('/uploads/news/..%2Fsecret.png')).toBeNull()
  })

  it('tolak path bersarang untuk unggahan lokal', () => {
    expect(parseStorageUrl('/uploads/news/a/b.png')).toBeNull()
  })

  it('no-op untuk aset publik dan URL eksternal', () => {
    expect(parseStorageUrl('/images/orders.png')).toBeNull()
    expect(parseStorageUrl('https://example.com/logo.png')).toBeNull()
    expect(parseStorageUrl('')).toBeNull()
    expect(parseStorageUrl(null)).toBeNull()
    expect(parseStorageUrl(undefined)).toBeNull()
  })

  it('decode URL-encoded path', () => {
    expect(parseStorageUrl(`${supabaseBase}/hall-of-fame/foto%20nyong.png`)).toEqual({
      bucket: 'hall-of-fame',
      path: 'foto nyong.png',
    })
  })

  it('bucket list mencakup semua bucket upload', () => {
    expect([...STORAGE_BUCKETS].sort()).toEqual(
      ['alumni', 'events', 'finalists', 'gallery', 'hall-of-fame', 'news', 'sponsors', 'titleholders'].sort(),
    )
  })
})
