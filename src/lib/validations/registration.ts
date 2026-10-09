import { z } from 'zod'

export const registrationSchema = z.object({
  full_name: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
  email: z.string().email('Email tidak valid'),
  phone: z.string().min(10, 'Nomor telepon minimal 10 digit'),
  date_of_birth: z.string().min(1, 'Tanggal lahir harus diisi'),
  place_of_birth: z.string().min(3, 'Tempat lahir harus diisi'),
  gender: z.enum(['Laki-laki', 'Perempuan'], { errorMap: () => ({ message: 'Pilih jenis kelamin' }) }),
  nim: z.string().min(8, 'NIM minimal 8 karakter'),
  faculty: z.string().min(1, 'Fakultas harus dipilih'),
  study_program: z.string().min(1, 'Program studi harus dipilih'),
  semester: z.coerce.number().min(1, 'Semester minimal 1').max(14, 'Semester maksimal 14'),
  address: z.string().min(10, 'Alamat minimal 10 karakter'),
  city: z.string().min(3, 'Kota harus diisi'),
  province: z.string().min(3, 'Provinsi harus diisi'),
  height_cm: z.coerce.number().min(140, 'Tinggi badan minimal 140 cm').max(220, 'Tinggi badan maksimal 220 cm'),
  weight_kg: z.coerce.number().min(35, 'Berat badan minimal 35 kg').max(150, 'Berat badan maksimal 150 kg'),
  occupation: z.string().min(3, 'Pekerjaan harus diisi'),
  education: z.string().min(3, 'Pendidikan harus diisi'),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
  facebook: z.string().optional(),
  essay: z.string().min(50, 'Esai minimal 50 karakter').max(2000, 'Esai maksimal 2000 karakter'),
  consent: z.literal(true, { errorMap: () => ({ message: 'Anda harus menyetujui syarat dan ketentuan' }) }),
})

export const registrationStepSchema = [
  z.object({
    full_name: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
    email: z.string().email('Email tidak valid'),
    phone: z.string().min(10, 'Nomor telepon minimal 10 digit'),
    date_of_birth: z.string().min(1, 'Tanggal lahir harus diisi'),
    place_of_birth: z.string().min(3, 'Tempat lahir harus diisi'),
    gender: z.enum(['Laki-laki', 'Perempuan'], { errorMap: () => ({ message: 'Pilih jenis kelamin' }) }),
    nim: z.string().min(8, 'NIM minimal 8 karakter'),
    faculty: z.string().min(1, 'Fakultas harus dipilih'),
    study_program: z.string().min(1, 'Program studi harus dipilih'),
    semester: z.coerce.number().min(1, 'Semester minimal 1').max(14, 'Semester maksimal 14'),
  }),
  z.object({
    address: z.string().min(10, 'Alamat minimal 10 karakter'),
    city: z.string().min(3, 'Kota harus diisi'),
    province: z.string().min(3, 'Provinsi harus diisi'),
    height_cm: z.coerce.number().min(140, 'Tinggi badan minimal 140 cm').max(220, 'Tinggi badan maksimal 220 cm'),
    weight_kg: z.coerce.number().min(35, 'Berat badan minimal 35 kg').max(150, 'Berat badan maksimal 150 kg'),
    occupation: z.string().min(3, 'Pekerjaan harus diisi'),
    education: z.string().min(3, 'Pendidikan harus diisi'),
  }),
  z.object({
    instagram: z.string().optional(),
    tiktok: z.string().optional(),
    facebook: z.string().optional(),
    essay: z.string().min(50, 'Esai minimal 50 karakter').max(2000, 'Esai maksimal 2000 karakter'),
    consent: z.literal(true, { errorMap: () => ({ message: 'Anda harus menyetujui syarat dan ketentuan' }) }),
  }),
]

export const newsSchema = z.object({
  title: z.string().min(5, 'Judul minimal 5 karakter'),
  slug: z.string().min(3, 'Slug minimal 3 karakter'),
  content: z.string().min(50, 'Konten minimal 50 karakter'),
  excerpt: z.string().min(10, 'Ringkasan minimal 10 karakter'),
  image_url: z.string().url('URL tidak valid').nullable().optional(),
  published: z.boolean().default(false),
})

export const eventSchema = z.object({
  title: z.string().min(5, 'Judul minimal 5 karakter'),
  slug: z.string().min(3, 'Slug minimal 3 karakter'),
  description: z.string().min(20, 'Deskripsi minimal 20 karakter'),
  date: z.string().min(1, 'Tanggal harus diisi'),
  location: z.string().min(3, 'Lokasi harus diisi'),
  category: z.string().optional(),
  image_url: z.string().url('URL tidak valid').nullable().optional(),
  published: z.boolean().default(false),
})

export const gallerySchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter'),
  description: z.string().nullable().optional(),
  image_url: z.string().url('URL gambar tidak valid'),
  category: z.string().min(3, 'Kategori harus diisi'),
})

export const finalistProfileSchema = z.object({
  applicant_id: z.string().min(1),
  instagram: z.string().optional(),
  photo_url: z.string().optional(),
  bio: z.string().optional(),
  tahun: z.string().min(4, 'Tahun harus diisi'),
})

