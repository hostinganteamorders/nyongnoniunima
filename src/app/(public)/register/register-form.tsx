'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useForm, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { getFaculties, getStudyPrograms } from '@/server/actions/unima'
import {
  createRegistrationSchema,
  createRegistrationStepSchema,
  type RegistrationInput,
} from '@/lib/validations/registration'

interface Faculty { id: string; name: string; code: string }
interface StudyProgram { id: string; faculty_id: string; name: string; code: string }

const STEPS = [
  { title: 'Biodata', description: 'Data diri & akademik' },
  { title: 'Alamat & Fisik', description: 'Alamat & data fisik' },
  { title: 'Dokumen & Esai', description: 'Upload & motivasi' },
  { title: 'Konfirmasi', description: 'Review data' },
]

const FIELD_LABELS: Record<string, string> = {
  full_name: 'Nama Lengkap',
  email: 'Email',
  phone: 'Nomor Telepon',
  date_of_birth: 'Tanggal Lahir',
  place_of_birth: 'Tempat Lahir',
  gender: 'Jenis Kelamin',
  nim: 'NIM',
  faculty: 'Fakultas',
  study_program: 'Program Studi',
  semester: 'Semester',
  ipk: 'IPK',
  address: 'Alamat',
  city: 'Kabupaten/Kota',
  province: 'Provinsi',
  height_cm: 'Tinggi Badan (cm)',
  weight_kg: 'Berat Badan (kg)',
  occupation: 'Pekerjaan',
  education: 'Pendidikan Terakhir',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  foreign_language: 'Bahasa Asing',
  essay: 'Esai Motivasi',
}

const Input = ({ id, label, type = "text", placeholder, error, options, hint, ...props }: any) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-body-sm text-dark-text font-medium">{label}</label>
    {options ? (
      <select id={id} className={`w-full rounded-lg border ${error ? 'border-error' : 'border-border'} bg-white px-4 py-2.5 text-body text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue`} {...props}>
        <option value="">Pilih {label}</option>
        {options.map((o: any) => (
          <option key={o.id || o} value={o.id || o}>{o.name || o}</option>
        ))}
      </select>
    ) : (
      <input id={id} type={type} className={`w-full rounded-lg border ${error ? 'border-error' : 'border-border'} bg-white px-4 py-2.5 text-body text-dark-text placeholder:text-dark-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue transition-all`} placeholder={placeholder} {...props} />
    )}
    {hint && !error && <span className="text-xs text-dark-secondary/70">{hint}</span>}
    {error && <span className="text-xs text-error">{error}</span>}
  </div>
)

