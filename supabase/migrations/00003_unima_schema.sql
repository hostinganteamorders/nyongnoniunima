-- Faculties
CREATE TABLE IF NOT EXISTS public.faculties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Study Programs
CREATE TABLE IF NOT EXISTS public.study_programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  faculty_id UUID NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sponsors
CREATE TABLE IF NOT EXISTS public.sponsors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  website TEXT,
  type TEXT NOT NULL DEFAULT 'sponsor' CHECK (type IN ('sponsor', 'partner', 'media')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Settings
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Current Titleholders
CREATE TABLE IF NOT EXISTS public.current_titleholders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL CHECK (title IN (
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
    'Nyong Intelegensia', 'Noni Intelegensia'
  )),
  name TEXT NOT NULL,
  faculty TEXT,
  study_program TEXT,
  photo_url TEXT,
  instagram TEXT,
  biography TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Update applicants table for UNIMA
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS nim TEXT;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('Laki-laki', 'Perempuan'));
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS place_of_birth TEXT;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS faculty TEXT;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS study_program TEXT;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS semester INTEGER;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS tiktok TEXT;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS facebook TEXT;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS passport_photo_url TEXT;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS fullbody_photo_url TEXT;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS ktm_url TEXT;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS ktp_url TEXT;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS cv_url TEXT;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS statement_letter_url TEXT;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS essay TEXT;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS consent BOOLEAN NOT NULL DEFAULT FALSE;

-- Alumni achievements: add UNIMA-specific fields
ALTER TABLE public.alumni_achievements ADD COLUMN IF NOT EXISTS current_position TEXT;
ALTER TABLE public.alumni_achievements ADD COLUMN IF NOT EXISTS organization TEXT;

-- Hall of fame: add UNIMA-specific fields
ALTER TABLE public.hall_of_fame ADD COLUMN IF NOT EXISTS category TEXT;

-- RLS Policies
ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_titleholders ENABLE ROW LEVEL SECURITY;

-- Faculties RLS
CREATE POLICY "Everyone can view faculties"
  ON public.faculties FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage faculties"
  ON public.faculties FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Study Programs RLS
CREATE POLICY "Everyone can view study programs"
  ON public.study_programs FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage study programs"
  ON public.study_programs FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Sponsors RLS
CREATE POLICY "Everyone can view sponsors"
  ON public.sponsors FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage sponsors"
  ON public.sponsors FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Settings RLS
CREATE POLICY "Everyone can view settings"
  ON public.settings FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage settings"
  ON public.settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Current Titleholders RLS
CREATE POLICY "Everyone can view current titleholders"
  ON public.current_titleholders FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage current titleholders"
  ON public.current_titleholders FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_study_programs_faculty ON public.study_programs(faculty_id);
CREATE INDEX IF NOT EXISTS idx_sponsors_sort ON public.sponsors(sort_order);
CREATE INDEX IF NOT EXISTS idx_current_titleholders_sort ON public.current_titleholders(sort_order);
CREATE INDEX IF NOT EXISTS idx_current_titleholders_title ON public.current_titleholders(title);

-- Seed faculties
INSERT INTO public.faculties (name, code) VALUES
  ('Fakultas Ilmu Pendidikan', 'FIP'),
  ('Fakultas Bahasa dan Seni', 'FBS'),
  ('Fakultas Ilmu Sosial dan Hukum', 'FISH'),
  ('Fakultas Matematika dan Ilmu Pengetahuan Alam', 'FMIPA'),
  ('Fakultas Teknik', 'FT'),
  ('Fakultas Ekonomi', 'FE'),
  ('Fakultas Olahraga dan Kesehatan', 'FOK'),
  ('Fakultas Kedokteran', 'FK')
ON CONFLICT (code) DO NOTHING;

-- Seed study programs
INSERT INTO public.study_programs (faculty_id, name, code) 
SELECT f.id, sp.name, sp.code
FROM (VALUES 
  ('FIP', 'PGSD', 'PGSD'),
  ('FIP', 'PG PAUD', 'PGPAUD'),
  ('FIP', 'Bimbingan dan Konseling', 'BK'),
  ('FIP', 'Pendidikan Luar Biasa', 'PLB'),
  ('FBS', 'Pendidikan Bahasa Inggris', 'PBI'),
  ('FBS', 'Pendidikan Bahasa Indonesia', 'PBInd'),
  ('FBS', 'Pendidikan Seni Drama, Tari dan Musik', 'Sendratasik'),
  ('FISH', 'Ilmu Hukum', 'IH'),
  ('FISH', 'Ilmu Sosial', 'IS'),
  ('FISH', 'Pendidikan Sejarah', 'PS'),
  ('FISH', 'Pendidikan Geografi', 'PG'),
  ('FISH', 'Pendidikan Pancasila dan Kewarganegaraan', 'PPKN'),
  ('FMIPA', 'Pendidikan Matematika', 'PMat'),
  ('FMIPA', 'Pendidikan IPA', 'PIPA'),
  ('FMIPA', 'Pendidikan Biologi', 'PBio'),
  ('FMIPA', 'Pendidikan Fisika', 'PFis'),
  ('FMIPA', 'Pendidikan Kimia', 'PKim'),
  ('FMIPA', 'Biologi', 'Bio'),
  ('FMIPA', 'Fisika', 'Fis'),
  ('FMIPA', 'Kimia', 'Kim'),
  ('FT', 'Pendidikan Teknik Mesin', 'PTM'),
  ('FT', 'Pendidikan Teknik Elektro', 'PTE'),
  ('FT', 'Pendidikan Teknik Bangunan', 'PTB'),
  ('FT', 'Teknik Informatika', 'TI'),
  ('FT', 'Pendidikan Teknologi Informasi dan Komunikasi', 'PTIK'),
  ('FE', 'Pendidikan Ekonomi', 'PE'),
  ('FE', 'Manajemen', 'Man'),
  ('FE', 'Akuntansi', 'Akun'),
  ('FOK', 'Pendidikan Jasmani, Kesehatan dan Rekreasi', 'PJKR'),
  ('FOK', 'Pendidikan Kepelatihan Olahraga', 'PKO'),
  ('FOK', 'Ilmu Keolahragaan', 'IK'),
  ('FK', 'Pendidikan Profesi Dokter', 'PPD'),
  ('FK', 'Kedokteran', 'Ked')
) AS sp(code_prefix, name, code)
JOIN public.faculties f ON f.code = sp.code_prefix
ON CONFLICT (code) DO NOTHING;

-- Seed default settings
INSERT INTO public.settings (key, value) VALUES
  ('site_name', '"Nyong Noni UNIMA Official Portal"'),
  ('hero_title', '"Nyong Noni UNIMA Official Portal"'),
  ('hero_subtitle', '"The Official Platform of Nyong & Noni Universitas Negeri Manado — Empowering Student Ambassadors in Leadership, Culture, Tourism, Culture Preservation, and Academic Excellence."'),
  ('organization_name', '"Nyong & Noni Universitas Negeri Manado"'),
  ('organization_short', '"Nyong Noni UNIMA"'),
  ('contact_email', '"nyongnoni@unima.ac.id"'),
  ('contact_instagram', '"@nyongnoniunima"'),
  ('grand_final_date', '"2026-12-15T19:00:00"'),
  ('registration_open', 'true'),
  ('about_history', '""'),
  ('about_vision', '""'),
  ('about_mission', '""')
ON CONFLICT (key) DO NOTHING;
