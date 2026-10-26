'use client'

import { useState, useTransition } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { CheckCircle2, Crown, ExternalLink, MessageCircle, Search, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  buildSemifinalistWhatsAppUrl,
  type SelectionAdminData,
  type SelectionApplicant,
  type SelectionStage,
} from '@/lib/selection'
import {
  getSelectionAdminData,
  publishFinalists,
  saveFacultyWhatsAppGroup,
  saveSelectionAnnouncement,
  setRegistrationYear,
  updateSelectionStage,
} from '@/server/actions/selection'
import { saveAuditionDate } from '@/server/actions/registration-rules'

const STAGE_LABELS: Record<SelectionStage, string> = {
  semifinalist: 'Semifinalis',
  finalist_draft: 'Draf finalis',
  finalist: 'Finalis',
  not_selected_faculty: 'Tidak lolos fakultas',
  not_selected_university: 'Tidak lolos ke final',
}
const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu verifikasi', verified: 'Terverifikasi', rejected: 'Ditolak', finalist: 'Finalis',
}
const selectClass = 'h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-blue/30 disabled:opacity-50'
const wrapButton = 'h-auto min-h-9 whitespace-normal text-left'

function category(gender: string | null) {
  if (gender === 'Laki-laki') return 'Nyong'
  if (gender === 'Perempuan') return 'Noni'
  return gender || 'Kategori belum tersedia'
}

