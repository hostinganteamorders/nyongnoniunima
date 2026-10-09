'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Check, ChevronLeft, ChevronRight, Upload, Loader2 } from 'lucide-react'
import { submitRegistration } from '@/server/actions/applicants'
import { getFaculties, getStudyPrograms } from '@/server/actions/unima'
import {
  registrationSchema,
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
  address: 'Alamat',
  city: 'Kota',
  province: 'Provinsi',
  height_cm: 'Tinggi Badan (cm)',
  weight_kg: 'Berat Badan (kg)',
  occupation: 'Pekerjaan',
  education: 'Pendidikan Terakhir',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  essay: 'Esai Motivasi',
}

const Input = ({ id, label, type = "text", placeholder, error, options, ...props }: any) => (
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
    {error && <span className="text-xs text-error">{error}</span>}
  </div>
)

export default function RegisterPage() {
  const [step, setStep] = useState(0)
  const [faculties, setFaculties] = useState<Faculty[]>([])
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([])
  const [filteredPrograms, setFilteredPrograms] = useState<StudyProgram[]>([])
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getFaculties().then(setFaculties).catch(() => {})
    getStudyPrograms().then(setStudyPrograms).catch(() => {})
  }, [])

  const form = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      full_name: '', email: '', phone: '', date_of_birth: '', place_of_birth: '',
      gender: undefined, nim: '', faculty: '', study_program: '', semester: undefined,
      address: '', city: '', province: '', height_cm: undefined, weight_kg: undefined,
      occupation: '', education: '', instagram: '', tiktok: '', facebook: '',
      essay: '', consent: false as unknown as true,
    },
    mode: 'onChange',
  })

  const { register, handleSubmit, formState: { errors }, trigger, getValues, watch, setValue } = form
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
    0: ['full_name', 'email', 'phone', 'date_of_birth', 'place_of_birth', 'gender', 'nim', 'faculty', 'study_program', 'semester'],
    1: ['address', 'city', 'province', 'height_cm', 'weight_kg', 'occupation', 'education'],
    2: ['instagram', 'tiktok', 'facebook', 'essay', 'consent'],
  }

  const validateStep = async (targetStep: number): Promise<boolean> => {
    const fields = fieldsByStep[targetStep] || []
    if (fields.length === 0) return true
    return trigger(fields)
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
    setSubmitError('')
    for (let i = 0; i < 3; i++) {
      const valid = await validateStep(i)
      if (!valid) { setStep(i); setSubmitError(`Lengkapi data pada langkah "${STEPS[i].title}" terlebih dahulu`); return }
    }
    setSubmitting(true)
    try {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => { formData.append(key, String(value)) })
      const result = await submitRegistration(formData)
      if (result?.error) { setSubmitError(String(result.error)); return }
      setStep(STEPS.length)
    } catch { setSubmitError('Terjadi kesalahan. Silakan coba lagi.') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="min-h-screen bg-light-gray pb-section">
      {/* Hero */}
      <section className="gradient-hero relative overflow-hidden pt-24 pb-16 px-4 text-center">
        <div className="absolute inset-0 bg-[url('/hero-pattern.svg')] opacity-5" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-display-xl text-white font-bold mb-4">Pendaftaran</h1>
          <p className="text-body-lg text-white/80 max-w-2xl mx-auto">
            Daftarkan dirimu untuk menjadi duta mahasiswa Nyong Noni UNIMA berikutnya.
          </p>
        </div>
      </section>

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
                if (stepRef.current < STEPS.length - 1) {
                  e.preventDefault()
                  return
                }
                handleSubmit(onSubmit)(e)
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
                    <Input id="semester" type="number" label="Semester" placeholder="1-14" error={errors.semester?.message} {...register('semester')} />
                  </div>
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
                    <Input id="city" label="Kota" placeholder="Kota" error={errors.city?.message} {...register('city')} />
                    <Input id="province" label="Provinsi" placeholder="Provinsi" error={errors.province?.message} {...register('province')} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input id="height_cm" type="number" label="Tinggi Badan (cm)" placeholder="170" error={errors.height_cm?.message} {...register('height_cm')} />
                    <Input id="weight_kg" type="number" label="Berat Badan (kg)" placeholder="60" error={errors.weight_kg?.message} {...register('weight_kg')} />
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
                    Terima kasih telah mendaftar! Data kamu telah diterima dan akan diproses. Kami akan menghubungi melalui email untuk informasi lebih lanjut.
                  </p>
                </div>
              )}

              {submitError && <p className="text-center text-sm text-error">{submitError}</p>}

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
                    <Button type="button" variant="ghost" onClick={prevStep} disabled={step === 0} className="text-dark-secondary border border-border">
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
    </div>
  )
}
