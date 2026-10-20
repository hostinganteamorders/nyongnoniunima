-- 00007: Ganti kategori 'Digital' menjadi 'Duta Pariwisata', tambah gelar
-- current_titleholders 'Nyong/Noni Duta Pariwisata', dan jadikan
-- Jivenly Lionel Tarumingkeng sebagai pemegangnya.
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
  CHECK (category IN ('Juara Utama', 'Wakil I', 'Wakil II', 'Harapan I', 'Harapan II', 'Berbakat', 'Favorit', 'Fotogenik', 'Persahabatan', 'Duta Pariwisata', 'Duta Lingkungan', 'Duta Sosial', 'Duta Budaya', 'Duta Bahasa', 'Duta Seni', 'Intelegensia', 'Other'));

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
    'Nyong Persahabatan', 'Noni Persahabatan',
    'Nyong Intelegensia', 'Noni Intelegensia'
  ));

-- 3. Jivenly: 'Other' -> 'Duta Pariwisata'
UPDATE public.titleholders
SET category = 'Duta Pariwisata', sort_order = 20, updated_at = now()
WHERE id = 'd0091aae-eab9-4959-ae3b-b26a953c83ff';

-- 4. Tambahkan Jivenly ke current_titleholders (idempoten)
INSERT INTO public.current_titleholders (title, name, faculty, study_program, photo_url, sort_order)
SELECT 'Nyong Duta Pariwisata', 'Jivenly Lionel Tarumingkeng', 'Fakultas Teknik', 'Informatika',
       'https://mxefqbkjaveqvfoiavyp.supabase.co/storage/v1/object/public/titleholders/72ba9c02-49df-4ae5-9d5a-23d632e4755e.jpg',
       18
WHERE NOT EXISTS (
  SELECT 1 FROM public.current_titleholders WHERE name = 'Jivenly Lionel Tarumingkeng'
);
