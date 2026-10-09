'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, X, Search, LayoutGrid, List, Upload } from 'lucide-react'
import { createGalleryItem, deleteGalleryItem } from '@/server/actions/content'
import { uploadToStorage, ensureAdminSession } from '@/lib/uploads'
import { useRouter } from 'next/navigation'

interface GalleryItem {
  id: string
  title: string
  description: string
  image_url: string
  category: string
  created_at: string
}

export function GalleryClient({ gallery }: { gallery: GalleryItem[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [form, setForm] = useState({ title: '', description: '', image_url: '', category: '' })

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const filtered = gallery.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()),
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
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      await createGalleryItem(fd)
      setNotification({ type: 'success', message: 'Foto berhasil ditambahkan' })
      setShowAdd(false)
      setForm({ title: '', description: '', image_url: '', category: '' })
      router.refresh()
    } catch {
      setNotification({ type: 'error', message: 'Gagal menambahkan foto' })
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
      const { url } = await uploadToStorage('gallery', file)
      setForm((prev) => ({ ...prev, image_url: url }))
      setNotification({ type: 'success', message: 'Foto berhasil diunggah' })
    } catch (err) {
      setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Gagal mengunggah foto' })
    } finally {
      setUploading(false)
      input.value = ''
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus foto ini?')) return
    try {
      await deleteGalleryItem(id)
      setNotification({ type: 'success', message: 'Foto berhasil dihapus' })
      router.refresh()
    } catch {
      setNotification({ type: 'error', message: 'Gagal menghapus foto' })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-dark-text">Galeri</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}>
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          </Button>
          <Button onClick={() => setShowAdd(true)}><Plus className="mr-2 h-4 w-4" />Tambah Foto</Button>
        </div>
      </div>

      {notification && (
        <div className={`mb-4 rounded-lg p-3 text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {notification.message}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Daftar Galeri</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input placeholder="Cari foto..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted">{search ? 'Tidak ada hasil' : 'Belum ada foto'}</div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((item) => (
                <div key={item.id} className="group relative rounded-lg overflow-hidden border border-border">
                  <div className="aspect-[4/3] bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center overflow-hidden">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-3xl">📸</span>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted">{item.category}</p>
                  </div>
                  <button
                    className="absolute top-2 right-2 rounded-full bg-red-600 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="pb-3 font-medium">Judul</th>
                    <th className="pb-3 font-medium hidden md:table-cell">Kategori</th>
                    <th className="pb-3 font-medium hidden lg:table-cell">Deskripsi</th>
                    <th className="pb-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-b border-border/50 hover:bg-gray-50/50">
                      <td className="py-3 font-medium">{item.title}</td>
                      <td className="py-3 text-muted hidden md:table-cell">{item.category}</td>
                      <td className="py-3 text-muted hidden lg:table-cell text-xs truncate max-w-xs">{item.description}</td>
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
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Tambah Foto</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowAdd(false)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="space-y-4">
                <div><Label>Judul</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div>
                  <Label>Unggah Foto</Label>
                  <div className="flex items-center gap-2">
                    <Input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={handleFileChange} disabled={uploading} className="flex-1" />
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted">
                      <Upload className="h-4 w-4" />
                    </span>
                  </div>
                  {uploading && <p className="mt-1 text-xs text-muted">Mengunggah...</p>}
                </div>
                <div>
                  <Label>URL Gambar</Label>
                  <Input required value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="/images/... atau https://..." />
                  {form.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.image_url} alt="Pratinjau" className="mt-2 h-28 w-full rounded-lg border border-border object-cover" />
                  )}
                </div>
                <div><Label>Kategori</Label><Input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
                <div><Label>Deskripsi</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