export function SelectionClient({ initialData, initialAuditionDate }: { initialData: SelectionAdminData; initialAuditionDate?: string }) {
  const [data, setData] = useState(initialData)
  const [isPending, startTransition] = useTransition()
  const [registrationYear, setYear] = useState(String(initialData.activeYear))
  const [auditionDates, setAuditionDates] = useState<Record<number, string>>({
    [initialData.activeYear]: initialAuditionDate ?? (initialData.activeYear === 2026 ? '2026-10-26' : ''),
  })
  const [auditionDate, setAuditionDate] = useState(auditionDates[initialData.activeYear])
  const [facultyFilter, setFacultyFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState('all')
  const [genderFilter, setGenderFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [title, setTitle] = useState(initialData.announcement?.title || '')
  const [body, setBody] = useState(initialData.announcement?.body || '')
  const [groupInputs, setGroupInputs] = useState<Record<string, string>>(
    Object.fromEntries(initialData.groups.map((group) => [group.faculty_id, group.invite_url])),
  )
  const [notice, setNotice] = useState<{ error: boolean; message: string } | null>(null)
  const [invitationId, setInvitationId] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<{
    title: string; description: string; label: string; action: () => Promise<void>
  } | null>(null)

  const published = Boolean(data.announcement?.published_at)
  const isActiveYear = data.year === data.activeYear
  const readOnly = published
  const drafts = data.applicants.filter((applicant) => applicant.stage === 'finalist_draft')
  const announcementDirty = title !== (data.announcement?.title || '') || body !== (data.announcement?.body || '')
  const registrationDirty = Number(registrationYear) !== data.activeYear || auditionDate !== (auditionDates[data.activeYear] || '')
  const validRegistrationYear = Number.isInteger(Number(registrationYear)) && Number(registrationYear) >= 2000 && Number(registrationYear) <= 2100
  const validAuditionDate = validRegistrationYear && /^\d{4}-\d{2}-\d{2}$/.test(auditionDate) && Number(auditionDate.slice(0, 4)) === Number(registrationYear)
  const years = [...new Set([...data.years, data.year, data.activeYear])].sort((a, b) => b - a)
  const facultyName = (faculty: string | null) => data.faculties.find((item) => item.id === faculty || item.name === faculty)?.name || faculty || 'Fakultas belum tersedia'
  const facultyId = (faculty: string | null) => data.faculties.find((item) => item.id === faculty || item.name === faculty)?.id
  const facultyOptions = [...new Set([...data.faculties.map((item) => item.name), ...data.applicants.map((applicant) => facultyName(applicant.faculty))])]
  const filtered = data.applicants.filter((applicant) => {
    const query = search.trim().toLocaleLowerCase('id-ID')
    return (facultyFilter === 'all' || facultyName(applicant.faculty) === facultyFilter)
      && (stageFilter === 'all' || (applicant.stage || applicant.status) === stageFilter)
      && (genderFilter === 'all' || category(applicant.gender) === genderFilter)
      && [applicant.full_name, facultyName(applicant.faculty), applicant.study_program || ''].some((value) => value.toLocaleLowerCase('id-ID').includes(query))
  })

  function invitation(applicant: SelectionApplicant) {
    const groupUrl = data.groups.find((group) => group.faculty_id === facultyId(applicant.faculty))?.invite_url
    if (!groupUrl) return { url: null, error: 'Tautan grup fakultas belum diatur.' }
    try {
      return {
        url: buildSemifinalistWhatsAppUrl({
          name: applicant.full_name, phone: applicant.phone, faculty: facultyName(applicant.faculty),
          year: applicant.selection_year, groupUrl,
        }),
        error: null,
      }
    } catch {
      return { url: null, error: 'Nomor WhatsApp atau tautan grup tidak valid. Periksa data pendaftar dan pengaturan grup.' }
    }
  }

  function changeYear(year: number) {
    if ((announcementDirty || registrationDirty || data.faculties.some((faculty) => (groupInputs[faculty.id] || '') !== (data.groups.find((group) => group.faculty_id === faculty.id)?.invite_url || '')))
      && !window.confirm('Ada perubahan yang belum disimpan. Tetap ganti tahun seleksi?')) return
    setNotice(null)
    startTransition(async () => {
      try {
        const next = await getSelectionAdminData(year)
        setData(next)
        setTitle(next.announcement?.title || '')
        setBody(next.announcement?.body || '')
        setGroupInputs(Object.fromEntries(next.groups.map((group) => [group.faculty_id, group.invite_url])))
        setFacultyFilter('all')
        setStageFilter('all')
        setGenderFilter('all')
        setSearch('')
        setInvitationId(null)
      } catch (error) {
        setNotice({ error: true, message: error instanceof Error ? error.message : 'Gagal memuat tahun seleksi.' })
      }
    })
  }

  function mutate(action: () => Promise<void>, message: string, syncAnnouncement = false) {
    setNotice(null)
    startTransition(async () => {
      try {
        await action()
        // Always reload authoritative stages before offering invitations or publication.
        const next = await getSelectionAdminData(data.year)
        setData(next)
        if (syncAnnouncement) {
          setTitle(next.announcement?.title || '')
          setBody(next.announcement?.body || '')
        }
        setNotice({ error: false, message })
        setConfirmation(null)
      } catch (error) {
        setNotice({ error: true, message: error instanceof Error ? error.message : 'Perubahan gagal disimpan. Muat ulang data sebelum mencoba lagi.' })
      }
    })
  }

  function confirmStage(applicant: SelectionApplicant, stage: SelectionStage | 'reset_finalist_draft', label: string) {
    setNotice(null)
    setConfirmation({
      title: label,
      description: `${applicant.full_name} | ${facultyName(applicant.faculty)} | Seleksi ${data.year}. Perubahan tahap akan disimpan. Tidak ada pesan WhatsApp yang dikirim otomatis.`,
      label: 'Konfirmasi dan Simpan',
      action: () => updateSelectionStage(applicant.id, stage),
    })
  }

  const invitationApplicant = data.applicants.find((applicant) => applicant.id === invitationId)
  const invitationData = invitationApplicant ? invitation(invitationApplicant) : null
  const invitationText = invitationData?.url ? new URL(invitationData.url).searchParams.get('text') : null

  return (
    <div className="space-y-6" aria-busy={isPending}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">Nyong Noni UNIMA</p>
          <h1 className="text-2xl font-bold text-dark-text">Seleksi & Pengumuman</h1>
          <p className="mt-2 text-sm text-muted">Kelola tahap seleksi, undangan, dan hasil akhir tanpa kuota fakultas.</p>
        </div>
        <div className="w-full sm:w-44">
          <Label htmlFor="selection-year">Tahun seleksi</Label>
          <select id="selection-year" className={`${selectClass} mt-1`} value={data.year} disabled={isPending} onChange={(event) => changeYear(Number(event.target.value))}>
            {years.map((year) => <option key={year} value={year}>{year}{year === data.activeYear ? ' (aktif)' : ''}</option>)}
          </select>
        </div>
      </div>

      {notice && <div role={notice.error ? 'alert' : 'status'} className={`rounded-lg p-4 text-sm ${notice.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{notice.message}</div>}
      {isPending && <p role="status" className="text-sm text-primary-blue">Memproses dan memuat data seleksi...</p>}

      <Card>
        <CardContent className="pt-6">
          <form className="space-y-4" onSubmit={(event) => {
            event.preventDefault()
            const year = Number(registrationYear)
            if (!validAuditionDate) {
              setNotice({ error: true, message: 'Isi tanggal audisi yang sesuai dengan tahun pendaftaran.' })
              return
            }
            mutate(async () => {
              await saveAuditionDate(year, auditionDate)
              setAuditionDates((dates) => ({ ...dates, [year]: auditionDate }))
              await setRegistrationYear(year)
            }, `Tanggal audisi dan tahun pendaftaran aktif disimpan: ${year}.`)
          }}>
            <div>
              <h2 className="font-semibold text-dark-text">Tahun pendaftaran aktif: {data.activeYear}</h2>
              <p className="mt-1 text-sm text-dark-text">Tanggal audisi aktif: {auditionDates[data.activeYear] || 'Belum diatur'}</p>
              <p className="mt-1 text-sm text-muted">Mengganti tampilan tahun di atas tidak mengubah tahun pendaftaran.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[8rem_12rem_auto] lg:items-end">
              <div>
                <Label htmlFor="registration-year">Tahun aktif baru</Label>
                <Input id="registration-year" className="mt-1" type="number" min={2000} max={2100} required value={registrationYear} onChange={(event) => {
                  setYear(event.target.value)
                  setAuditionDate(auditionDates[Number(event.target.value)] || '')
                }} disabled={isPending} />
              </div>
              <div>
                <Label htmlFor="audition-date">Tanggal audisi</Label>
                <Input id="audition-date" className="mt-1" type="date" min={validRegistrationYear ? `${Number(registrationYear)}-01-01` : undefined} max={validRegistrationYear ? `${Number(registrationYear)}-12-31` : undefined} required value={auditionDate} onChange={(event) => setAuditionDate(event.target.value)} disabled={isPending} aria-describedby="audition-date-help" />
              </div>
              <Button type="submit" className="h-auto whitespace-normal sm:col-span-2 lg:col-span-1" disabled={isPending || !registrationDirty || !validAuditionDate}>Simpan Tahun Aktif</Button>
            </div>
            <p id="audition-date-help" className="text-xs text-muted">Tanggal audisi digunakan untuk validasi usia pendaftar. Tanggal wajib sesuai tahun pendaftaran dan disimpan sebelum tahun diaktifkan.</p>
          </form>
        </CardContent>
      </Card>

      {(published || !isActiveYear) && <div className="rounded-lg border border-accent/40 bg-accent/10 p-4 text-sm text-dark-text">
        {published ? 'Pengumuman telah diterbitkan. Hasil seleksi dan isi pengumuman bersifat baca saja.' : 'Arsip tahun seleksi. Publikasi hanya tersedia pada tahun pendaftaran aktif.'}
      </div>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5 text-primary-blue" />Rekap per Fakultas</CardTitle>
          <p className="text-sm text-muted">Jumlah seluruh pendaftar tahun {data.year}, tidak mengikuti filter dan bukan kuota.</p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {facultyOptions.map((faculty) => {
            const applicants = data.applicants.filter((applicant) => facultyName(applicant.faculty) === faculty)
            return <div key={faculty} className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-dark-text">{faculty}</h3>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
                <div><dt>Pendaftar</dt><dd className="mt-1 text-lg font-bold text-primary-blue">{applicants.length}</dd></div>
                <div><dt>Riwayat semifinalis</dt><dd className="mt-1 text-lg font-bold text-primary-blue">{applicants.filter((applicant) => applicant.semifinalist_at).length}</dd></div>
                <div><dt>Draf finalis</dt><dd className="mt-1 font-semibold text-dark-text">{applicants.filter((applicant) => applicant.stage === 'finalist_draft').length}</dd></div>
                <div><dt>Finalis</dt><dd className="mt-1 font-semibold text-dark-text">{applicants.filter((applicant) => applicant.stage === 'finalist').length}</dd></div>
              </dl>
            </div>
          })}
          {facultyOptions.length === 0 && <p className="text-sm text-muted">Belum ada data fakultas.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Peserta Seleksi ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div><Label htmlFor="selection-search">Cari peserta</Label><div className="relative mt-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted" /><Input id="selection-search" placeholder="Nama atau program studi" className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} /></div></div>
            <div><Label htmlFor="faculty-filter">Fakultas</Label><select id="faculty-filter" className={`${selectClass} mt-1`} value={facultyFilter} onChange={(event) => setFacultyFilter(event.target.value)}><option value="all">Semua fakultas</option>{facultyOptions.map((faculty) => <option key={faculty} value={faculty}>{faculty}</option>)}</select></div>
            <div><Label htmlFor="stage-filter">Tahap</Label><select id="stage-filter" className={`${selectClass} mt-1`} value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option value="all">Semua tahap</option><option value="pending">Menunggu verifikasi</option><option value="verified">Terverifikasi</option><option value="rejected">Ditolak</option>{Object.entries(STAGE_LABELS).map(([stage, label]) => <option key={stage} value={stage}>{label}</option>)}</select></div>
            <div><Label htmlFor="gender-filter">Kategori</Label><select id="gender-filter" className={`${selectClass} mt-1`} value={genderFilter} onChange={(event) => setGenderFilter(event.target.value)}><option value="all">Nyong & Noni</option><option value="Nyong">Nyong</option><option value="Noni">Noni</option></select></div>
          </div>
          <div className="space-y-3">
            {filtered.map((applicant) => {
              const canInvite = Boolean(applicant.semifinalist_at) && ['semifinalist', 'finalist_draft', 'finalist'].includes(applicant.stage || '')
              const wa = canInvite ? invitation(applicant) : null
              return <article key={applicant.id} className="flex flex-col gap-4 rounded-lg border border-border p-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <h3 className="break-words font-semibold text-dark-text">{applicant.full_name}</h3>
                  <p className="mt-1 break-words text-sm text-muted">{facultyName(applicant.faculty)}{applicant.study_program ? ` | ${applicant.study_program}` : ''}</p>
                  <p className="mt-1 text-xs text-muted">{category(applicant.gender)} | {applicant.selection_year} | {STATUS_LABELS[applicant.status] || applicant.status}</p>
                  <span className="mt-2 inline-block rounded-full bg-primary-blue/5 px-3 py-1 text-xs font-semibold text-primary-blue">{applicant.stage ? STAGE_LABELS[applicant.stage] : 'Belum ditetapkan'}</span>
                </div>
                <div className="flex flex-col gap-2 xl:max-w-sm xl:items-end">
                  {!readOnly && <div className="flex flex-wrap gap-2 xl:justify-end">
                    {!applicant.stage && applicant.status === 'verified' && <Button size="sm" className={wrapButton} disabled={isPending} onClick={() => confirmStage(applicant, 'semifinalist', 'Tetapkan sebagai Semifinalis')}>Tetapkan sebagai Semifinalis</Button>}
                    {!applicant.stage && ['pending', 'verified'].includes(applicant.status) && <Button size="sm" variant="outline" className={wrapButton} disabled={isPending} onClick={() => confirmStage(applicant, 'not_selected_faculty', 'Tidak lolos fakultas')}>Tidak lolos fakultas</Button>}
                    {applicant.stage === 'semifinalist' && applicant.status === 'verified' && <>
                      <Button size="sm" variant="accent" className={wrapButton} disabled={isPending} onClick={() => confirmStage(applicant, 'finalist_draft', 'Pilih untuk Draf Finalis')}>Pilih untuk Draf Finalis</Button>
                      <Button size="sm" variant="outline" className={wrapButton} disabled={isPending} onClick={() => confirmStage(applicant, 'not_selected_university', 'Tidak lolos ke final')}>Tidak lolos ke final</Button>
                    </>}
                    {applicant.stage === 'finalist_draft' && applicant.status === 'verified' && <Button size="sm" variant="outline" className={wrapButton} disabled={isPending} onClick={() => confirmStage(applicant, 'reset_finalist_draft', 'Reset pilihan draf finalis')}>Reset Pilihan Draf</Button>}
                  </div>}
                  {canInvite && <div className="space-y-1 xl:text-right">
                    <Button size="sm" variant="outline" className={wrapButton} disabled={isPending || !wa?.url} onClick={() => setInvitationId(applicant.id)}><MessageCircle className="mr-2 h-4 w-4 shrink-0" />Kirim Undangan WA</Button>
                    {wa?.error ? <p className="max-w-sm text-xs text-muted">{wa.error}</p> : <p className="text-xs text-muted">Pratinjau undangan sebelum membuka WhatsApp.</p>}
                  </div>}
                </div>
              </article>
            })}
            {filtered.length === 0 && <p className="py-12 text-center text-sm text-muted">Tidak ada peserta yang sesuai filter.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><MessageCircle className="h-5 w-5 text-primary-blue" />Grup WhatsApp Fakultas | {data.year}</CardTitle>
          <p className="text-sm text-muted">Tautan hanya tersedia untuk admin dan undangan pribadi. Kosongkan lalu simpan untuk menghapus tautan. Pengaturan grup tidak mengubah hasil seleksi yang diterbitkan.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.faculties.map((faculty) => <form key={faculty.id} className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(event) => {
            event.preventDefault()
            mutate(() => saveFacultyWhatsAppGroup(data.year, faculty.id, (groupInputs[faculty.id] || '').trim()), `Pengaturan grup ${faculty.name} disimpan.`)
          }}>
            <div className="min-w-0 flex-1">
              <Label htmlFor={`group-${faculty.id}`}>{faculty.name}</Label>
              <Input id={`group-${faculty.id}`} className="mt-1" type="url" placeholder="https://chat.whatsapp.com/token" value={groupInputs[faculty.id] || ''} disabled={isPending} onChange={(event) => setGroupInputs({ ...groupInputs, [faculty.id]: event.target.value })} />
            </div>
            <Button type="submit" variant="outline" disabled={isPending || (groupInputs[faculty.id] || '') === (data.groups.find((group) => group.faculty_id === faculty.id)?.invite_url || '')}>Simpan Grup</Button>
          </form>)}
          {data.faculties.length === 0 && <p className="text-sm text-muted">Belum ada fakultas untuk pengaturan grup.</p>}
        </CardContent>
      </Card>

      <Card className="border-accent/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Crown className="h-5 w-5 text-accent-dark" />Pengumuman Finalis | {data.year}</CardTitle>
          <p className="text-sm text-muted">Draf tidak tampil di situs publik. Publikasi mengunci hasil seleksi dan pengumuman tahun ini.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {published ? <div className="space-y-4">
            <p className="flex items-center gap-2 text-sm font-medium text-green-700"><CheckCircle2 className="h-4 w-4" />Diterbitkan {new Date(data.announcement!.published_at!).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Makassar' })}</p>
            <h3 className="break-words text-xl font-bold text-dark-text">{data.announcement?.title}</h3>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-dark-text">{data.announcement?.body}</p>
            <a href="/announcements" className="inline-flex items-center gap-2 text-sm font-medium text-primary-blue underline">Lihat pengumuman publik<ExternalLink className="h-4 w-4" /></a>
          </div> : <form className="space-y-4" onSubmit={(event) => {
            event.preventDefault()
            mutate(() => saveSelectionAnnouncement(data.year, title, body), 'Draf pengumuman disimpan, belum diterbitkan.', true)
          }}>
            <div><Label htmlFor="announcement-title">Judul pengumuman</Label><Input id="announcement-title" className="mt-1" value={title} maxLength={200} required disabled={isPending || readOnly} onChange={(event) => setTitle(event.target.value)} /></div>
            <div><Label htmlFor="announcement-body">Isi pengumuman</Label><textarea id="announcement-body" className="mt-1 min-h-40 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/30 disabled:opacity-50" value={body} maxLength={20000} required disabled={isPending || readOnly} onChange={(event) => setBody(event.target.value)} /><p className="mt-1 text-xs text-muted">Teks biasa, tanpa HTML. Baris baru akan dipertahankan.</p></div>
            <Button type="submit" variant="outline" disabled={isPending || readOnly || !announcementDirty || !title.trim() || !body.trim()}>Simpan Draf Pengumuman</Button>
          </form>}

          <div className="rounded-lg border border-border bg-light-gray p-4">
            <h3 className="font-semibold text-dark-text">{published ? 'Finalis yang diterbitkan' : `Pratinjau kandidat terpilih (${drafts.length})`}</h3>
            <p className="mt-1 text-xs text-muted">Daftar ini mencakup seluruh fakultas, tidak mengikuti filter peserta.</p>
            <ul className="mt-4 space-y-3">
              {published ? data.announcement?.participants.map((participant) => <li key={participant.id} className="text-sm"><span className="font-medium text-dark-text">{participant.full_name}</span><p className="mt-1 text-xs text-muted">{participant.faculty} | {participant.study_program} | {category(participant.gender)}</p></li>) : drafts.map((applicant) => <li key={applicant.id} className="text-sm"><span className="font-medium text-dark-text">{applicant.full_name}</span><p className="mt-1 text-xs text-muted">{facultyName(applicant.faculty)} | {applicant.study_program || 'Program studi belum tersedia'} | {category(applicant.gender)}</p></li>)}
            </ul>
            {!published && drafts.length === 0 && <p className="mt-3 text-sm text-muted">Belum ada kandidat dalam draf finalis.</p>}
          </div>
          {!published && <div className="space-y-2">
            <Button variant="accent" className="h-auto whitespace-normal" disabled={isPending || !isActiveYear || drafts.length === 0 || announcementDirty || !title.trim() || !body.trim()} onClick={() => {
              setNotice(null)
              setConfirmation({
                title: 'Terbitkan Pengumuman Finalis',
                description: `Anda akan menerbitkan ${drafts.length} finalis untuk tahun ${data.year}. Nama peserta, fakultas, dan program studi akan tampil di situs publik. Tindakan ini tidak dapat dibatalkan. Hasil seleksi dan isi pengumuman akan dikunci.`,
                label: 'Terbitkan Pengumuman Finalis',
                action: () => publishFinalists(data.year, { candidateIds: drafts.map((applicant) => applicant.id), title, body }),
              })
            }}>Terbitkan Pengumuman Finalis</Button>
            <p className="text-xs text-muted">{announcementDirty ? 'Simpan perubahan judul dan isi sebelum menerbitkan.' : 'Pastikan daftar kandidat dan isi pengumuman benar. Publikasi tidak dapat dibatalkan.'}</p>
          </div>}
        </CardContent>
      </Card>

      <Dialog.Root open={Boolean(confirmation)} onOpenChange={(open) => { if (!open && !isPending) setConfirmation(null) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-white p-6 shadow-xl">
            <Dialog.Title className="pr-8 text-lg font-bold text-dark-text">{confirmation?.title}</Dialog.Title>
            <Dialog.Description className="mt-3 text-sm leading-relaxed text-muted">{confirmation?.description}</Dialog.Description>
            {notice?.error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{notice.message}</p>}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Dialog.Close asChild><Button variant="outline" disabled={isPending}>Batal</Button></Dialog.Close>
              <Button className="h-auto whitespace-normal" disabled={isPending} onClick={() => { if (confirmation) mutate(confirmation.action, 'Perubahan seleksi berhasil disimpan.') }}>{isPending ? 'Menyimpan...' : confirmation?.label}</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={Boolean(invitationApplicant)} onOpenChange={(open) => { if (!open) setInvitationId(null) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-white p-6 shadow-xl">
            <Dialog.Title className="pr-8 text-lg font-bold text-dark-text">Pratinjau Undangan WA</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted">Periksa undangan sebelum membuka WhatsApp. Anda tetap perlu menekan kirim di WhatsApp. Situs ini tidak mencatat pesan sebagai terkirim.</Dialog.Description>
            <Dialog.Close asChild><Button variant="ghost" size="icon" className="absolute right-3 top-3" aria-label="Tutup pratinjau"><X className="h-4 w-4" /></Button></Dialog.Close>
            {invitationApplicant && <dl className="my-4 space-y-2 text-sm">
              <div><dt className="text-xs text-muted">Nama</dt><dd className="font-medium">{invitationApplicant.full_name}</dd></div>
              <div><dt className="text-xs text-muted">Fakultas / Tahun</dt><dd>{facultyName(invitationApplicant.faculty)} / {invitationApplicant.selection_year}</dd></div>
              <div><dt className="text-xs text-muted">Nomor WhatsApp</dt><dd>{invitationApplicant.phone}</dd></div>
            </dl>}
            {invitationText && <p className="mb-6 whitespace-pre-wrap break-words rounded-lg border border-border bg-light-gray p-4 text-sm leading-relaxed">{invitationText}</p>}
            {invitationData?.url ? <Button asChild className="w-full"><a href={invitationData.url} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" />Kirim Undangan WA<ExternalLink className="ml-2 h-4 w-4" /></a></Button> : <p className="text-sm text-muted">{invitationData?.error}</p>}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
