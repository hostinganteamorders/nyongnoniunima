'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Crown, Pencil, Plus, Trash2, X, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createTitleholder, updateTitleholder, deleteTitleholder } from '@/server/actions/finalists'
import { uploadToStorage, ensureAdminSession } from '@/lib/uploads'

const CATEGORIES = ['Juara Utama', 'Wakil I', 'Wakil II', 'Harapan I', 'Harapan II', 'Berbakat', 'Favorit', 'Fotogenik', 'Persahabatan', 'Digital', 'Duta Lingkungan', 'Duta Sosial', 'Duta Budaya', 'Duta Bahasa', 'Duta Seni', 'Intelegensia', 'Other'] as const

interface PersonForm {
  name: string
  faculty: string
  study_program: string
  instagram: string
  biography: string
  photo_url: string
}

interface FormState {
  tahun: string
  category: string
  nyong: PersonForm
  noni: PersonForm
}

interface Group {
  key: string
  tahun: number
  category: string
  rows: any[]
}

interface EditRef {
  nyongRowId: string | null
  noniRowId: string | null
}

const emptyPerson: PersonForm = { name: '', faculty: '', study_program: '', instagram: '', biography: '', photo_url: '' }

const emptyForm: FormState = {
  tahun: `${new Date().getFullYear()}`,
  category: 'Juara Utama',
  nyong: { ...emptyPerson },
  noni: { ...emptyPerson },
}

function groupRows(data: any[]): Group[] {
  const map = new Map<string, Group>()
  for (const item of data) {
    const key = `${item.tahun}|${item.category}`
    const existing = map.get(key)
    if (existing) existing.rows.push(item)
    else map.set(key, { key, tahun: item.tahun, category: item.category, rows: [item] })
  }
  return [...map.values()]
}

function resolveSides(group: Group): { nyongRow: any | null; noniRow: any | null } {
  const shared = group.rows.find((r) => r.nyong_name && r.noni_name)
  const nyongRow = group.rows.find((r) => r.nyong_name && !r.noni_name) ?? shared ?? null
  const noniRow = group.rows.find((r) => r.noni_name && !r.nyong_name) ?? shared ?? null
  return { nyongRow, noniRow }
}

function PersonName({ row, side }: { row: any | null; side: 'nyong' | 'noni' }) {
  const name = row ? (side === 'nyong' ? row.nyong_name : row.noni_name) : ''
  const detail = [row?.faculty, row?.study_program].filter(Boolean).join(' · ')
  if (!name) return <span className="text-dark-secondary">-</span>
  return (
    <span>
      <span className="text-dark-text">{name}</span>
      {detail && <span className="block text-xs text-dark-secondary">{detail}</span>}
    </span>
  )
}

