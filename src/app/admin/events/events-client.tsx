'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, X, Search, Upload } from 'lucide-react'
import { createEvent, deleteEvent } from '@/server/actions/content'
import { uploadToStorage, ensureAdminSession } from '@/lib/uploads'
import { useRouter } from 'next/navigation'

interface EventItem {
  id: string
  title: string
  slug: string
  description: string
  date: string
  location: string
  category: string
  image_url: string
  published: number | boolean
}

const EVENT_CATEGORIES = ['Audisi', 'Karantina', 'Grand Final', 'Kegiatan Sosial', 'Promosi Wisata']

export function EventsClient({ events }: { events: EventItem[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [form, setForm] = useState({ title: '', slug: '', description: '', date: '', location: '', category: 'Kegiatan Sosial', image_url: '', published: false })

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const filtered = events.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.location.toLowerCase().includes(search.toLowerCase()),
  )

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    if (!(await ensureAdminSession())) {
      setNotification({ type: 'error', message: 'Silakan login terlebih dahulu' })
      setLoading(false)
      return
    }
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)))
      const res = await createEvent(fd)
      if (res?.error) throw new Error(res.error)
      setNotification({ type: 'success', message: 'Acara berhasil ditambahkan' })
      setShowAdd(false)
      setForm({ title: '', slug: '', description: '', date: '', location: '', category: 'Kegiatan Sosial', image_url: '', published: false })
      router.refresh()
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error && err.message ? err.message : 'Gagal menambahkan acara' })
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const file = input.files?.[0]
    if (!file) return
    if (!(await ensureAdminSession())) {
      setNotification({ type: 'error', message: 'Silakan login terlebih dahulu' })
      input.value = ''
      return
    }
    setUploading(true)
    try {
      const { url } = await uploadToStorage('events', file)
      setForm((prev) => ({ ...prev, image_url: url }))
      setNotification({ type: 'success', message: 'Gambar berhasil diunggah' })
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error && err.message ? err.message : 'Gagal mengunggah gambar' })
    } finally {
      setUploading(false)
      input.value = ''
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus acara ini?')) return
    try {
      await deleteEvent(id)
      setNotification({ type: 'success', message: 'Acara berhasil dihapus' })
      router.refresh()
    } catch {
      setNotification({ type: 'error', message: 'Gagal menghapus acara' })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-dark-text">Acara</h1>
        <Button onClick={() => setShowAdd(true)}><Plus className="mr-2 h-4 w-4" />Tambah Acara</Button>
      </div>

      {notification && (
        <div className={`mb-4 rounded-lg p-3 text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {notification.message}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Daftar Acara</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input placeholder="Cari acara..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted">{search ? 'Tidak ada hasil' : 'Belum ada acara'}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="pb-3 font-medium">Judul</th>
                    <th className="pb-3 font-medium hidden md:table-cell">Tanggal</th>
                    <th className="pb-3 font-medium hidden lg:table-cell">Lokasi</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-b border-border/50 hover:bg-gray-50/50">
                      <td className="py-3 font-medium">{item.title}</td>
                      <td className="py-3 text-muted hidden md:table-cell text-xs">{item.date}</td>
                      <td className="py-3 text-muted hidden lg:table-cell">{item.location}</td>
                      <td className="py-3">
                        <Badge variant={item.published ? 'success' : 'warning'}>
                          {item.published ? 'Published' : 'Draft'}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Tambah Acara</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowAdd(false)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="space-y-4">
                <div><Label>Judul</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Slug</Label><Input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
                <div><Label>Deskripsi</Label><textarea required className="flex h-20 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Tanggal</Label><Input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                  <div><Label>Lokasi</Label><Input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Kategori</Label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-body-sm text-dark-text"
                    >
                      {EVENT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Unggah Gambar</Label>
                    <div className="flex items-center gap-2">
                      <Input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={handleFileChange} disabled={uploading} className="flex-1" />
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted">
                        <Upload className="h-4 w-4" />
                      </span>
                    </div>
                    {uploading && <p className="mt-1 text-xs text-muted">Mengunggah...</p>}
                    {form.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.image_url} alt="Pratinjau" className="mt-2 max-h-96 w-full rounded-lg border border-border bg-white object-contain" />
                    )}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
                  Publikasikan
                </label>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
