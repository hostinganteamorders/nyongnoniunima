'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, Trash2, Crown, X, FileText, Instagram, Upload } from 'lucide-react'
import { updateApplicantStatus, deleteApplicant } from '@/server/actions/applicants'
import { updateFinalistData, uploadFinalistPhoto } from '@/server/actions/finalists'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Applicant {
  id: string
  full_name: string
  email: string
  phone: string
  date_of_birth: string
  address: string
  city: string
  province: string
  height_cm?: number
  weight_kg?: number
  occupation?: string
  education?: string
  photo_url?: string | null
  status: string
  instagram?: string
  bio?: string
}

interface EditData {
  applicant_id: string
  full_name: string
  email: string
  phone: string
  date_of_birth: string
  address: string
  city: string
  province: string
  height_cm: string
  weight_kg: string
  occupation: string
  education: string
  instagram: string
  bio: string
  tahun: string
  photo_url: string
}

const INITIAL_EDIT: EditData = {
  applicant_id: '',
  full_name: '', email: '', phone: '', date_of_birth: '',
  address: '', city: '', province: '',
  height_cm: '', weight_kg: '',
  occupation: '', education: '',
  instagram: '', bio: '', tahun: '', photo_url: '',
}

export function FinalistsClient({ applicants }: { applicants: Applicant[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [editData, setEditData] = useState<EditData | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const finalists = applicants.filter((a) => a.status === 'finalist')
  const candidates = applicants.filter((a) => a.status !== 'finalist' && a.status !== 'rejected')

  const filteredFinalists = finalists.filter((a) =>
    a.full_name.toLowerCase().includes(search.toLowerCase()) ||
    a.city.toLowerCase().includes(search.toLowerCase()))
  const filteredCandidates = candidates.filter((a) =>
    a.full_name.toLowerCase().includes(search.toLowerCase()) ||
    a.city.toLowerCase().includes(search.toLowerCase()))

  const handlePromote = async (id: string) => {
    setLoading(id)
    try { await updateApplicantStatus(id, 'finalist'); setNotification({ type: 'success', message: 'Finalis berhasil ditambahkan' }); router.refresh() } catch { setNotification({ type: 'error', message: 'Gagal menambahkan finalis' }) } finally { setLoading(null) }
  }

  const handleDemote = async (id: string) => {
    setLoading(id)
    try { await updateApplicantStatus(id, 'verified'); setNotification({ type: 'success', message: 'Status finalis dihapus' }); router.refresh() } catch { setNotification({ type: 'error', message: 'Gagal mengubah status' }) } finally { setLoading(null) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus?')) return
    setLoading(id)
    try { await deleteApplicant(id); setNotification({ type: 'success', message: 'Data berhasil dihapus' }); router.refresh() } catch { setNotification({ type: 'error', message: 'Gagal menghapus data' }) } finally { setLoading(null) }
  }

  const openEdit = (a: Applicant) => {
    setEditData({
      applicant_id: a.id,
      full_name: a.full_name,
      email: a.email,
      phone: a.phone || '',
      date_of_birth: a.date_of_birth || '',
      address: a.address || '',
      city: a.city,
      province: a.province,
      height_cm: String(a.height_cm || ''),
      weight_kg: String(a.weight_kg || ''),
      occupation: a.occupation || '',
      education: a.education || '',
      instagram: a.instagram || '',
      bio: a.bio || '',
      tahun: String(new Date().getFullYear()),
      photo_url: a.photo_url || '',
    })
    setError('')
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'image/png') { setError('Hanya file PNG yang diizinkan'); return }
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await uploadFinalistPhoto(formData)
      if (result.error) { setError(result.error) }
      else if (result.url && editData) { setEditData({ ...editData, photo_url: result.url }) }
    } finally { setUploading(false) }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editData) return
    setLoading(editData.applicant_id)
    setError('')
    try {
      const data: Record<string, unknown> = { applicant_id: editData.applicant_id, tahun: editData.tahun }
      const fields: (keyof EditData)[] = [
        'full_name', 'email', 'phone', 'date_of_birth', 'address',
        'city', 'province', 'occupation', 'education', 'instagram', 'bio', 'photo_url',
      ]
      for (const f of fields) { if (editData[f]) data[f] = editData[f] }
      if (editData.height_cm) data.height_cm = Number(editData.height_cm)
      if (editData.weight_kg) data.weight_kg = Number(editData.weight_kg)

      const result = await updateFinalistData(data as any)
      if (result.error) { setError(result.error); return }
      setNotification({ type: 'success', message: 'Data finalis berhasil disimpan' })
      setEditData(null)
      router.refresh()
    } catch {
      setNotification({ type: 'error', message: 'Gagal menyimpan data' })
    } finally { setLoading(null) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-dark-text">Finalis</h1>
      </div>

      {notification && (
        <div className={`mb-4 rounded-lg p-3 text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {notification.message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Crown className="h-5 w-5 text-accent" />
                Finalis ({finalists.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {filteredFinalists.length === 0 ? (
              <div className="text-center py-12 text-muted">{search ? 'Tidak ada hasil' : 'Belum ada finalis'}</div>
            ) : (
              <div className="space-y-3">
                {filteredFinalists.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent/5 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {f.photo_url && (
                          <Image src={f.photo_url} alt="" width={32} height={32} className="size-8 rounded-full object-cover" />
                        )}
                        <p className="font-medium truncate">{f.full_name}</p>
                      </div>
                      <p className="text-xs text-muted">{f.city}, {f.province}</p>
                      {f.instagram && <p className="text-xs text-primary">{f.instagram}</p>}
                    </div>
                    <div className="flex gap-2 ml-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(f)}>
                        <FileText className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDemote(f.id)} disabled={loading === f.id}>
                        <X className="h-3 w-3 mr-1" /> Hapus
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete(f.id)} disabled={loading === f.id}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Calon Finalis ({candidates.length})</CardTitle>
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input placeholder="Cari..." className="pl-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredCandidates.length === 0 ? (
              <div className="text-center py-12 text-muted">{search ? 'Tidak ada hasil' : 'Tidak ada calon finalis'}</div>
            ) : (
              <div className="space-y-2">
                {filteredCandidates.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-sm">{c.full_name}</p>
                      <p className="text-xs text-muted">{c.city} &middot; {c.height_cm} cm &middot; {c.occupation}</p>
                    </div>
                    <Button variant="accent" size="sm" onClick={() => handlePromote(c.id)} disabled={loading === c.id}>
                      <Crown className="h-3 w-3 mr-1" /> Jadikan Finalis
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {editData && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-8">
          <Card className="w-full max-w-2xl my-8">
            <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
              <CardTitle className="text-lg">Edit Finalis: {editData.full_name}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setEditData(null)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="pt-6">
              {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <Label>Foto Finalis (PNG dengan background transparan)</Label>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="size-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-gray-50">
                      {editData.photo_url ? (
                        <Image src={editData.photo_url} alt="Preview" width={96} height={96} className="size-full object-contain" />
                      ) : (
                        <Upload className="h-6 w-6 text-muted" />
                      )}
                    </div>
                    <div>
                      <Label htmlFor="photo-upload" className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50">
                        {uploading ? 'Mengupload...' : 'Pilih File PNG'}
                      </Label>
                      <input id="photo-upload" type="file" accept=".png,image/png" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                      <p className="mt-1 text-xs text-muted">Hanya file PNG dengan background transparan</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label>Nama Lengkap</Label><Input value={editData.full_name} onChange={(e) => setEditData({ ...editData, full_name: e.target.value })} /></div>
                  <div><Label>Email</Label><Input type="email" value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} /></div>
                  <div><Label>No. Telepon</Label><Input value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} /></div>
                  <div><Label>Tanggal Lahir</Label><Input type="date" value={editData.date_of_birth} onChange={(e) => setEditData({ ...editData, date_of_birth: e.target.value })} /></div>
                  <div className="sm:col-span-2"><Label>Alamat</Label><Input value={editData.address} onChange={(e) => setEditData({ ...editData, address: e.target.value })} /></div>
                  <div><Label>Kota</Label><Input value={editData.city} onChange={(e) => setEditData({ ...editData, city: e.target.value })} /></div>
                  <div><Label>Provinsi</Label><Input value={editData.province} onChange={(e) => setEditData({ ...editData, province: e.target.value })} /></div>
                  <div><Label>Tinggi Badan (cm)</Label><Input type="number" value={editData.height_cm} onChange={(e) => setEditData({ ...editData, height_cm: e.target.value })} /></div>
                  <div><Label>Berat Badan (kg)</Label><Input type="number" value={editData.weight_kg} onChange={(e) => setEditData({ ...editData, weight_kg: e.target.value })} /></div>
                  <div><Label>Pekerjaan</Label><Input value={editData.occupation} onChange={(e) => setEditData({ ...editData, occupation: e.target.value })} /></div>
                  <div><Label>Pendidikan</Label><Input value={editData.education} onChange={(e) => setEditData({ ...editData, education: e.target.value })} /></div>
                </div>

                <hr className="border-border" />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label><Instagram className="h-3 w-3 inline mr-1" />Instagram</Label><Input value={editData.instagram} onChange={(e) => setEditData({ ...editData, instagram: e.target.value })} placeholder="@username" /></div>
                  <div><Label>Tahun Aktif</Label><Input value={editData.tahun} onChange={(e) => setEditData({ ...editData, tahun: e.target.value })} placeholder="2026" /></div>
                  <div className="sm:col-span-2"><Label>Bio</Label><textarea className="flex h-24 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" value={editData.bio} onChange={(e) => setEditData({ ...editData, bio: e.target.value })} placeholder="Tentang finalis..." /></div>
                </div>

                <Button type="submit" className="w-full" disabled={loading === editData.applicant_id}>
                  {loading === editData.applicant_id ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
