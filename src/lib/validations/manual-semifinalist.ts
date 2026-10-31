import { z } from 'zod'
import { normalizeIndonesianPhone } from '@/lib/selection'

export const manualSemifinalistSchema = z.object({
  full_name: z.string().trim().min(3, 'Nama lengkap minimal 3 karakter').max(200),
  phone: z.string().trim().max(30).refine(value => {
    try { normalizeIndonesianPhone(value); return true } catch { return false }
  }, 'Nomor WhatsApp Indonesia tidak valid'),
  faculty: z.string().min(1, 'Fakultas harus dipilih'),
  gender: z.enum(['Laki-laki', 'Perempuan']),
  selection_year: z.number().int().min(2000).max(2100),
}).strict()
