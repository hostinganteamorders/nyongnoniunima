'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Trash2, X, Crown, Upload } from 'lucide-react'
import { createCurrentTitleholder, updateCurrentTitleholder, deleteCurrentTitleholder } from '@/server/actions/unima'
import { uploadToStorage, ensureAdminSession } from '@/lib/uploads'
import { useRouter } from 'next/navigation'

interface FormState {
  title: string
  name: string
  faculty: string
  study_program: string
  photo_url: string
  instagram: string
  biography: string
  sort_order: string
}

const emptyForm: FormState = {
  title: '',
  name: '',
  faculty: '',
  study_program: '',
  photo_url: '',
  instagram: '',
  biography: '',
  sort_order: '0',
}

export function CurrentTitleholdersClient({ data }: { data: any[] }) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
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
      title: item.title || '',
      name: item.name || '',
      faculty: item.faculty || '',
      study_program: item.study_program || '',
      photo_url: item.photo_url || '',
      instagram: item.instagram || '',
      biography: item.biography || '',
      sort_order: String(item.sort_order ?? 0),
    })
    setError('')
    setShowModal(true)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const file = input.files?.[0]
    if (!file) return
    if (!(await ensureAdminSession())) {
      setError('Silakan login terlebih dahulu')
      input.value = ''
      return
    }
    setUploading(true)
    setError('')
    try {
      const { url } = await uploadToStorage('titleholders', file)
      setForm((prev) => ({ ...prev, photo_url: url }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah foto')
    } finally {
      setUploading(false)
      input.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!(await ensureAdminSession())) {
      setError('Silakan login terlebih dahulu')
      setLoading(false)
      return
    }

    const payload = {
      ...form,
      sort_order: Number(form.sort_order),
    }

    try {
      const result = editId
        ? await updateCurrentTitleholder(editId, payload)
        : await createCurrentTitleholder(payload)

      if (result?.error) {
        setError(String(result.error))
        return
      }

      setNotification({ type: 'success', message: editId ? 'Data berhasil diperbarui' : 'Data berhasil ditambahkan' })
      closeModal()
      router.refresh()
    } catch {
      setNotification({ type: 'error', message: 'Gagal menyimpan data' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data ini?')) return
    try {
      await deleteCurrentTitleholder(id)
      setNotification({ type: 'success', message: 'Data berhasil dihapus' })
      router.refresh()
    } catch {
      setNotification({ type: 'error', message: 'Gagal menghapus data' })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">Current Titleholders</h1>
          <p className="text-sm text-muted mt-1">Kelola titleholder yang sedang menjabat</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Tambah</Button>
      </div>

      {notification && (
        <div className={`mb-4 rounded-lg p-3 text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {notification.message}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">Daftar Titleholder</CardTitle></CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="text-center py-12 text-muted">Belum ada data</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-border text-muted">
                    <th className="pb-3 font-medium">Title</th>
                    <th className="pb-3 font-medium">Nama</th>
                    <th className="pb-3 font-medium hidden md:table-cell">Fakultas</th>
                    <th className="pb-3 font-medium hidden lg:table-cell">Prodi</th>
                    <th className="pb-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item: any) => (
                    <tr key={item.id} className="border-b border-border/50 hover:bg-gray-50/50">
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent-blue/10 px-2.5 py-0.5 text-xs font-medium text-accent-blue">
                          <Crown className="h-3 w-3" />
                          {item.title}
                        </span>
                      </td>
                      <td className="py-3 font-medium">{item.name}</td>
                      <td className="py-3 text-muted hidden md:table-cell">{item.faculty || '-'}</td>
                      <td className="py-3 text-muted hidden lg:table-cell">{item.study_program || '-'}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete(item.id)}>
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
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <Card className="w-full max-w-lg my-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">{editId ? 'Edit Titleholder' : 'Tambah Titleholder'}</CardTitle>
              <Button variant="ghost" size="icon" onClick={closeModal}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Nyong Noni UNIMA 2026" /></div>
                  <div><Label>Nama</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                </div>
                <div><Label>Fakultas</Label><Input value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })} /></div>
                <div><Label>Program Studi</Label><Input value={form.study_program} onChange={(e) => setForm({ ...form, study_program: e.target.value })} /></div>
                <div>
                  <Label>Unggah Foto</Label>
                  <div className="flex items-center gap-2">
                    <Input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={handleFileChange} disabled={uploading} className="flex-1" />
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted">
                      <Upload className="h-4 w-4" />
                    </span>
                  </div>
                  {uploading && <p className="mt-1 text-xs text-muted">Mengunggah...</p>}
                  {form.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.photo_url} alt="Pratinjau foto" className="mt-2 h-28 w-full rounded-lg border border-border object-cover" />
                  )}
                </div>
                <div><Label>Instagram</Label><Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="@username" /></div>
                <div><Label>Biografi</Label><textarea className="flex h-24 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" value={form.biography} onChange={(e) => setForm({ ...form, biography: e.target.value })} /></div>
                <div><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
