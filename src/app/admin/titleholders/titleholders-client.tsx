'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Crown, Pencil, Plus, Trash2, X, Upload } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createTitleholder, updateTitleholder, deleteTitleholder } from '@/server/actions/finalists'
import { uploadToStorage, ensureAdminSession } from '@/lib/uploads'

const CATEGORIES = ['Juara Utama', 'Wakil I', 'Wakil II', 'Harapan I', 'Harapan II', 'Berbakat', 'Favorit', 'Fotogenik', 'Persahabatan', 'Digital', 'Duta Lingkungan', 'Duta Sosial', 'Duta Budaya', 'Duta Bahasa', 'Duta Seni', 'Intelegensia', 'Other'] as const

interface FormState {
  tahun: string
  category: string
  nyong_name: string
  noni_name: string
  region: string
  motto: string
  biography: string
  nyong_photo_url: string
  noni_photo_url: string
  nyong_instagram: string
  noni_instagram: string
}

const emptyForm: FormState = {
  tahun: `${new Date().getFullYear()}`,
  category: 'Juara Utama',
  nyong_name: '',
  noni_name: '',
  region: '',
  motto: '',
  biography: '',
  nyong_photo_url: '',
  noni_photo_url: '',
  nyong_instagram: '',
  noni_instagram: '',
}

