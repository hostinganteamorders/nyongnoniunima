'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Search, Trash2, X, Eye } from 'lucide-react'
import { updateApplicantStatus, deleteApplicant, createApplicant } from '@/server/actions/applicants'
import { getFaculties, getStudyPrograms } from '@/server/actions/unima'
import { useRouter } from 'next/navigation'

interface Applicant {
  id: string
  full_name: string
  email: string
  phone: string
  city: string
  province: string
  status: string
  created_at: string
  height_cm?: number
  weight_kg?: number
  occupation?: string
  education?: string
  date_of_birth?: string
  address?: string
  place_of_birth?: string
  gender?: string
  nim?: string
  faculty?: string
  study_program?: string
  semester?: number
  instagram?: string
  tiktok?: string
  facebook?: string
  essay?: string
  photo_url?: string | null
  passport_photo_url?: string | null
  fullbody_photo_url?: string | null
  ktm_url?: string | null
  ktp_url?: string | null
  cv_url?: string | null
  statement_letter_url?: string | null
}

interface Faculty { id: string; name: string }
interface StudyProgram { id: string; name: string }

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  verified: 'Terverifikasi',
  rejected: 'Ditolak',
  finalist: 'Finalis',
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 py-2 last:border-0 last:pb-0">
      <span className="shrink-0 text-sm text-dark-secondary">{label}</span>
      <span className="break-words text-right text-sm font-medium text-dark-text">{value || '-'}</span>
    </div>
  )
}