export const finalistUpdateSchema = z.object({
  applicant_id: z.string().min(1),
  full_name: z.string().min(3, 'Nama lengkap minimal 3 karakter').optional(),
  email: z.string().email('Email tidak valid').optional(),
  phone: z.string().min(10, 'Nomor telepon minimal 10 digit').optional(),
  date_of_birth: z.string().min(1, 'Tanggal lahir harus diisi').optional(),
  address: z.string().min(10, 'Alamat minimal 10 karakter').optional(),
  city: z.string().min(3, 'Kota harus diisi').optional(),
  province: z.string().min(3, 'Provinsi harus diisi').optional(),
  height_cm: z.coerce.number().min(140, 'Tinggi badan minimal 140 cm').max(220, 'Tinggi badan maksimal 220 cm').optional(),
  weight_kg: z.coerce.number().min(35, 'Berat badan minimal 35 kg').max(150, 'Berat badan maksimal 150 kg').optional(),
  occupation: z.string().min(3, 'Pekerjaan harus diisi').optional(),
  education: z.string().min(3, 'Pendidikan harus diisi').optional(),
  instagram: z.string().optional(),
  photo_url: z.string().optional(),
  bio: z.string().optional(),
  tahun: z.string().min(4, 'Tahun harus diisi'),
})

export const hallOfFameSchema = z.object({
  tahun: z.coerce.number().min(2000, 'Tahun minimal 2000').max(2100, 'Tahun maksimal 2100'),
  nyong_name: z.string().min(3, 'Nama Nyong minimal 3 karakter'),
  noni_name: z.string().min(3, 'Nama Noni minimal 3 karakter'),
  nyong_photo_url: z.string().optional(),
  noni_photo_url: z.string().optional(),
  kabupaten_kota: z.string().min(3, 'Kabupaten/Kota harus diisi'),
  category: z.string().optional(),
})

export const alumniAchievementSchema = z.object({
  alumni_name: z.string().min(3, 'Nama minimal 3 karakter'),
  achievement_type: z.string().min(1, 'Tipe prestasi harus diisi'),
  description: z.string().min(10, 'Deskripsi minimal 10 karakter'),
  tahun: z.string().min(4, 'Tahun harus diisi'),
  photo_url: z.string().optional(),
  instagram: z.string().optional(),
  current_position: z.string().optional(),
  organization: z.string().optional(),
})

export const titleholderSchema = z.object({
  tahun: z.coerce.number().min(2000, 'Tahun minimal 2000').max(2100, 'Tahun maksimal 2100'),
  category: z.enum(['Juara Utama', 'Wakil I', 'Wakil II', 'Harapan I', 'Harapan II', 'Berbakat', 'Favorit', 'Fotogenik', 'Persahabatan', 'Digital', 'Duta Lingkungan', 'Duta Sosial', 'Duta Budaya', 'Duta Bahasa', 'Duta Seni', 'Intelegensia', 'Other'], {
    errorMap: () => ({ message: 'Pilih kategori' }),
  }),
  nyong_name: z
    .string()
    .default('')
    .refine((v) => v === '' || v.length >= 3, 'Nama Nyong minimal 3 karakter'),
  noni_name: z
    .string()
    .default('')
    .refine((v) => v === '' || v.length >= 3, 'Nama Noni minimal 3 karakter'),
  faculty: z.string().nullish(),
  study_program: z.string().nullish(),
  region: z.string().default(''),
  biography: z.string().nullish(),
  nyong_photo_url: z.string().nullish(),
  noni_photo_url: z.string().nullish(),
  nyong_instagram: z.string().nullish(),
  noni_instagram: z.string().nullish(),
  sort_order: z.coerce.number().int().default(0),
}).refine((d) => d.nyong_name !== '' || d.noni_name !== '', {
  message: 'Isi minimal satu nama Nyong atau Noni',
})

export const sponsorSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter'),
  logo_url: z.string().optional(),
  website: z.string().optional(),
  type: z.enum(['sponsor', 'partner', 'media'], { errorMap: () => ({ message: 'Pilih tipe' }) }),
  sort_order: z.coerce.number().int().default(0),
})

export const currentTitleholderSchema = z.object({
  title: z.enum([
    'Nyong UNIMA', 'Noni UNIMA',
    'Wakil 1 Nyong', 'Wakil 1 Noni',
    'Wakil 2 Nyong', 'Wakil 2 Noni',
    'Harapan 1 Nyong', 'Harapan 1 Noni',
    'Harapan 2 Nyong', 'Harapan 2 Noni',
    'Nyong Berbakat', 'Noni Berbakat',
    'Nyong Favorit', 'Noni Favorit',
    'Nyong Fotogenik', 'Noni Fotogenik',
    'Nyong Duta Lingkungan', 'Noni Duta Lingkungan',
    'Nyong Duta Sosial', 'Noni Duta Sosial',
    'Nyong Duta Budaya', 'Noni Duta Budaya',
    'Nyong Duta Bahasa', 'Noni Duta Bahasa',
    'Nyong Duta Seni', 'Noni Duta Seni',
    'Nyong Persahabatan', 'Noni Persahabatan',
    'Nyong Intelegensia', 'Noni Intelegensia',
  ], { errorMap: () => ({ message: 'Pilih gelar' }) }),
  name: z.string().min(3, 'Nama minimal 3 karakter'),
  faculty: z.string().optional(),
  study_program: z.string().optional(),
  photo_url: z.string().optional(),
  instagram: z.string().optional(),
  biography: z.string().optional(),
  sort_order: z.coerce.number().int().default(0),
})

export const settingSchema = z.object({
  key: z.string().min(1, 'Key harus diisi'),
  value: z.any(),
})

export type RegistrationInput = z.infer<typeof registrationSchema>
export type NewsInput = z.infer<typeof newsSchema>
export type EventInput = z.infer<typeof eventSchema>
export type GalleryInput = z.infer<typeof gallerySchema>
export type HallOfFameInput = z.infer<typeof hallOfFameSchema>
export type AlumniAchievementInput = z.infer<typeof alumniAchievementSchema>
export type TitleholderInput = z.infer<typeof titleholderSchema>
export type SponsorInput = z.infer<typeof sponsorSchema>
export type CurrentTitleholderInput = z.infer<typeof currentTitleholderSchema>
