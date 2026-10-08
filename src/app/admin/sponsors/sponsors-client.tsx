'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, X, Search } from 'lucide-react'
import { createSponsor, deleteSponsor } from '@/server/actions/unima'
import { useRouter } from 'next/navigation'

const TYPE_COLORS: Record<string, 'default' | 'accent' | 'success' | 'secondary'> = {
  sponsor: 'accent',
  partner: 'success',
  media: 'secondary',
}

const TYPE_LABELS: Record<string, string> = {
  sponsor: 'Sponsor',
  partner: 'Partner',
  media: 'Media',
}

interface FormState {
  name: string
  logo_url: string
  website: string
  type: string
  sort_order: string
}

const emptyForm: FormState = {
  name: '',
  logo_url: '',
  website: '',
  type: 'sponsor',
  sort_order: '0',
}

export function SponsorsClient({ data }: { data: any[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState('')
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const filtered = data.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.type?.toLowerCase().includes(search.toLowerCase()),
  )

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await createSponsor({
        ...form,
        sort_order: Number(form.sort_order),
      } as any)
      if (result?.error) {
        setError(String(result.error))
        return
      }
      setNotification({ type: 'success', message: 'Sponsor berhasil ditambahkan' })
      setShowAdd(false)
      setForm(emptyForm)
      router.refresh()
    } catch {
      setNotification({ type: 'error', message: 'Gagal menambahkan sponsor' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus sponsor ini?')) return
    try {
      await deleteSponsor(id)
      setNotification({ type: 'success', message: 'Sponsor berhasil dihapus' })
      router.refresh()
    } catch {
      setNotification({ type: 'error', message: 'Gagal menghapus sponsor' })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">Sponsor</h1>
          <p className="text-sm text-muted mt-1">Kelola sponsor, partner, dan media</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus className="mr-2 h-4 w-4" />Tambah</Button>
      </div>

      {notification && (
        <div className={`mb-4 rounded-lg p-3 text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {notification.message}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Daftar Sponsor</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input placeholder="Cari sponsor..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted">{search ? 'Tidak ada hasil' : 'Belum ada sponsor'}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-border text-muted">
                    <th className="pb-3 font-medium">Nama</th>
                    <th className="pb-3 font-medium">Tipe</th>
                    <th className="pb-3 font-medium hidden md:table-cell">Website</th>
                    <th className="pb-3 font-medium hidden lg:table-cell">Sort Order</th>
                    <th className="pb-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item: any) => (
                    <tr key={item.id} className="border-b border-border/50 hover:bg-gray-50/50">
                      <td className="py-3 font-medium">{item.name}</td>
                      <td className="py-3">
                        <Badge variant={TYPE_COLORS[item.type] || 'default'}>
                          {TYPE_LABELS[item.type] || item.type}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted hidden md:table-cell text-xs">
                        {item.website ? (
                          <a href={item.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary truncate block max-w-[200px]">
                            {item.website}
                          </a>
                        ) : '-'}
                      </td>
                      <td className="py-3 text-muted hidden lg:table-cell">{item.sort_order ?? 0}</td>
                      <td className="py-3 text-right">
                        <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete(item.id)}>
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
              <CardTitle className="text-lg">Tambah Sponsor</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowAdd(false)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="space-y-4">
                <div><Label>Nama</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>URL Logo</Label><Input type="url" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." /></div>
                <div><Label>Website</Label><Input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." /></div>
                <div>
                  <Label>Tipe</Label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm">
                    <option value="sponsor">Sponsor</option>
                    <option value="partner">Partner</option>
                    <option value="media">Media</option>
                  </select>
                </div>
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
