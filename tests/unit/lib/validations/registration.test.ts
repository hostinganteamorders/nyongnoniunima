import { describe, it, expect } from 'vitest'
import {
  registrationSchema,
  registrationStepSchema,
  newsSchema,
  eventSchema,
  gallerySchema,
  finalistProfileSchema,
  finalistUpdateSchema,
  hallOfFameSchema,
  alumniAchievementSchema,
  titleholderSchema,
} from '@/lib/validations/registration'

const BASE_REGISTRATION = {
  full_name: 'John Doe',
  email: 'john@example.com',
  phone: '081234567890',
  date_of_birth: '2000-01-01',
  place_of_birth: 'Manado',
  gender: 'Laki-laki' as const,
  nim: '20123456',
  faculty: 'fip',
  study_program: 'fip_pgsd',
  semester: 4,
  address: 'Jl. Contoh No. 123, Kelurahan, Kecamatan',
  city: 'Manado',
  province: 'Sulawesi Utara',
  height_cm: 170,
  weight_kg: 60,
  occupation: 'Mahasiswa',
  education: 'Sarjana S1',
  instagram: '@johndoe',
  tiktok: '',
  facebook: '',
  essay: 'I want to join Nyong Noni UNIMA because I am passionate about culture and tourism promotion in North Sulawesi.',
  consent: true,
}

