-- 00009: Sinkronkan nama & kode fakultas ke nama resmi UNIMA
-- (web.unima.ac.id/fakultas) dan standarkan nilai faculty free-text
-- di titleholders / current_titleholders ke nama lengkap.
-- Idempoten — jalankan di Supabase SQL Editor.

-- 1. faculties: nama + kode resmi baru (UUID id tidak berubah,
--    sehingga referensi prodi/pendaftar tetap aman)
UPDATE public.faculties SET code = 'FEB', name = 'Fakultas Ekonomi dan Bisnis'
WHERE code = 'FE' OR name = 'Fakultas Ekonomi';

UPDATE public.faculties SET code = 'FIPP', name = 'Fakultas Ilmu Pendidikan dan Psikologi'
WHERE code = 'FIP' OR name = 'Fakultas Ilmu Pendidikan';

UPDATE public.faculties SET code = 'FIKKM', name = 'Fakultas Ilmu Keolahragaan dan Kesehatan Masyarakat'
WHERE code = 'FOK' OR name = 'Fakultas Olahraga dan Kesehatan';

UPDATE public.faculties SET code = 'FMIPAK', name = 'Fakultas MIPA dan Kebumian'
WHERE code = 'FMIPA' OR name = 'Fakultas Matematika dan Ilmu Pengetahuan Alam';

-- 2. Standarkan faculty free-text -> nama lengkap resmi
UPDATE public.titleholders
SET faculty = 'Fakultas Ilmu Pendidikan dan Psikologi', updated_at = now()
WHERE trim(faculty) IN ('FIPP', 'Fakultas Ilmu Psikologi dan Pendidikan', 'Fakultas Ilmu Pendidikan');

UPDATE public.titleholders
SET faculty = 'Fakultas Ekonomi dan Bisnis', updated_at = now()
WHERE trim(faculty) IN ('FEB', 'Fakultas Ekonomi');

UPDATE public.titleholders
SET faculty = 'Fakultas Ilmu Keolahragaan dan Kesehatan Masyarakat', updated_at = now()
WHERE trim(faculty) IN ('FIKKM', 'FOK', 'Fakultas Olahraga dan Kesehatan');

UPDATE public.titleholders
SET faculty = 'Fakultas MIPA dan Kebumian', updated_at = now()
WHERE trim(faculty) IN ('FMIPAK', 'FMIPA', 'Fakultas Matematika dan Ilmu Pengetahuan Alam');

UPDATE public.titleholders
SET faculty = 'Fakultas Teknik', updated_at = now()
WHERE trim(faculty) IN ('FATEK', 'FT');

UPDATE public.titleholders
SET faculty = 'Fakultas Bahasa dan Seni', updated_at = now()
WHERE trim(faculty) IN ('FBS');

UPDATE public.titleholders
SET faculty = 'Fakultas Ilmu Sosial dan Hukum', updated_at = now()
WHERE trim(faculty) IN ('FISH');

UPDATE public.titleholders
SET faculty = 'Fakultas Kedokteran', updated_at = now()
WHERE trim(faculty) IN ('FK');

UPDATE public.current_titleholders
SET faculty = 'Fakultas Ilmu Pendidikan dan Psikologi', updated_at = now()
WHERE trim(faculty) IN ('FIPP', 'Fakultas Ilmu Psikologi dan Pendidikan', 'Fakultas Ilmu Pendidikan');

UPDATE public.current_titleholders
SET faculty = 'Fakultas Ekonomi dan Bisnis', updated_at = now()
WHERE trim(faculty) IN ('FEB', 'Fakultas Ekonomi');

UPDATE public.current_titleholders
SET faculty = 'Fakultas Ilmu Keolahragaan dan Kesehatan Masyarakat', updated_at = now()
WHERE trim(faculty) IN ('FIKKM', 'FOK', 'Fakultas Olahraga dan Kesehatan');

UPDATE public.current_titleholders
SET faculty = 'Fakultas MIPA dan Kebumian', updated_at = now()
WHERE trim(faculty) IN ('FMIPAK', 'FMIPA', 'Fakultas Matematika dan Ilmu Pengetahuan Alam');

UPDATE public.current_titleholders
SET faculty = 'Fakultas Teknik', updated_at = now()
WHERE trim(faculty) IN ('FATEK', 'FT');

UPDATE public.current_titleholders
SET faculty = 'Fakultas Bahasa dan Seni', updated_at = now()
WHERE trim(faculty) IN ('FBS');

UPDATE public.current_titleholders
SET faculty = 'Fakultas Ilmu Sosial dan Hukum', updated_at = now()
WHERE trim(faculty) IN ('FISH');

UPDATE public.current_titleholders
SET faculty = 'Fakultas Kedokteran', updated_at = now()
WHERE trim(faculty) IN ('FK');