export function RegisterForm({ auditionStart }: { auditionStart: string }) {
  const [step, setStep] = useState(0)
  const [faculties, setFaculties] = useState<Faculty[]>([])
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([])
  const [filteredPrograms, setFilteredPrograms] = useState<StudyProgram[]>([])
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submissionInFlight = useRef(false)
  const submission = useRef<{ id: string; payload: string } | null>(null)

  useEffect(() => {
    getFaculties().then(setFaculties).catch(() => {})
    getStudyPrograms().then(setStudyPrograms).catch(() => {})
  }, [])

  const stepSchemas = createRegistrationStepSchema(auditionStart)
  const form = useForm<RegistrationInput>({
    resolver: zodResolver(createRegistrationSchema(auditionStart)),
    defaultValues: {
      full_name: '', email: '', phone: '', date_of_birth: '', place_of_birth: '',
      gender: undefined, nim: '', faculty: '', study_program: '', semester: undefined,
      ipk: undefined,
      address: '', city: '', province: '', height_cm: undefined, weight_kg: undefined,
      occupation: '', education: '', instagram: '', tiktok: '', facebook: '',
      foreign_language: '', essay: '', consent: false as unknown as true,
    },
    mode: 'onChange',
  })

  const { register, handleSubmit, formState: { errors }, clearErrors, setError, getValues, watch, setValue } = form
  const selectedFaculty = watch('faculty')
  const stepRef = useRef(0)
  stepRef.current = step

  useEffect(() => {
    if (selectedFaculty) {
      setFilteredPrograms(studyPrograms.filter((sp: any) => sp.faculty_id === selectedFaculty))
    } else {
      setFilteredPrograms([])
    }
  }, [selectedFaculty, studyPrograms])

  const fieldsByStep: Record<number, (keyof RegistrationInput)[]> = {
    0: ['full_name', 'email', 'phone', 'date_of_birth', 'place_of_birth', 'gender', 'nim', 'faculty', 'study_program', 'semester', 'ipk'],
    1: ['address', 'city', 'province', 'height_cm', 'weight_kg', 'occupation', 'education'],
    2: ['instagram', 'tiktok', 'facebook', 'foreign_language', 'essay', 'consent'],
  }

  const validateStep = async (targetStep: number): Promise<boolean> => {
    const fields = fieldsByStep[targetStep] || []
    if (fields.length === 0) return true
    clearErrors(fields)
    const result = stepSchemas[targetStep].safeParse(getValues())
    if (result.success) return true
    for (const issue of result.error.issues) {
      setError(issue.path[0] as keyof RegistrationInput, { type: 'validation', message: issue.message })
    }
    return false
  }

  const nextStep = async () => {
    setSubmitError('')
    const valid = await validateStep(step)
    if (valid) setStep((prev) => Math.min(prev + 1, STEPS.length - 1))
  }

  const prevStep = () => {
    setSubmitError('')
    setStep((prev) => Math.max(prev - 1, 0))
  }

  const displayValue = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === '') return '-'
    if (key === 'faculty') return faculties.find((f) => f.id === value)?.name || String(value)
    if (key === 'study_program') return studyPrograms.find((sp) => sp.id === value)?.name || String(value)
    if (key === 'date_of_birth') {
      const [y, m, d] = String(value).split('-').map(Number)
      if (y && m && d) return new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      return String(value)
    }
    return String(value)
  }

  const onSubmit = async (data: RegistrationInput) => {
    if (submissionInFlight.current || stepRef.current === STEPS.length) return
    submissionInFlight.current = true
    setSubmitError('')
    setSubmitting(true)
    try {
      for (let i = 0; i < 3; i++) {
        const valid = await validateStep(i)
        if (!valid) { setStep(i); setSubmitError(`Lengkapi data pada langkah "${STEPS[i].title}" terlebih dahulu`); return }
      }
      const payload = JSON.stringify(data)
      if (!submission.current || submission.current.payload !== payload) {
        submission.current = { id: crypto.randomUUID(), payload }
      }
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) formData.append(key, String(value))
      })
      formData.append('submission_id', submission.current.id)
      const response = await fetch('/api/register', { method: 'POST', headers: { Accept: 'application/json' }, body: formData })
      const result: unknown = await response.json()
      if (!result || typeof result !== 'object') throw new Error('Invalid registration response')
      if ('error' in result && typeof result.error === 'string' && result.error) {
        setSubmitError(result.error)
        return
      }
      if (!response.ok || !('data' in result) || !result.data || typeof result.data !== 'object'
        || !('id' in result.data) || typeof result.data.id !== 'string' || !result.data.id) {
        throw new Error('Missing registration acknowledgement')
      }
      setStep(STEPS.length)
    } catch (error) {
      console.error('Registration request error', { name: error instanceof Error ? error.name : 'UnknownError' })
      setSubmitError('Respons pengiriman belum dapat dikonfirmasi. Data mungkin sudah tersimpan. Periksa koneksi, lalu coba lagi dari halaman yang sama tanpa mengubah data.')
    } finally {
      submissionInFlight.current = false
      setSubmitting(false)
    }
  }

  const onInvalid = (invalid: FieldErrors<RegistrationInput>) => {
    const invalidStep = [0, 1, 2].find((index) => fieldsByStep[index].some((field) => invalid[field]))
    if (invalidStep !== undefined) setStep(invalidStep)
    setSubmitError(invalidStep === undefined ? 'Periksa kembali data pendaftaran.' : `Lengkapi data pada langkah "${STEPS[invalidStep].title}" terlebih dahulu`)
  }

  return (
    <section className="py-12">
      <div className="mx-auto max-w-3xl px-4">
          {/* Steps */}
          <div className="mb-10">
            <div className="flex items-center justify-between">
              {STEPS.map((s, i) => (
                <div key={s.title} className="flex items-center">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors shrink-0 ${
                      i < step ? 'bg-primary-blue text-white' : i === step ? 'bg-primary-blue text-white ring-2 ring-primary-blue/30' : 'bg-white text-dark-secondary border border-border'
                    }`}>
                      {i < step ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    <div className="hidden sm:block">
                      <p className={`text-sm font-semibold ${i <= step ? 'text-dark-text' : 'text-dark-secondary'}`}>{s.title}</p>
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`mx-3 h-px w-8 sm:w-16 ${i < step ? 'bg-primary-blue' : 'bg-border'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xxl border border-border shadow-sm p-6 md:p-10">
            {step < STEPS.length && (
              <div className="mb-6 border-b border-border pb-4">
                <h2 className="text-display-md text-dark-text">{STEPS[step].title}</h2>
                <p className="text-body-sm text-dark-secondary mt-1">{STEPS[step].description}</p>
              </div>
            )}

            <form
              onSubmit={(e) => {
                if (stepRef.current !== STEPS.length - 1 || submissionInFlight.current) {
                  e.preventDefault()
                  return
                }
                void handleSubmit(onSubmit, onInvalid)(e)
              }}
              className="space-y-6"
            >
              {/* Step 0: Personal & Academic Info */}
              {step === 0 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input id="full_name" label="Nama Lengkap" placeholder="Nama lengkap kamu" error={errors.full_name?.message} {...register('full_name')} />
                    <Input id="email" type="email" label="Email" placeholder="email@unima.ac.id" error={errors.email?.message} {...register('email')} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input id="phone" label="Nomor Telepon" placeholder="08xxxxxxxxxx" error={errors.phone?.message} {...register('phone')} />
                    <Input id="nim" label="NIM (Nomor Induk Mahasiswa)" placeholder="20xxxxxx" error={errors.nim?.message} {...register('nim')} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input id="place_of_birth" label="Tempat Lahir" placeholder="Kota kelahiran" error={errors.place_of_birth?.message} {...register('place_of_birth')} />
                    <Input id="date_of_birth" type="date" label="Tanggal Lahir" error={errors.date_of_birth?.message} {...register('date_of_birth')} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input id="gender" label="Jenis Kelamin" options={[{ id: 'Laki-laki', name: 'Laki-laki' }, { id: 'Perempuan', name: 'Perempuan' }]} error={errors.gender?.message} {...register('gender')} />
                    <Input id="semester" type="number" label="Semester" placeholder="1-7" hint="Minimal 1, maksimal 7" error={errors.semester?.message} {...register('semester')} />
                  </div>
                  <Input id="ipk" type="number" step="0.01" label="IPK" placeholder="3.00" hint="Wajib untuk semester 3 ke atas (min. 3.00)" error={errors.ipk?.message} {...register('ipk')} />
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input id="faculty" label="Fakultas" options={faculties.map((f: any) => ({ id: f.id, name: f.name }))} error={errors.faculty?.message} {...register('faculty', { onChange: () => { setValue('study_program', ''); setFilteredPrograms(studyPrograms.filter((sp: any) => sp.faculty_id === watch('faculty'))) } })} />
                    <Input id="study_program" label="Program Studi" options={filteredPrograms.map((sp: any) => ({ id: sp.id, name: sp.name }))} error={errors.study_program?.message} {...register('study_program')} />
                  </div>
                </div>
              )}

              {/* Step 1: Address & Physical */}
              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <Input id="address" label="Alamat" placeholder="Alamat lengkap" error={errors.address?.message} {...register('address')} />
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input id="city" label="Kabupaten/Kota" placeholder="Contoh: Manado" error={errors.city?.message} {...register('city')} />
                    <Input id="province" label="Provinsi" placeholder="Provinsi" error={errors.province?.message} {...register('province')} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input id="height_cm" type="number" step="any" label="Tinggi Badan (cm)" placeholder="170" hint="Isi sesuai tinggi badan saat ini" error={errors.height_cm?.message} {...register('height_cm')} />
                    <Input id="weight_kg" type="number" step="any" label="Berat Badan (kg)" placeholder="60" hint="Isi sesuai berat badan saat ini" error={errors.weight_kg?.message} {...register('weight_kg')} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input id="occupation" label="Pekerjaan" placeholder="Mahasiswa / dll" error={errors.occupation?.message} {...register('occupation')} />
                    <Input id="education" label="Pendidikan Terakhir" placeholder="SMA/S1/S2" error={errors.education?.message} {...register('education')} />
                  </div>
                </div>
              )}

              {/* Step 2: Social Media & Essay */}
              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid md:grid-cols-3 gap-4">
                    <Input id="instagram" label="Instagram" placeholder="@username" {...register('instagram')} />
                    <Input id="tiktok" label="TikTok" placeholder="@username" {...register('tiktok')} />
                    <Input id="facebook" label="Facebook" placeholder="URL Profil" {...register('facebook')} />
                  </div>
                  <Input id="foreign_language" label="Bahasa Asing yang Dikuasai" placeholder="Contoh: Inggris, Mandarin" error={errors.foreign_language?.message} {...register('foreign_language')} />
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="essay" className="text-body-sm text-dark-text font-medium">
                      Esai Motivasi
                    </label>
                    <textarea
                      id="essay"
                      rows={6}
                      className={`w-full rounded-lg border ${errors.essay ? 'border-error' : 'border-border'} bg-white px-4 py-3 text-body text-dark-text placeholder:text-dark-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue transition-all resize-y`}
                      placeholder="Mengapa kamu ingin bergabung dengan Nyong Noni UNIMA? Ceritakan motivasi, tujuanmu, dan hal yang membuatmu unik..."
                      {...register('essay')}
                    />
                    {errors.essay && <span className="text-xs text-error">{errors.essay.message}</span>}
                  </div>
                  <div className="flex items-start gap-3 pt-2">
                    <input
                      type="checkbox"
                      id="consent"
                      className="mt-1 h-4 w-4 rounded border-border text-primary-blue focus:ring-primary-blue"
                      {...register('consent')}
                    />
                    <label htmlFor="consent" className="text-body-sm text-dark-secondary">
                      Saya menyatakan bahwa seluruh informasi yang saya berikan adalah benar dan akurat. Saya menyetujui syarat dan ketentuan proses pemilihan Nyong Noni UNIMA.
                      {errors.consent && <span className="block text-xs text-error mt-1">{errors.consent.message}</span>}
                    </label>
                  </div>
                </div>
              )}

              {/* Step 3: Confirmation */}
              {step === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="rounded-xl border border-border bg-light-gray p-6 space-y-3">
                    {Object.entries(getValues()).filter(([k]) => k !== 'consent').map(([key, value]) => (
                      <div key={key} className="flex justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                        <span className="text-dark-secondary text-sm">{FIELD_LABELS[key] || key.replace(/_/g, ' ')}</span>
                        <span className="font-semibold text-dark-text text-sm text-right max-w-[60%]">{displayValue(key, value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Success */}
              {step === STEPS.length && (
                <div className="text-center py-10 space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 border border-success/20">
                    <Check className="h-8 w-8 text-success" />
                  </div>
                  <h3 className="text-display-md text-dark-text">Pendaftaran Berhasil</h3>
                  <p className="text-body text-dark-secondary max-w-lg mx-auto">
                    Terima kasih telah mendaftar! Data kamu akan diverifikasi untuk seleksi tingkat fakultas. Peserta yang ditetapkan sebagai semifinalis akan dihubungi panitia melalui WhatsApp untuk mengikuti seleksi tingkat universitas. Hasil seleksi finalis diumumkan melalui website.
                  </p>
                  <Link href="/announcements" className="inline-block text-sm font-semibold text-primary-blue underline">Lihat Pengumuman Seleksi</Link>
                </div>
              )}

              {submitError && <p role="alert" className="text-center text-sm text-error">{submitError}</p>}

              {/* Navigation */}
              <div className="flex justify-between pt-6 border-t border-border mt-8">
                {step === STEPS.length ? (
                  <div className="w-full text-center">
                    <Link href="/" className="text-body-sm font-semibold text-primary-blue hover:text-primary-blue-dark transition-colors">
                      Kembali ke Beranda
                    </Link>
                  </div>
                ) : (
                  <>
                    <Button type="button" variant="ghost" onClick={prevStep} disabled={step === 0 || submitting} className="text-dark-secondary border border-border">
                      <ChevronLeft className="mr-2 h-4 w-4" /> Sebelumnya
                    </Button>
                    {step < STEPS.length - 1 ? (
                      <Button
                        type="button"
                        variant="primary"
                        onClick={(e) => {
                          e.preventDefault()
                          nextStep()
                        }}
                        className="bg-primary-blue text-white hover:bg-primary-blue-dark"
                      >
                        Selanjutnya <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button type="submit" variant="primary" disabled={submitting} className="bg-accent text-dark-text hover:bg-accent-light font-bold">
                        {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengirim...</> : 'Kirim Pendaftaran'}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </form>
          </div>
      </div>
    </section>
  )
}