describe('registrationSchema', () => {
  it('validates correct data', () => {
    const result = registrationSchema.safeParse(BASE_REGISTRATION)
    expect(result.success).toBe(true)
  })

  it('rejects short name', () => {
    const result = registrationSchema.safeParse({ ...BASE_REGISTRATION, full_name: 'A' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = registrationSchema.safeParse({ ...BASE_REGISTRATION, email: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('rejects short phone number', () => {
    const result = registrationSchema.safeParse({ ...BASE_REGISTRATION, phone: '123' })
    expect(result.success).toBe(false)
  })

  it('rejects height below minimum', () => {
    const result = registrationSchema.safeParse({ ...BASE_REGISTRATION, height_cm: 100 })
    expect(result.success).toBe(false)
  })

  it('rejects height above maximum', () => {
    const result = registrationSchema.safeParse({ ...BASE_REGISTRATION, height_cm: 250 })
    expect(result.success).toBe(false)
  })

  it('rejects weight below minimum', () => {
    const result = registrationSchema.safeParse({ ...BASE_REGISTRATION, weight_kg: 20 })
    expect(result.success).toBe(false)
  })

  it('rejects consent false', () => {
    const result = registrationSchema.safeParse({ ...BASE_REGISTRATION, consent: false })
    expect(result.success).toBe(false)
  })

  it('rejects empty required fields', () => {
    const result = registrationSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('registrationStepSchema', () => {
  const validStep1 = {
    full_name: 'John Doe', email: 'john@example.com', phone: '081234567890',
    date_of_birth: '2000-01-01', place_of_birth: 'Manado', gender: 'Laki-laki',
    nim: '20123456', faculty: 'fip', study_program: 'fip_pgsd', semester: 4,
  }
  const validStep2 = {
    address: 'Jl. Contoh No. 123, Kelurahan, Kecamatan', city: 'Manado',
    province: 'Sulawesi Utara', height_cm: 170, weight_kg: 60,
    occupation: 'Mahasiswa', education: 'Sarjana S1',
  }
  const validStep3 = {
    instagram: '@johndoe', tiktok: '', facebook: '',
    essay: 'I want to join Nyong Noni UNIMA because I am passionate about culture and want to promote North Sulawesi tourism.', consent: true,
  }

  it('validates step 1 with correct data', () => {
    expect(registrationStepSchema[0].safeParse(validStep1).success).toBe(true)
  })

  it('rejects step 1 with short name', () => {
    expect(registrationStepSchema[0].safeParse({ ...validStep1, full_name: 'A' }).success).toBe(false)
  })

  it('rejects step 1 with invalid email', () => {
    expect(registrationStepSchema[0].safeParse({ ...validStep1, email: 'bad' }).success).toBe(false)
  })

  it('validates step 2 with correct data', () => {
    expect(registrationStepSchema[1].safeParse(validStep2).success).toBe(true)
  })

  it('rejects step 2 with short address', () => {
    expect(registrationStepSchema[1].safeParse({ ...validStep2, address: 'Short' }).success).toBe(false)
  })

  it('rejects step 2 with empty city', () => {
    expect(registrationStepSchema[1].safeParse({ ...validStep2, city: '' }).success).toBe(false)
  })

  it('validates step 3 with correct data', () => {
    expect(registrationStepSchema[2].safeParse(validStep3).success).toBe(true)
  })

  it('rejects step 3 with short essay', () => {
    expect(registrationStepSchema[2].safeParse({ ...validStep3, essay: 'Too short' }).success).toBe(false)
  })

  it('rejects step 3 without consent', () => {
    expect(registrationStepSchema[2].safeParse({ ...validStep3, consent: false }).success).toBe(false)
  })
})

describe('finalistProfileSchema', () => {
  it('validates correct data', () => {
    const result = finalistProfileSchema.safeParse({ applicant_id: 'abc-123', tahun: '2026' })
    expect(result.success).toBe(true)
  })

  it('rejects missing applicant_id', () => {
    const result = finalistProfileSchema.safeParse({ tahun: '2026' })
    expect(result.success).toBe(false)
  })

  it('rejects missing tahun', () => {
    const result = finalistProfileSchema.safeParse({ applicant_id: 'abc-123' })
    expect(result.success).toBe(false)
  })

  it('accepts optional fields', () => {
    const result = finalistProfileSchema.safeParse({ applicant_id: 'abc-123', tahun: '2026', instagram: '@test', bio: 'Test bio' })
    expect(result.success).toBe(true)
  })
})

describe('finalistUpdateSchema', () => {
  it('validates with required fields only', () => {
    const result = finalistUpdateSchema.safeParse({ applicant_id: 'abc-123', tahun: '2026' })
    expect(result.success).toBe(true)
  })

  it('validates with all fields', () => {
    const result = finalistUpdateSchema.safeParse({
      applicant_id: 'abc-123', full_name: 'John Doe', email: 'john@example.com',
      phone: '081234567890', date_of_birth: '2000-01-01',
      address: 'Jl. Contoh No. 123', city: 'Manado', province: 'Sulawesi Utara',
      height_cm: 170, weight_kg: 60, occupation: 'Mahasiswa', education: 'Sarjana S1',
      instagram: '@johndoe', photo_url: 'https://example.com/photo.jpg', bio: 'Finalis 2026', tahun: '2026',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing applicant_id', () => {
    const result = finalistUpdateSchema.safeParse({ tahun: '2026' })
    expect(result.success).toBe(false)
  })

  it('rejects missing tahun', () => {
    const result = finalistUpdateSchema.safeParse({ applicant_id: 'abc-123' })
    expect(result.success).toBe(false)
  })
})

describe('hallOfFameSchema', () => {
  const validData = { tahun: 2025, nyong_name: 'John Doe', noni_name: 'Jane Doe', kabupaten_kota: 'Manado' }

  it('validates correct data', () => {
    expect(hallOfFameSchema.safeParse(validData).success).toBe(true)
  })

  it('rejects tahun below minimum', () => {
    expect(hallOfFameSchema.safeParse({ ...validData, tahun: 1999 }).success).toBe(false)
  })

  it('rejects tahun above maximum', () => {
    expect(hallOfFameSchema.safeParse({ ...validData, tahun: 2101 }).success).toBe(false)
  })

  it('accepts optional category', () => {
    const result = hallOfFameSchema.safeParse({ ...validData, category: 'Nyong Berbakat' })
    expect(result.success).toBe(true)
  })
})

describe('alumniAchievementSchema', () => {
  const validData = { alumni_name: 'John Doe', achievement_type: 'Dokter', description: 'Dokter spesialis di RSUD Manado selama 5 tahun', tahun: '2025' }

  it('validates correct data', () => {
    expect(alumniAchievementSchema.safeParse(validData).success).toBe(true)
  })

  it('rejects short name', () => {
    expect(alumniAchievementSchema.safeParse({ ...validData, alumni_name: 'Jo' }).success).toBe(false)
  })

  it('accepts custom achievement type', () => {
    const result = alumniAchievementSchema.safeParse({ ...validData, achievement_type: 'Custom Type' })
    expect(result.success).toBe(true)
  })

  it('rejects short description', () => {
    expect(alumniAchievementSchema.safeParse({ ...validData, description: 'Short' }).success).toBe(false)
  })

  it('accepts optional fields', () => {
    const result = alumniAchievementSchema.safeParse({ ...validData, photo_url: 'https://example.com/photo.jpg', instagram: '@johndoe', current_position: 'Dokter', organization: 'RSUD' })
    expect(result.success).toBe(true)
  })
})

describe('titleholderSchema', () => {
  const validData = { tahun: 2026, category: 'Juara Utama' as const, nyong_name: 'John Doe', noni_name: 'Jane Doe', region: 'Manado' }

  it('validates correct data', () => {
    expect(titleholderSchema.safeParse(validData).success).toBe(true)
  })

  it('rejects invalid category', () => {
    expect(titleholderSchema.safeParse({ ...validData, category: 'Invalid' }).success).toBe(false)
  })

  it('allows missing region (defaults to empty)', () => {
    const result = titleholderSchema.safeParse({ ...validData, region: '' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.region).toBe('')
  })

  it('allows a single-side name (nyong only / noni only)', () => {
    expect(
      titleholderSchema.safeParse({ tahun: 2026, category: 'Wakil II', nyong_name: 'John Doe' }).success,
    ).toBe(true)
    expect(
      titleholderSchema.safeParse({ tahun: 2026, category: 'Wakil II', noni_name: 'Jane Doe' }).success,
    ).toBe(true)
  })

  it('rejects when both names are empty', () => {
    expect(
      titleholderSchema.safeParse({ tahun: 2026, category: 'Juara Utama' }).success,
    ).toBe(false)
  })

  it('rejects a name shorter than 3 characters', () => {
    expect(
      titleholderSchema.safeParse({ tahun: 2026, category: 'Juara Utama', nyong_name: 'Jo' }).success,
    ).toBe(false)
  })
})

describe('newsSchema', () => {
  const validNews = { title: 'Grand Final Nyong Noni UNIMA 2026', slug: 'grand-final-2026', content: 'Acara grand final Nyong Noni UNIMA 2026 akan diselenggarakan di UNIMA. Acara ini akan menampilkan finalis-finalis terbaik.', excerpt: 'Grand final akan digelar di UNIMA', published: true }

  it('validates correct news data', () => {
    const result = newsSchema.safeParse(validNews)
    expect(result.success).toBe(true)
  })

  it('rejects short title', () => {
    const result = newsSchema.safeParse({ ...validNews, title: 'A' })
    expect(result.success).toBe(false)
  })

  it('defaults published to false', () => {
    const result = newsSchema.safeParse({ ...validNews, published: undefined })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.published).toBe(false)
  })
})

describe('eventSchema', () => {
  const validEvent = { title: 'Grand Final 2026', slug: 'grand-final-2026', description: 'Acara puncak Nyong Noni UNIMA', date: '2026-08-15', location: 'UNIMA Convention Center', published: true }

  it('validates correct event data', () => {
    const result = eventSchema.safeParse(validEvent)
    expect(result.success).toBe(true)
  })

  it('accepts custom category', () => {
    const result = eventSchema.safeParse({ ...validEvent, category: 'Open Registration' })
    expect(result.success).toBe(true)
  })

  it('rejects missing date', () => {
    const result = eventSchema.safeParse({ ...validEvent, date: '' })
    expect(result.success).toBe(false)
  })
})

describe('gallerySchema', () => {
  const validGallery = { title: 'Photo Session', image_url: 'https://example.com/photo.jpg', category: 'Auditions' }

  it('validates correct gallery data', () => {
    const result = gallerySchema.safeParse(validGallery)
    expect(result.success).toBe(true)
  })

  it('rejects invalid image url', () => {
    const result = gallerySchema.safeParse({ ...validGallery, image_url: 'not-a-url' })
    expect(result.success).toBe(false)
  })

  it('accepts optional description', () => {
    const result = gallerySchema.safeParse({ ...validGallery, description: 'A great photo' })
    expect(result.success).toBe(true)
  })
})
