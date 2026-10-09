import { describe, it, expect, vi } from 'vitest'
import { isNetworkError, friendlyUploadError, withNetworkRetry } from '@/lib/uploads'

describe('isNetworkError', () => {
  it('mengenali TypeError fetch gagal (Chrome)', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true)
  })

  it('mengenali pesan jaringan lain', () => {
    expect(isNetworkError(new Error('NetworkError when attempting to fetch resource.'))).toBe(true)
    expect(isNetworkError(new Error('Load failed'))).toBe(true)
    expect(isNetworkError(new Error('The network connection was lost'))).toBe(true)
    expect(isNetworkError(new DOMException('The user aborted a request.', 'AbortError'))).toBe(true)
  })

  it('menolak error validasi biasa', () => {
    expect(isNetworkError(new Error('Hanya file PNG yang diizinkan'))).toBe(false)
    expect(isNetworkError(new Error('Cannot read properties of undefined'))).toBe(false)
    expect(isNetworkError('boleh string')).toBe(false)
  })
})

describe('friendlyUploadError', () => {
  it('menerjemahkan error jaringan ke pesan ramah', () => {
    const friendly = friendlyUploadError(new TypeError('Failed to fetch'))
    expect(friendly.message).toBe(
      'Koneksi gagal saat mengunggah — periksa internet Anda lalu coba lagi.',
    )
  })

  it('mempertahankan pesan error asli non-jaringan', () => {
    const original = new Error('Hanya file PNG yang diizinkan')
    expect(friendlyUploadError(original)).toBe(original)
  })

  it('membungkus nilai non-Error', () => {
    expect(friendlyUploadError('oops').message).toBe('oops')
  })
})

describe('withNetworkRetry', () => {
  it('mencoba ulang sekali saat error jaringan lalu berhasil', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce('ok')
    await expect(withNetworkRetry(fn)).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('tidak mengulang error non-jaringan', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Hanya file PNG yang diizinkan'))
    await expect(withNetworkRetry(fn)).rejects.toThrow('Hanya file PNG yang diizinkan')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('melempar error jaringan terakhir setelah semua percobaan gagal', async () => {
    const fn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(withNetworkRetry(fn)).rejects.toThrow('Failed to fetch')
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
