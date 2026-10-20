-- 00008: Tambah kategori 'Duta Kesehatan' dan 'Duta Pendidikan',
-- beserta gelar current_titleholders 'Nyong/Noni Duta Kesehatan' dan
-- 'Nyong/Noni Duta Pendidikan'.
-- Jalankan di Supabase SQL Editor.

-- 1. titleholders.category: drop semua CHECK constraint pada kolom category, lalu tambah ulang
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.titleholders'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%category%'
  LOOP
    EXECUTE format('ALTER TABLE public.titleholders DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.titleholders ADD CONSTRAINT titleholders_category_check
  CHECK (category IN ('Juara Utama', 'Wakil I', 'Wakil II', 'Harapan I', 'Harapan II', 'Berbakat', 'Favorit', 'Fotogenik', 'Persahabatan', 'Duta Pariwisata', 'Duta Lingkungan', 'Duta Sosial', 'Duta Budaya', 'Duta Bahasa', 'Duta Seni', 'Duta Kesehatan', 'Duta Pendidikan', 'Intelegensia', 'Other'));

-- 2. current_titleholders.title: drop CHECK constraint pada kolom title, lalu tambah ulang
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.current_titleholders'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%title%'
  LOOP
    EXECUTE format('ALTER TABLE public.current_titleholders DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.current_titleholders ADD CONSTRAINT current_titleholders_title_check
  CHECK (title IN (
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
    'Nyong Duta Pariwisata', 'Noni Duta Pariwisata',
    'Nyong Duta Kesehatan', 'Noni Duta Kesehatan',
    'Nyong Duta Pendidikan', 'Noni Duta Pendidikan',
    'Nyong Persahabatan', 'Noni Persahabatan',
    'Nyong Intelegensia', 'Noni Intelegensia'
  ));
