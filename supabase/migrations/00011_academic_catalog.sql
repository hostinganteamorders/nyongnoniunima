-- Preserve catalog IDs and historical references; retired programs remain readable.
BEGIN;

ALTER TABLE public.study_programs ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
LOCK TABLE public.faculties, public.study_programs IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE academic_faculties (code text PRIMARY KEY, legacy_code text, name text NOT NULL) ON COMMIT DROP;
INSERT INTO academic_faculties VALUES
  ('FIKKM', 'FOK', 'Fakultas Ilmu Keolahragaan dan Kesehatan'),
  ('FIPP', 'FIP', 'Fakultas Ilmu Pendidikan dan Psikologi'),
  ('FISH', NULL, 'Fakultas Ilmu Sosial dan Hukum'),
  ('FMIPAK', 'FMIPA', 'Fakultas Matematika, Ilmu Pengetahuan Alam dan Kebumian'),
  ('FEB', 'FE', 'Fakultas Ekonomi dan Bisnis'),
  ('FBS', NULL, 'Fakultas Bahasa dan Seni'),
  ('FT', NULL, 'Fakultas Teknik'),
  ('FK', NULL, 'Fakultas Kedokteran');

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM academic_faculties c JOIN public.faculties f ON f.code IN (c.code, c.legacy_code)
    GROUP BY c.code HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Ambiguous faculty codes in academic catalog';
  END IF;
END $$;

UPDATE public.faculties f SET code = c.code, name = c.name
FROM academic_faculties c
WHERE f.code IN (c.code, c.legacy_code)
  AND (f.code = c.legacy_code OR c.code IN ('FIKKM', 'FMIPAK'))
  AND (f.code IS DISTINCT FROM c.code OR f.name IS DISTINCT FROM c.name);

INSERT INTO public.faculties (code, name)
SELECT code, name FROM academic_faculties ON CONFLICT (code) DO NOTHING;

CREATE TEMP TABLE academic_programs (
  faculty_code text NOT NULL, code text PRIMARY KEY, name text NOT NULL, is_active boolean NOT NULL
) ON COMMIT DROP;
INSERT INTO academic_programs VALUES
  ('FIKKM', 'IK', 'Ilmu Keolahragaan', true),
  ('FIKKM', 'PKO', 'Pendidikan Kepelatihan Olahraga', true),
  ('FIKKM', 'PJKR', 'Pendidikan Jasmani, Kesehatan dan Rekreasi', true),
  ('FIKKM', 'IKM', 'Ilmu Kesehatan Masyarakat', true),
  ('FIPP', 'PGSD', 'Pendidikan Guru Sekolah Dasar', true),
  ('FIPP', 'PSI', 'Psikologi', true),
  ('FIPP', 'PGPAUD', 'Pendidikan Anak Usia Dini', true),
  ('FIPP', 'BK', 'Bimbingan Konseling', true),
  ('FIPP', 'PLB', 'Pendidikan Khusus', true),
  ('FISH', 'PG', 'Pendidikan Geografi', true),
  ('FISH', 'GEO', 'Geografi', true),
  ('FISH', 'IAN', 'Ilmu Administrasi Negara', true),
  ('FISH', 'SOS', 'Sosiologi', true),
  ('FISH', 'IH', 'Ilmu Hukum', true),
  ('FISH', 'PIPS', 'Pendidikan IPS', true),
  ('FISH', 'PS', 'Pendidikan Sejarah', true),
  ('FISH', 'PPKN', 'PPKn', true),
  ('FMIPAK', 'PKim', 'Pendidikan Kimia', true),
  ('FMIPAK', 'Kim', 'Kimia', true),
  ('FMIPAK', 'PBio', 'Pendidikan Biologi', true),
  ('FMIPAK', 'Bio', 'Biologi', true),
  ('FMIPAK', 'PFis', 'Pendidikan Fisika', true),
  ('FMIPAK', 'Fis', 'Fisika', true),
  ('FMIPAK', 'PGF', 'Pendidikan Geofisika', true),
  ('FMIPAK', 'IL', 'Ilmu Lingkungan', true),
  ('FMIPAK', 'PMat', 'Pendidikan Matematika', true),
  ('FMIPAK', 'PIPA', 'Pendidikan IPA', true),
  ('FEB', 'Akun', 'Akuntansi', true),
  ('FEB', 'Man', 'Manajemen', true),
  ('FEB', 'IE', 'Ilmu Ekonomi', true),
  ('FEB', 'PE', 'Pendidikan Ekonomi', true),
  ('FEB', 'D3MP', 'D3 Manajemen Perusahaan', true),
  ('FBS', 'BSI', 'Bahasa dan Sastra Inggris', true),
  ('FBS', 'PBInd', 'Pendidikan Bahasa dan Sastra Indonesia', true),
  ('FBS', 'PBI', 'Pendidikan Bahasa Inggris', true),
  ('FBS', 'PBJ', 'Pendidikan Bahasa Jepang', true),
  ('FBS', 'PBJER', 'Pendidikan Bahasa Jerman', true),
  ('FBS', 'PBP', 'Pendidikan Bahasa Prancis', true),
  ('FBS', 'PBSM', 'Pendidikan Bahasa dan Sastra Mandarin', true),
  ('FBS', 'PSR', 'Pendidikan Seni Rupa', true),
  ('FT', 'PKK', 'Pendidikan Kesejahteraan Keluarga', true),
  ('FT', 'TS', 'Teknik Sipil', true),
  ('FT', 'PTE', 'Pendidikan Teknik Elektro', true),
  ('FT', 'TM', 'Teknik Mesin', true),
  ('FT', 'PTM', 'Pendidikan Teknik Mesin', true),
  ('FT', 'TI', 'Teknik Informatika', true),
  ('FT', 'PTIK', 'Pendidikan Teknik Informatika dan Komunikasi', true),
  ('FK', 'Ked', 'Kedokteran', true),
  ('FK', 'PPD', 'Pendidikan Profesi Dokter', true),
  ('FBS', 'Sendratasik', 'Pendidikan Seni Drama, Tari dan Musik', false),
  ('FISH', 'IS', 'Ilmu Sosial', false),
  ('FT', 'PTB', 'Pendidikan Teknik Bangunan', false);