export function TitleholdersClient({ data }: { data: any[] }) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [editRef, setEditRef] = useState<EditRef | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState<'nyong' | 'noni' | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const groups = groupRows(data)

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const closeModal = () => {
    setShowModal(false)
    setEditRef(null)
    setForm(emptyForm)
    setError('')
  }

  const openAdd = () => {
    setEditRef(null)
    setForm(emptyForm)
    setError('')
    setShowModal(true)
  }

  const openEdit = (group: Group) => {
    const { nyongRow, noniRow } = resolveSides(group)
    const read = (row: any | null, side: 'nyong' | 'noni'): PersonForm => ({
      name: row ? (side === 'nyong' ? row.nyong_name : row.noni_name) || '' : '',
      faculty: row?.faculty || '',
      study_program: row?.study_program || '',
      instagram: row ? (side === 'nyong' ? row.nyong_instagram : row.noni_instagram) || '' : '',
      biography: row?.biography || '',
      photo_url: row ? (side === 'nyong' ? row.nyong_photo_url : row.noni_photo_url) || '' : '',
    })
    setEditRef({ nyongRowId: nyongRow?.id ?? null, noniRowId: noniRow?.id ?? null })
    setForm({
      tahun: String(group.tahun),
      category: group.category,
      nyong: read(nyongRow, 'nyong'),
      noni: read(noniRow, 'noni'),
    })
    setError('')
    setShowModal(true)
  }

  const setPerson = (side: 'nyong' | 'noni', patch: Partial<PersonForm>) => {
    setForm((prev) => ({ ...prev, [side]: { ...prev[side], ...patch } }))
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
      setPerson(field, { photo_url: url })
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

    if (!form.nyong.name.trim() && !form.noni.name.trim()) {
      setError('Isi minimal satu nama Nyong atau Noni')
      return
    }

    const tahun = Number(form.tahun)
    const { category } = form
    const sharedRow = editRef?.nyongRowId && editRef.nyongRowId === editRef.noniRowId ? editRef.nyongRowId : null

    if (sharedRow) {
      const payload = {
        tahun,
        category,
        nyong_name: form.nyong.name,
        noni_name: form.noni.name,
        faculty: form.nyong.faculty || form.noni.faculty || null,
        study_program: form.nyong.study_program || form.noni.study_program || null,
        biography: form.nyong.biography || form.noni.biography || null,
        region: '',
        nyong_photo_url: form.nyong.photo_url || null,
        noni_photo_url: form.noni.photo_url || null,
        nyong_instagram: form.nyong.instagram || null,
        noni_instagram: form.noni.instagram || null,
      }
      const result = await updateTitleholder(sharedRow, payload)
      if (result?.error) {
        setError(String(result.error))
        return
      }
    } else {
      const sides: {
        person: PersonForm
        rowId: string | null
        build: (p: PersonForm) => Record<string, unknown>
      }[] = [
        {
          person: form.nyong,
          rowId: editRef?.nyongRowId ?? null,
          build: (p) => ({
            tahun,
            category,
            nyong_name: p.name,
            noni_name: '',
            faculty: p.faculty || null,
            study_program: p.study_program || null,
            biography: p.biography || null,
            region: '',
            nyong_photo_url: p.photo_url || null,
            nyong_instagram: p.instagram || null,
          }),
        },
        {
          person: form.noni,
          rowId: editRef?.noniRowId ?? null,
          build: (p) => ({
            tahun,
            category,
            nyong_name: '',
            noni_name: p.name,
            faculty: p.faculty || null,
            study_program: p.study_program || null,
            biography: p.biography || null,
            region: '',
            noni_photo_url: p.photo_url || null,
            noni_instagram: p.instagram || null,
          }),
        },
      ]

      for (const side of sides) {
        const filled = side.person.name.trim() !== ''
        if (filled) {
          const payload = side.build(side.person)
          const result = side.rowId ? await updateTitleholder(side.rowId, payload) : await createTitleholder(payload)
          if (result?.error) {
            setError(String(result.error))
            return
          }
        } else if (side.rowId) {
          await deleteTitleholder(side.rowId)
        }
      }
    }

    setNotification({ type: 'success', message: editRef ? 'Titleholder berhasil diperbarui' : 'Titleholder berhasil ditambahkan' })
    closeModal()
    router.refresh()
  }

  const handleDelete = async (group: Group) => {
    if (!confirm('Hapus pasangan titleholder ini?')) return
    for (const row of group.rows) {
      await deleteTitleholder(row.id)
    }
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
        {groups.length === 0 ? (
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
                  <th className="px-5 py-3.5 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const { nyongRow, noniRow } = resolveSides(group)
                  return (
                    <tr key={group.key} className="border-b border-border/50 last:border-0">
                      <td className="px-5 py-3.5 font-semibold text-dark-text">{group.tahun}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent-blue/10 px-2.5 py-0.5 text-xs font-medium text-accent-blue">
                          <Crown className="h-3 w-3" />
                          {group.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5"><PersonName row={nyongRow} side="nyong" /></td>
                      <td className="px-5 py-3.5"><PersonName row={noniRow} side="noni" /></td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(group)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(group)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
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
                {editRef ? 'Edit Titleholder' : 'Tambah Titleholder'}
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

              {(['nyong', 'noni'] as const).map((side) => (
                <div key={side} className="rounded-xl border border-border p-4 space-y-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-accent-dark">
                    <Crown className="h-3.5 w-3.5" />
                    {side === 'nyong' ? 'Nyong' : 'Noni'}
                  </p>
                  <div>
                    <Label>Nama {side === 'nyong' ? 'Nyong' : 'Noni'}</Label>
                    <Input value={form[side].name} onChange={(event) => setPerson(side, { name: event.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Fakultas</Label>
                      <Input value={form[side].faculty} onChange={(event) => setPerson(side, { faculty: event.target.value })} />
                    </div>
                    <div>
                      <Label>Program Studi</Label>
                      <Input value={form[side].study_program} onChange={(event) => setPerson(side, { study_program: event.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Instagram</Label>
                    <Input value={form[side].instagram} onChange={(event) => setPerson(side, { instagram: event.target.value })} placeholder="@username" />
                  </div>
                  <div className="space-y-2">
                    <Label>Foto</Label>
                    <div className="flex items-center gap-2">
                      <Input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => handleFileChange(side, e)} disabled={uploading !== null} className="flex-1" />
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted">
                        <Upload className="h-4 w-4" />
                      </span>
                    </div>
                    {uploading === side && <p className="text-xs text-muted">Mengunggah...</p>}
                    {form[side].photo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form[side].photo_url} alt={`Foto ${side}`} className="max-h-96 w-full rounded-lg border border-border bg-white object-contain" />
                    )}
                  </div>
                  <div>
                    <Label>Biografi</Label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-lg border border-border bg-white px-3 py-2 text-body-sm text-dark-text"
                      value={form[side].biography}
                      onChange={(event) => setPerson(side, { biography: event.target.value })}
                    />
                  </div>
                </div>
              ))}

              {error && <p className="text-body-sm text-red-600">{error}</p>}

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1">{editRef ? 'Simpan Perubahan' : 'Simpan'}</Button>
                <Button type="button" variant="outline" onClick={closeModal}>Batal</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