export function TitleholdersClient({ data }: { data: any[] }) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState<'nyong' | 'noni' | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const closeModal = () => {
    setShowModal(false)
    setEditId(null)
    setForm(emptyForm)
    setError('')
  }

  const openAdd = () => {
    setEditId(null)
    setForm(emptyForm)
    setError('')
    setShowModal(true)
  }

  const openEdit = (item: any) => {
    setEditId(item.id)
    setForm({
      tahun: String(item.tahun),
      category: item.category,
      nyong_name: item.nyong_name,
      noni_name: item.noni_name,
      region: item.region,
      motto: item.motto || '',
      biography: item.biography || '',
      nyong_photo_url: item.nyong_photo_url || '',
      noni_photo_url: item.noni_photo_url || '',
      nyong_instagram: item.nyong_instagram || '',
      noni_instagram: item.noni_instagram || '',
    })
    setError('')
    setShowModal(true)
  }

  const handleFileChange = async (field: 'nyong' | 'noni', event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return
    if (!(await ensureAdminSession())) {
      setError('Silakan login terlebih dahulu')
      input.value = ''
      return
    }
    setUploading(field)
    setError('')
    try {
      const { url } = await uploadToStorage('titleholders', file)
      setForm((prev) => ({ ...prev, [`${field}_photo_url`]: url }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah foto')
    } finally {
      setUploading(null)
      input.value = ''
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (!(await ensureAdminSession())) {
      setError('Silakan login terlebih dahulu')
      return
    }

    const payload = {
      ...form,
      tahun: Number(form.tahun),
    }

    const result = editId
      ? await updateTitleholder(editId, payload)
      : await createTitleholder(payload)

    if (result?.error) {
      setError(String(result.error))
      return
    }

    setNotification({ type: 'success', message: editId ? 'Titleholder berhasil diperbarui' : 'Titleholder berhasil ditambahkan' })
    closeModal()
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pasangan titleholder ini?')) return
    await deleteTitleholder(id)
    setNotification({ type: 'success', message: 'Titleholder berhasil dihapus' })
    router.refresh()
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-display-md text-dark-text">Titleholders</h1>
          <p className="mt-1 text-body-sm text-dark-secondary">Kelola pasangan Nyong &amp; Noni per kategori</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah
        </Button>
      </div>

      {notification && (
        <div className={`mb-4 rounded-lg p-3 text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {notification.message}
        </div>
      )}

      <div className="rounded-xl border border-border bg-white overflow-hidden">
        {data.length === 0 ? (
          <div className="py-12 text-center text-body-sm text-dark-secondary">Belum ada data titleholders</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <thead>
                <tr className="border-b border-border text-dark-secondary">
                  <th className="px-5 py-3.5 font-medium">Tahun</th>
                  <th className="px-5 py-3.5 font-medium">Kategori</th>
                  <th className="px-5 py-3.5 font-medium">Nyong</th>
                  <th className="px-5 py-3.5 font-medium">Noni</th>
                  <th className="px-5 py-3.5 font-medium">Region</th>
                  <th className="px-5 py-3.5 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item: any) => (
                  <tr key={item.id} className="border-b border-border/50 last:border-0">
                    <td className="px-5 py-3.5 font-semibold text-dark-text">{item.tahun}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent-blue/10 px-2.5 py-0.5 text-xs font-medium text-accent-blue">
                        <Crown className="h-3 w-3" />
                        {item.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-dark-text">{item.nyong_name}</td>
                    <td className="px-5 py-3.5 text-dark-text">{item.noni_name}</td>
                    <td className="px-5 py-3.5 text-dark-secondary">{item.region}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-2xl rounded-2xl border border-border bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-headline text-dark-text">
                {editId ? 'Edit Titleholder' : 'Tambah Titleholder'}
              </h2>
              <Button variant="ghost" size="icon" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tahun</Label>
                  <Input required type="number" value={form.tahun} onChange={(event) => setForm({ ...form, tahun: event.target.value })} />
                </div>
                <div>
                  <Label>Kategori</Label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-body-sm text-dark-text"
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value })}
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><Label>Nama Nyong</Label><Input required value={form.nyong_name} onChange={(event) => setForm({ ...form, nyong_name: event.target.value })} /></div>
                <div><Label>Nama Noni</Label><Input required value={form.noni_name} onChange={(event) => setForm({ ...form, noni_name: event.target.value })} /></div>
              </div>

              <div><Label>Region / Kabupaten / Kota</Label><Input required value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} /></div>
              <div><Label>Motto</Label><Input value={form.motto} onChange={(event) => setForm({ ...form, motto: event.target.value })} /></div>

              <div>
                <Label>Biografi</Label>
                <textarea className="flex min-h-[100px] w-full rounded-lg border border-border bg-white px-3 py-2 text-body-sm text-dark-text" value={form.biography} onChange={(event) => setForm({ ...form, biography: event.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Foto Nyong</Label>
                  <div className="flex items-center gap-2">
                    <Input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => handleFileChange('nyong', e)} disabled={uploading !== null} className="flex-1" />
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted">
                      <Upload className="h-4 w-4" />
                    </span>
                  </div>
                  {uploading === 'nyong' && <p className="text-xs text-muted">Mengunggah...</p>}
                  <Input value={form.nyong_photo_url} onChange={(event) => setForm({ ...form, nyong_photo_url: event.target.value })} placeholder="URL foto (opsional)" />
                  {form.nyong_photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.nyong_photo_url} alt="Foto Nyong" className="h-28 w-full rounded-lg border border-border object-cover" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Foto Noni</Label>
                  <div className="flex items-center gap-2">
                    <Input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => handleFileChange('noni', e)} disabled={uploading !== null} className="flex-1" />
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted">
                      <Upload className="h-4 w-4" />
                    </span>
                  </div>
                  {uploading === 'noni' && <p className="text-xs text-muted">Mengunggah...</p>}
                  <Input value={form.noni_photo_url} onChange={(event) => setForm({ ...form, noni_photo_url: event.target.value })} placeholder="URL foto (opsional)" />
                  {form.noni_photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.noni_photo_url} alt="Foto Noni" className="h-28 w-full rounded-lg border border-border object-cover" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><Label>Instagram Nyong</Label><Input value={form.nyong_instagram} onChange={(event) => setForm({ ...form, nyong_instagram: event.target.value })} /></div>
                <div><Label>Instagram Noni</Label><Input value={form.noni_instagram} onChange={(event) => setForm({ ...form, noni_instagram: event.target.value })} /></div>
              </div>

              {error && <p className="text-body-sm text-red-600">{error}</p>}

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1">{editId ? 'Simpan Perubahan' : 'Simpan'}</Button>
                <Button type="button" variant="outline" onClick={closeModal}>Batal</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