export function ApplicantsClient({
  applicants,
  stats,
}: {
  applicants: Applicant[]
  stats: { total: number; pending: number; verified: number; rejected: number; finalist: number }
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', date_of_birth: '', address: '',
    city: '', province: '', height_cm: '', weight_kg: '', occupation: '', education: '',
  })
  const [formError, setFormError] = useState('')
  const [detail, setDetail] = useState<Applicant | null>(null)
  const [faculties, setFaculties] = useState<Faculty[]>([])
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([])

  useEffect(() => {
    getFaculties().then((data) => setFaculties((data as Faculty[]) || [])).catch(() => {})
    getStudyPrograms().then((data) => setStudyPrograms((data as StudyProgram[]) || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const facultyName = (id?: string | null) => (id ? faculties.find((f) => f.id === id)?.name || id : '')
  const prodiName = (id?: string | null) => (id ? studyPrograms.find((sp) => sp.id === id)?.name || id : '')
  const formatDate = (d?: string | null) => {
    if (!d) return ''
    const [y, m, day] = d.slice(0, 10).split('-').map(Number)
    return y && m && day ? new Date(y, m - 1, day).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : d
  }
  const formatDateTime = (iso: string) => {
    const d = new Date(iso)
    return isNaN(d.getTime()) ? iso : d.toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })
  }

  const docLinks: [string, string][] = detail
    ? ([
        ['Foto', detail.photo_url],
        ['Paspor', detail.passport_photo_url],
        ['Foto Full Body', detail.fullbody_photo_url],
        ['KTM', detail.ktm_url],
        ['KTP', detail.ktp_url],
        ['CV', detail.cv_url],
        ['Surat Pernyataan', detail.statement_letter_url],
      ] as [string, string | null | undefined][]).filter((entry): entry is [string, string] => !!entry[1])
    : []

  const sectionTitle = 'mb-1 text-xs font-semibold uppercase tracking-widest text-accent-dark'

  const filtered = applicants.filter(
    (a) =>
      a.full_name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.city.toLowerCase().includes(search.toLowerCase()),
  )

  const handleStatusChange = async (id: string, status: string) => {
    setLoading(id)
    try {
      await updateApplicantStatus(id, status as any)
      setNotification({ type: 'success', message: 'Status berhasil diubah' })
      router.refresh()
    } catch {
      setNotification({ type: 'error', message: 'Gagal mengubah status' })
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus pendaftar ini?')) return
    setLoading(id)
    try {
      await deleteApplicant(id)
      setNotification({ type: 'success', message: 'Pendaftar berhasil dihapus' })
      router.refresh()
    } catch {
      setNotification({ type: 'error', message: 'Gagal menghapus pendaftar' })
    } finally {
      setLoading(null)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const numericData = {
      ...form,
      height_cm: Number(form.height_cm),
      weight_kg: Number(form.weight_kg),
    }

    const result = await createApplicant(numericData as any)
    if (result?.error) {
      setFormError(String(result.error))
      return
    }
    setNotification({ type: 'success', message: 'Pendaftar berhasil ditambahkan' })
    setShowAdd(false)
    setForm({ full_name: '', email: '', phone: '', date_of_birth: '', address: '', city: '', province: '', height_cm: '', weight_kg: '', occupation: '', education: '' })
    router.refresh()
  }

  const statCards = [
    { label: 'Total', value: stats.total, color: 'text-primary' },
    { label: 'Pending', value: stats.pending, color: 'text-yellow-600' },
    { label: 'Terverifikasi', value: stats.verified, color: 'text-green-600' },
    { label: 'Finalis', value: stats.finalist, color: 'text-accent' },
    { label: 'Ditolak', value: stats.rejected, color: 'text-red-600' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-dark-text">Pendaftar</h1>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Pendaftar
        </Button>
      </div>

      {notification && (
        <div className={`mb-4 rounded-lg p-3 text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {notification.message}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Daftar Pendaftar</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                placeholder="Cari pendaftar..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted">
              {search ? 'Tidak ada hasil pencarian' : 'Belum ada pendaftar'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="pb-3 font-medium">Nama</th>
                    <th className="pb-3 font-medium hidden md:table-cell">Email</th>
                    <th className="pb-3 font-medium hidden lg:table-cell">Kabupaten/Kota</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium hidden sm:table-cell">Tanggal</th>
                    <th className="pb-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id} className="border-b border-border/50 hover:bg-gray-50/50">
                      <td className="py-3 font-medium">{a.full_name}</td>
                      <td className="py-3 text-muted hidden md:table-cell">{a.email}</td>
                      <td className="py-3 text-muted hidden lg:table-cell">{a.city}</td>
                      <td className="py-3">
                        <div className="relative inline-block">
                          <select
                            value={a.status}
                            onChange={(e) => handleStatusChange(a.id, e.target.value)}
                            disabled={loading === a.id}
                            className="appearance-none rounded-full border-0 bg-transparent px-3 py-1 text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                            style={{
                              backgroundColor:
                                a.status === 'finalist' ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)' :
                                a.status === 'verified' ? '#16a34a20' :
                                a.status === 'rejected' ? '#dc262620' :
                                '#eab30820',
                              color:
                                a.status === 'finalist' ? 'var(--color-accent-dark)' :
                                a.status === 'verified' ? '#15803d' :
                                a.status === 'rejected' ? '#b91c1c' :
                                '#a16207',
                            }}
                          >
                            <option value="pending">Pending</option>
                            <option value="verified">Terverifikasi</option>
                            <option value="rejected">Ditolak</option>
                            <option value="finalist">Finalis</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-3 text-muted hidden sm:table-cell text-xs">
                        {new Date(a.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Detail ${a.full_name}`}
                            onClick={() => setDetail(a)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(a.id)}
                            disabled={loading === a.id}
                          >
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

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Tambah Pendaftar</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowAdd(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nama Lengkap</Label>
                    <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <Label>Telepon</Label>
                    <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label>Tgl Lahir</Label>
                    <Input required type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
                  </div>
                  <div>
                    <Label>Kabupaten/Kota</Label>
                    <Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label>Provinsi</Label>
                    <Input required value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label>Alamat</Label>
                    <Input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                  <div>
                    <Label>Tinggi (cm)</Label>
                    <Input required type="number" value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} />
                  </div>
                  <div>
                    <Label>Berat (kg)</Label>
                    <Input required type="number" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
                  </div>
                  <div>
                    <Label>Pekerjaan</Label>
                    <Input required value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
                  </div>
                  <div>
                    <Label>Pendidikan</Label>
                    <Input required value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} />
                  </div>
                </div>
                {formError && <p className="text-sm text-red-600">{formError}</p>}
                <Button type="submit" className="w-full">Simpan</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDetail(null)}
        >
          <Card
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Detail Pendaftar</CardTitle>
                <p className="mt-1 text-sm text-muted">{detail.full_name}</p>
              </div>
              <Button variant="ghost" size="icon" aria-label="Tutup detail" onClick={() => setDetail(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <h4 className={sectionTitle}>Identitas</h4>
                <DetailRow label="Nama Lengkap" value={detail.full_name} />
                <DetailRow label="Email" value={detail.email} />
                <DetailRow label="Nomor Telepon" value={detail.phone} />
                <DetailRow label="Tempat Lahir" value={detail.place_of_birth} />
                <DetailRow label="Tanggal Lahir" value={formatDate(detail.date_of_birth)} />
                <DetailRow label="Jenis Kelamin" value={detail.gender} />
                <DetailRow label="NIM" value={detail.nim} />
              </div>

              <div>
                <h4 className={sectionTitle}>Akademik</h4>
                <DetailRow label="Fakultas" value={facultyName(detail.faculty)} />
                <DetailRow label="Program Studi" value={prodiName(detail.study_program)} />
                <DetailRow label="Semester" value={detail.semester} />
                <DetailRow label="Pendidikan Terakhir" value={detail.education} />
                <DetailRow label="Pekerjaan" value={detail.occupation} />
              </div>

              <div>
                <h4 className={sectionTitle}>Alamat & Fisik</h4>
                <DetailRow label="Alamat" value={detail.address} />
                <DetailRow label="Kabupaten/Kota" value={detail.city} />
                <DetailRow label="Provinsi" value={detail.province} />
                <DetailRow label="Tinggi Badan (cm)" value={detail.height_cm} />
                <DetailRow label="Berat Badan (kg)" value={detail.weight_kg} />
              </div>

              <div>
                <h4 className={sectionTitle}>Media Sosial</h4>
                <DetailRow label="Instagram" value={detail.instagram} />
                <DetailRow label="TikTok" value={detail.tiktok} />
                <DetailRow label="Facebook" value={detail.facebook} />
              </div>

              {detail.essay && (
                <div>
                  <h4 className={sectionTitle}>Esai Motivasi</h4>
                  <p className="whitespace-pre-wrap rounded-lg border border-border bg-light-gray p-4 text-sm text-dark-text">
                    {detail.essay}
                  </p>
                </div>
              )}

              <div>
                <h4 className={sectionTitle}>Status & Pendaftaran</h4>
                <DetailRow label="Status" value={STATUS_LABELS[detail.status] || detail.status} />
                <DetailRow label="Tanggal Daftar" value={formatDateTime(detail.created_at)} />
              </div>

              {docLinks.length > 0 && (
                <div>
                  <h4 className={sectionTitle}>Dokumen</h4>
                  {docLinks.map(([label, url]) => (
                    <div
                      key={label}
                      className="flex justify-between gap-4 border-b border-border/50 py-2 last:border-0 last:pb-0"
                    >
                      <span className="shrink-0 text-sm text-dark-secondary">{label}</span>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary-blue underline"
                      >
                        Lihat
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