-- A globally unique code is not permission to move an existing program.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM academic_programs c
    JOIN public.study_programs p ON p.code = c.code
    JOIN public.faculties f ON f.code = c.faculty_code
    WHERE p.faculty_id <> f.id
  ) THEN
    RAISE EXCEPTION 'Study program code belongs to another faculty';
  END IF;
END $$;

INSERT INTO public.study_programs AS p (faculty_id, code, name, is_active)
SELECT f.id, c.code, c.name, c.is_active FROM academic_programs c
JOIN public.faculties f ON f.code = c.faculty_code
ON CONFLICT (code) DO UPDATE SET name = excluded.name, is_active = excluded.is_active
WHERE p.name IS DISTINCT FROM excluded.name OR p.is_active IS DISTINCT FROM excluded.is_active;

-- UUID strings and published selection snapshots are deliberately not rewritten.
DO $$ DECLARE target text; BEGIN
  FOREACH target IN ARRAY ARRAY['applicants', 'titleholders', 'current_titleholders'] LOOP
    EXECUTE format($query$
      UPDATE public.%I AS t SET faculty = 'Fakultas Ilmu Keolahragaan dan Kesehatan'
      WHERE trim(t.faculty) IN ('FIKKM', 'FOK', 'Fakultas Ilmu Keolahragaan dan Kesehatan Masyarakat', 'Fakultas Olahraga dan Kesehatan')
        AND NOT EXISTS (SELECT 1 FROM public.faculties f WHERE f.id::text = t.faculty)
    $query$, target);
    EXECUTE format($query$
      UPDATE public.%I AS t SET faculty = 'Fakultas Matematika, Ilmu Pengetahuan Alam dan Kebumian'
      WHERE trim(t.faculty) IN ('FMIPAK', 'FMIPA', 'Fakultas MIPA dan Kebumian', 'Fakultas Matematika dan Ilmu Pengetahuan Alam')
        AND NOT EXISTS (SELECT 1 FROM public.faculties f WHERE f.id::text = t.faculty)
    $query$, target);
  END LOOP;
END $$;

COMMIT;
