-- ============================================================
-- SETUP LENGKAP SUPABASE — Nyong Noni UNIMA
-- Jalankan SATU KALI di: Dashboard > SQL Editor > New query > Run
-- Aman dijalankan ulang (idempotent).
-- ============================================================

-- Bagian 1: inti (profiles, applicants, news, gallery, events + RLS + trigger)
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create applicants table
CREATE TABLE IF NOT EXISTS applicants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  place_of_birth TEXT,
  gender TEXT CHECK (gender IN ('Laki-laki', 'Perempuan')),
  nim TEXT,
  faculty TEXT,
  study_program TEXT,
  semester INTEGER,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  height_cm NUMERIC NOT NULL,
  weight_kg NUMERIC NOT NULL,
  occupation TEXT NOT NULL,
  education TEXT NOT NULL,
  instagram TEXT,
  tiktok TEXT,
  facebook TEXT,
  essay TEXT,
  consent BOOLEAN NOT NULL DEFAULT FALSE,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'finalist')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create news table
CREATE TABLE IF NOT EXISTS news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  image_url TEXT,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create gallery table
CREATE TABLE IF NOT EXISTS gallery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  location TEXT NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'Kegiatan Sosial' CHECK (category IN ('Audisi', 'Karantina', 'Grand Final', 'Kegiatan Sosial', 'Promosi Wisata')),
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
  CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
  CREATE POLICY "Admins can insert profiles" ON profiles FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Applicants RLS
DROP POLICY IF EXISTS "Anyone can insert applicants" ON applicants;
  CREATE POLICY "Anyone can insert applicants" ON applicants FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Applicants can view own entry" ON applicants;
  CREATE POLICY "Applicants can view own entry" ON applicants FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Admins can view all applicants" ON applicants;
  CREATE POLICY "Admins can view all applicants" ON applicants FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update applicants" ON applicants;
  CREATE POLICY "Admins can update applicants" ON applicants FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete applicants" ON applicants;
  CREATE POLICY "Admins can delete applicants" ON applicants FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- News RLS
DROP POLICY IF EXISTS "Anyone can view published news" ON news;
  CREATE POLICY "Anyone can view published news" ON news FOR SELECT USING (published = TRUE);

DROP POLICY IF EXISTS "Admins can view all news" ON news;
  CREATE POLICY "Admins can view all news" ON news FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can insert news" ON news;
  CREATE POLICY "Admins can insert news" ON news FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update news" ON news;
  CREATE POLICY "Admins can update news" ON news FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete news" ON news;
  CREATE POLICY "Admins can delete news" ON news FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Gallery RLS
DROP POLICY IF EXISTS "Anyone can view gallery" ON gallery;
  CREATE POLICY "Anyone can view gallery" ON gallery FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can insert gallery" ON gallery;
  CREATE POLICY "Admins can insert gallery" ON gallery FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update gallery" ON gallery;
  CREATE POLICY "Admins can update gallery" ON gallery FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete gallery" ON gallery;
  CREATE POLICY "Admins can delete gallery" ON gallery FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Events RLS
DROP POLICY IF EXISTS "Anyone can view published events" ON events;
  CREATE POLICY "Anyone can view published events" ON events FOR SELECT USING (published = TRUE);

DROP POLICY IF EXISTS "Admins can view all events" ON events;
  CREATE POLICY "Admins can view all events" ON events FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can insert events" ON events;
  CREATE POLICY "Admins can insert events" ON events FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update events" ON events;
  CREATE POLICY "Admins can update events" ON events FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete events" ON events;
  CREATE POLICY "Admins can delete events" ON events FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_applicants_status ON applicants(status);
CREATE INDEX IF NOT EXISTS idx_applicants_user_id ON applicants(user_id);
CREATE INDEX IF NOT EXISTS idx_news_slug ON news(slug);
CREATE INDEX IF NOT EXISTS idx_news_published ON news(published);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_gallery_category ON gallery(category);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);


-- Bagian 2: tabel kurang

-- ============================================================
-- Tabel yang TIDAK ada di migrasi tapi DIPAKAI codebase
-- (00003 melakukan ALTER pada tabel-tabel ini, jadi wajib ada dulu)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.alumni_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alumni_name TEXT NOT NULL,
  achievement_type TEXT NOT NULL CHECK (achievement_type IN ('ASN', 'Dokter', 'Pengusaha', 'Influencer', 'Duta Nasional')),
  description TEXT NOT NULL,
  tahun TEXT NOT NULL,
  photo_url TEXT,
  instagram TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hall_of_fame (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun INTEGER NOT NULL,
  nyong_name TEXT NOT NULL,
  noni_name TEXT NOT NULL,
  nyong_photo_url TEXT,
  noni_photo_url TEXT,
  kabupaten_kota TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finalist_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  applicant_id UUID NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  instagram TEXT,
  photo_url TEXT,
  bio TEXT,
  tahun TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alumni_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hall_of_fame ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finalist_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view alumni achievements" ON public.alumni_achievements;
  CREATE POLICY "Everyone can view alumni achievements" ON public.alumni_achievements FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admins can manage alumni achievements" ON public.alumni_achievements;
  CREATE POLICY "Admins can manage alumni achievements" ON public.alumni_achievements FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Everyone can view hall of fame" ON public.hall_of_fame;
  CREATE POLICY "Everyone can view hall of fame" ON public.hall_of_fame FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admins can manage hall of fame" ON public.hall_of_fame;
  CREATE POLICY "Admins can manage hall of fame" ON public.hall_of_fame FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Everyone can view finalist profiles" ON public.finalist_profiles;
  CREATE POLICY "Everyone can view finalist profiles" ON public.finalist_profiles FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admins can manage finalist profiles" ON public.finalist_profiles;
  CREATE POLICY "Admins can manage finalist profiles" ON public.finalist_profiles FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- Bagian 3: titleholders
CREATE TABLE IF NOT EXISTS public.titleholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tahun integer NOT NULL CHECK (tahun >= 2000 AND tahun <= 2100),
  category text NOT NULL CHECK (category IN ('Juara Utama', 'Wakil I', 'Wakil II', 'Harapan I', 'Harapan II', 'Berbakat', 'Favorit', 'Fotogenik', 'Persahabatan', 'Duta Pariwisata', 'Duta Lingkungan', 'Duta Sosial', 'Duta Budaya', 'Duta Bahasa', 'Duta Seni', 'Duta Kesehatan', 'Duta Pendidikan', 'Intelegensia', 'Other')),
  nyong_name text NOT NULL,
  noni_name text NOT NULL,
  region text NOT NULL,
  motto text,
  biography text,
  nyong_photo_url text,
  noni_photo_url text,
  nyong_instagram text,
  noni_instagram text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_titleholders_tahun ON public.titleholders (tahun DESC);
CREATE INDEX IF NOT EXISTS idx_titleholders_sort_order ON public.titleholders (sort_order ASC);


-- ============================================================
-- Tambahan titleholders: kolom faculty/study_program (dipakai UI,
-- ada di data lokal tapi tidak ada di migrasi 00002) + RLS
-- ============================================================
ALTER TABLE public.titleholders ADD COLUMN IF NOT EXISTS faculty TEXT;
ALTER TABLE public.titleholders ADD COLUMN IF NOT EXISTS study_program TEXT;

ALTER TABLE public.titleholders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can view titleholders" ON public.titleholders;
  CREATE POLICY "Everyone can view titleholders" ON public.titleholders FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admins can manage titleholders" ON public.titleholders;
  CREATE POLICY "Admins can manage titleholders" ON public.titleholders FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- Bagian 4: skema UNIMA (faculties, study_programs, sponsors, settings,
--            current_titleholders + seed data + RLS)
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
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
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
    'Nyong Duta Pariwisata', 'Noni Duta Pariwisata',
    'Nyong Duta Kesehatan', 'Noni Duta Kesehatan',
    'Nyong Duta Pendidikan', 'Noni Duta Pendidikan',
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
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS ipk NUMERIC;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS foreign_language TEXT;

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
DROP POLICY IF EXISTS "Everyone can view faculties" ON public.faculties;
  CREATE POLICY "Everyone can view faculties" ON public.faculties FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admins can manage faculties" ON public.faculties;
  CREATE POLICY "Admins can manage faculties" ON public.faculties FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Study Programs RLS
DROP POLICY IF EXISTS "Everyone can view study programs" ON public.study_programs;
  CREATE POLICY "Everyone can view study programs" ON public.study_programs FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admins can manage study programs" ON public.study_programs;
  CREATE POLICY "Admins can manage study programs" ON public.study_programs FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Sponsors RLS
DROP POLICY IF EXISTS "Everyone can view sponsors" ON public.sponsors;
  CREATE POLICY "Everyone can view sponsors" ON public.sponsors FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admins can manage sponsors" ON public.sponsors;
  CREATE POLICY "Admins can manage sponsors" ON public.sponsors FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Settings RLS
DROP POLICY IF EXISTS "Everyone can view settings" ON public.settings;
  CREATE POLICY "Everyone can view settings" ON public.settings FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;
  CREATE POLICY "Admins can manage settings" ON public.settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Current Titleholders RLS
DROP POLICY IF EXISTS "Everyone can view current titleholders" ON public.current_titleholders;
  CREATE POLICY "Everyone can view current titleholders" ON public.current_titleholders FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admins can manage current titleholders" ON public.current_titleholders;
  CREATE POLICY "Admins can manage current titleholders" ON public.current_titleholders FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_study_programs_faculty ON public.study_programs(faculty_id);
CREATE INDEX IF NOT EXISTS idx_sponsors_sort ON public.sponsors(sort_order);
CREATE INDEX IF NOT EXISTS idx_current_titleholders_sort ON public.current_titleholders(sort_order);
CREATE INDEX IF NOT EXISTS idx_current_titleholders_title ON public.current_titleholders(title);

-- Seed faculties (nama & kode resmi UNIMA — web.unima.ac.id/fakultas)
-- Normalize legacy-only rows before canonical seeds can create duplicates.
BEGIN;
LOCK TABLE public.faculties IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM (VALUES ('FIP', 'FIPP'), ('FE', 'FEB'), ('FOK', 'FIKKM'), ('FMIPA', 'FMIPAK')) AS c(legacy_code, code)
    JOIN public.faculties f ON f.code IN (c.legacy_code, c.code)
    GROUP BY c.code HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Ambiguous faculty codes in academic catalog';
  END IF;

  UPDATE public.faculties f SET code = c.code, name = c.name
  FROM (VALUES
    ('FIP', 'FIPP', 'Fakultas Ilmu Pendidikan dan Psikologi'),
    ('FE', 'FEB', 'Fakultas Ekonomi dan Bisnis'),
    ('FOK', 'FIKKM', 'Fakultas Ilmu Keolahragaan dan Kesehatan'),
    ('FMIPA', 'FMIPAK', 'Fakultas Matematika, Ilmu Pengetahuan Alam dan Kebumian')
  ) AS c(legacy_code, code, name)
  WHERE f.code = c.legacy_code;
END $$;

INSERT INTO public.faculties (name, code) VALUES
  ('Fakultas Ilmu Pendidikan dan Psikologi', 'FIPP'),
  ('Fakultas Bahasa dan Seni', 'FBS'),
  ('Fakultas Ilmu Sosial dan Hukum', 'FISH'),
  ('Fakultas Matematika, Ilmu Pengetahuan Alam dan Kebumian', 'FMIPAK'),
  ('Fakultas Teknik', 'FT'),
  ('Fakultas Ekonomi dan Bisnis', 'FEB'),
  ('Fakultas Ilmu Keolahragaan dan Kesehatan', 'FIKKM'),
  ('Fakultas Kedokteran', 'FK')
ON CONFLICT (code) DO NOTHING;
COMMIT;

-- Seed study programs
INSERT INTO public.study_programs (faculty_id, name, code) 
SELECT f.id, sp.name, sp.code
FROM (VALUES 
  ('FIPP', 'Pendidikan Guru Sekolah Dasar', 'PGSD'),
  ('FIPP', 'Pendidikan Anak Usia Dini', 'PGPAUD'),
  ('FIPP', 'Bimbingan Konseling', 'BK'),
  ('FIPP', 'Pendidikan Khusus', 'PLB'),
  ('FBS', 'Pendidikan Bahasa Inggris', 'PBI'),
  ('FBS', 'Pendidikan Bahasa dan Sastra Indonesia', 'PBInd'),
  ('FBS', 'Pendidikan Seni Drama, Tari dan Musik', 'Sendratasik'),
  ('FISH', 'Ilmu Hukum', 'IH'),
  ('FISH', 'Ilmu Sosial', 'IS'),
  ('FISH', 'Pendidikan Sejarah', 'PS'),
  ('FISH', 'Pendidikan Geografi', 'PG'),
  ('FISH', 'PPKn', 'PPKN'),
  ('FMIPAK', 'Pendidikan Matematika', 'PMat'),
  ('FMIPAK', 'Pendidikan IPA', 'PIPA'),
  ('FMIPAK', 'Pendidikan Biologi', 'PBio'),
  ('FMIPAK', 'Pendidikan Fisika', 'PFis'),
  ('FMIPAK', 'Pendidikan Kimia', 'PKim'),
  ('FMIPAK', 'Biologi', 'Bio'),
  ('FMIPAK', 'Fisika', 'Fis'),
  ('FMIPAK', 'Kimia', 'Kim'),
  ('FT', 'Pendidikan Teknik Mesin', 'PTM'),
  ('FT', 'Pendidikan Teknik Elektro', 'PTE'),
  ('FT', 'Pendidikan Teknik Bangunan', 'PTB'),
  ('FT', 'Teknik Informatika', 'TI'),
  ('FT', 'Pendidikan Teknik Informatika dan Komunikasi', 'PTIK'),
  ('FEB', 'Pendidikan Ekonomi', 'PE'),
  ('FEB', 'Manajemen', 'Man'),
  ('FEB', 'Akuntansi', 'Akun'),
  ('FIKKM', 'Pendidikan Jasmani, Kesehatan dan Rekreasi', 'PJKR'),
  ('FIKKM', 'Pendidikan Kepelatihan Olahraga', 'PKO'),
  ('FIKKM', 'Ilmu Keolahragaan', 'IK'),
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
  ('registration_open', 'false'),
  ('about_history', '""'),
  ('about_vision', '""'),
  ('about_mission', '""')
ON CONFLICT (key) DO NOTHING;


-- Bagian 5: kolom tambahan gallery

-- ============================================================
-- Tambahan gallery: kolom dimensi untuk <Image> agar tidak layout shift
-- ============================================================
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS width INTEGER;
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS height INTEGER;

-- Bagian 6: staged selection (same schema and RPC as migration 00010).
BEGIN;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS selection_year integer;
UPDATE public.applicants a SET selection_year = COALESCE(
  (SELECT p.tahun::integer FROM public.finalist_profiles p WHERE p.applicant_id = a.id
   AND p.tahun ~ '^(20[0-9]{2}|2100)$' ORDER BY p.created_at DESC LIMIT 1),
  EXTRACT(YEAR FROM a.created_at)::integer
) WHERE selection_year IS NULL;
ALTER TABLE public.applicants ALTER COLUMN selection_year SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_applicants_selection_year ON public.applicants(selection_year);

DO $$ BEGIN
  CREATE TYPE public.selection_stage AS ENUM ('semifinalist', 'finalist_draft', 'finalist', 'not_selected_faculty', 'not_selected_university');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS public.selection_entries (
  applicant_id uuid PRIMARY KEY REFERENCES public.applicants(id) ON DELETE CASCADE,
  year integer NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  stage public.selection_stage NOT NULL,
  semifinalist_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_selection_entries_year ON public.selection_entries(year);
CREATE TABLE IF NOT EXISTS public.faculty_whatsapp_groups (
  year integer NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  faculty_id uuid NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
  invite_url text NOT NULL CHECK (invite_url ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]+(\?mode=[A-Za-z0-9_]+)?$'),
  PRIMARY KEY (year, faculty_id)
);
CREATE TABLE IF NOT EXISTS public.selection_announcements (
  year integer PRIMARY KEY CHECK (year BETWEEN 2000 AND 2100),
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  published_at timestamptz,
  snapshot_json text NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(snapshot_json::jsonb) = 'array')
);
ALTER TABLE public.selection_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_whatsapp_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selection_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finalist_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert applicants" ON public.applicants;
DROP POLICY IF EXISTS "Applicants can view own entry" ON public.applicants;
DROP POLICY IF EXISTS "Everyone can view finalist profiles" ON public.finalist_profiles;
REVOKE ALL ON public.applicants, public.finalist_profiles, public.selection_entries, public.faculty_whatsapp_groups, public.selection_announcements FROM anon;
REVOKE ALL ON public.selection_entries, public.faculty_whatsapp_groups, public.selection_announcements FROM authenticated;
GRANT ALL ON public.applicants, public.finalist_profiles, public.selection_entries, public.faculty_whatsapp_groups, public.selection_announcements TO service_role;
REVOKE ALL ON public.applicants, public.finalist_profiles FROM PUBLIC, authenticated;
GRANT SELECT ON public.applicants, public.finalist_profiles TO authenticated;
DROP POLICY IF EXISTS "Admins can update applicants" ON public.applicants;
DROP POLICY IF EXISTS "Admins can delete applicants" ON public.applicants;
DROP POLICY IF EXISTS "Admins can manage finalist profiles" ON public.finalist_profiles;
DROP POLICY IF EXISTS "Admins can view finalist profiles" ON public.finalist_profiles;
CREATE POLICY "Admins can view finalist profiles" ON public.finalist_profiles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS limits whose row can change; column privileges also protect the role.
REVOKE UPDATE ON public.profiles FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (id, email, full_name, role, avatar_url, created_at, updated_at) ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT UPDATE (email, full_name, avatar_url, updated_at) ON public.profiles TO authenticated;

-- Remove the old overload so omitted preview arguments cannot reach old code.
DROP FUNCTION IF EXISTS public.mutate_selection(text, integer, uuid, text, uuid, text, text, text);
CREATE OR REPLACE FUNCTION public.mutate_selection(
  p_operation text, p_year integer DEFAULT NULL, p_applicant_id uuid DEFAULT NULL,
  p_stage text DEFAULT NULL, p_faculty_id uuid DEFAULT NULL, p_url text DEFAULT NULL,
  p_title text DEFAULT NULL, p_body text DEFAULT NULL,
  p_expected_ids uuid[] DEFAULT NULL, p_expected_title text DEFAULT NULL, p_expected_body text DEFAULT NULL,
  p_data jsonb DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_year integer := p_year;
  a public.applicants%ROWTYPE;
  e public.selection_entries%ROWTYPE;
  n public.selection_announcements%ROWTYPE;
  v_stage public.selection_stage;
  v_snapshot text;
  v_setting jsonb;
  v_active_year integer := 2026; -- AUDITION_START year when the setting is absent/invalid.
  v_ids uuid[];
  v_profile_id uuid;
BEGIN
  IF p_operation IN ('publish', 'registration_year') THEN
    -- Serialize year changes with publication, including a missing setting row.
    PERFORM pg_advisory_xact_lock(10010, 0);
    IF p_operation = 'registration_year' THEN
      IF p_year IS NULL OR p_year NOT BETWEEN 2000 AND 2100 THEN RAISE EXCEPTION 'Tahun tidak valid'; END IF;
      INSERT INTO public.settings (key, value) VALUES ('selection_year', to_jsonb(p_year))
        ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now();
      RETURN;
    END IF;
    SELECT value INTO v_setting FROM public.settings WHERE key = 'selection_year' FOR SHARE;
    IF jsonb_typeof(v_setting) = 'string' THEN
      BEGIN v_setting := (v_setting #>> '{}')::jsonb;
      EXCEPTION WHEN invalid_text_representation THEN v_setting := 'null'::jsonb; END;
    END IF;
    IF jsonb_typeof(v_setting) = 'number' THEN
      IF (v_setting #>> '{}')::numeric BETWEEN 2000 AND 2100 AND trunc((v_setting #>> '{}')::numeric) = (v_setting #>> '{}')::numeric THEN
        v_active_year := (v_setting #>> '{}')::numeric::integer;
      END IF;
    ELSIF jsonb_typeof(v_setting) = 'string' AND (v_setting #>> '{}') ~ '^(20[0-9]{2}|2100)$' THEN
      v_active_year := (v_setting #>> '{}')::integer;
    END IF;
    IF p_year IS DISTINCT FROM v_active_year THEN RAISE EXCEPTION 'Hanya tahun seleksi aktif yang dapat dipublikasikan'; END IF;
  END IF;
  IF p_operation IN ('stage', 'applicant_status', 'delete', 'finalist_data') THEN
    SELECT selection_year INTO v_year FROM public.applicants WHERE id = p_applicant_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Peserta tidak ditemukan'; END IF;
  END IF;
  IF v_year IS NULL OR v_year NOT BETWEEN 2000 AND 2100 THEN RAISE EXCEPTION 'Tahun tidak valid'; END IF;
  PERFORM pg_advisory_xact_lock(10010, v_year);
  SELECT * INTO n FROM public.selection_announcements WHERE year = v_year FOR UPDATE;
  IF p_operation = 'publish' AND n.published_at IS NOT NULL THEN RETURN; END IF;
  IF p_operation NOT IN ('group', 'delete', 'finalist_data') AND n.published_at IS NOT NULL THEN RAISE EXCEPTION 'Seleksi sudah dipublikasikan'; END IF;

  IF p_operation IN ('stage', 'applicant_status', 'delete', 'finalist_data') THEN
    SELECT * INTO a FROM public.applicants WHERE id = p_applicant_id FOR UPDATE;
    IF NOT FOUND OR a.selection_year <> v_year THEN RAISE EXCEPTION 'Tahun peserta berubah'; END IF;
    SELECT * INTO e FROM public.selection_entries WHERE applicant_id = p_applicant_id FOR UPDATE;
    IF e.year IS NOT NULL AND e.year <> v_year THEN RAISE EXCEPTION 'Tahun tahap seleksi tidak sesuai'; END IF;
    IF p_operation = 'delete' THEN
      IF e.stage = 'finalist' AND n.published_at IS NOT NULL THEN RAISE EXCEPTION 'Finalis terpublikasi tidak dapat dihapus'; END IF;
      DELETE FROM public.applicants WHERE id = a.id;
      RETURN;
    END IF;
    IF p_operation = 'finalist_data' THEN
      IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' THEN RAISE EXCEPTION 'Data finalis tidak valid'; END IF;
      IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_data) k WHERE k NOT IN
        ('full_name', 'email', 'phone', 'date_of_birth', 'address', 'city', 'province', 'height_cm', 'weight_kg', 'occupation', 'education', 'instagram', 'photo_url', 'bio', 'tahun'))
        OR jsonb_typeof(p_data->'tahun') IS DISTINCT FROM 'string' OR length(p_data->>'tahun') < 4 THEN RAISE EXCEPTION 'Kolom finalis tidak valid'; END IF;
      IF EXISTS (SELECT 1 FROM jsonb_each(p_data) kv WHERE
        CASE WHEN kv.key IN ('height_cm', 'weight_kg') THEN jsonb_typeof(kv.value) <> 'number'
          WHEN kv.key = 'photo_url' THEN jsonb_typeof(kv.value) NOT IN ('string', 'null')
          ELSE jsonb_typeof(kv.value) <> 'string' END) THEN RAISE EXCEPTION 'Tipe data finalis tidak valid'; END IF;
      a := jsonb_populate_record(a, p_data - ARRAY['instagram', 'photo_url', 'bio', 'tahun']);
      UPDATE public.applicants SET full_name = a.full_name, email = a.email, phone = a.phone, date_of_birth = a.date_of_birth,
        address = a.address, city = a.city, province = a.province, height_cm = a.height_cm, weight_kg = a.weight_kg,
        occupation = a.occupation, education = a.education, updated_at = now() WHERE id = a.id;
      SELECT id INTO v_profile_id FROM public.finalist_profiles WHERE applicant_id = a.id ORDER BY created_at DESC, id LIMIT 1 FOR UPDATE;
      IF v_profile_id IS NULL THEN
        INSERT INTO public.finalist_profiles (applicant_id, instagram, photo_url, bio, tahun)
          VALUES (a.id, p_data->>'instagram', p_data->>'photo_url', p_data->>'bio', p_data->>'tahun');
      ELSE
        UPDATE public.finalist_profiles SET
          instagram = CASE WHEN p_data ? 'instagram' THEN p_data->>'instagram' ELSE instagram END,
          photo_url = CASE WHEN p_data ? 'photo_url' THEN p_data->>'photo_url' ELSE photo_url END,
          bio = CASE WHEN p_data ? 'bio' THEN p_data->>'bio' ELSE bio END, tahun = p_data->>'tahun', updated_at = now()
          WHERE id = v_profile_id;
      END IF;
      RETURN;
    END IF;
    IF a.status = 'finalist' OR e.stage = 'finalist' THEN RAISE EXCEPTION 'Finalis tidak dapat diubah'; END IF;
    IF p_operation = 'applicant_status' THEN
      IF p_stage IS NULL OR p_stage NOT IN ('pending', 'verified', 'rejected') OR e.applicant_id IS NOT NULL THEN RAISE EXCEPTION 'Status tidak valid'; END IF;
      UPDATE public.applicants SET status = p_stage, updated_at = now() WHERE id = p_applicant_id;
      RETURN;
    END IF;
    IF p_stage = 'semifinalist' AND e.stage IS NULL AND a.status = 'verified' THEN v_stage := 'semifinalist';
    ELSIF p_stage = 'not_selected_faculty' AND e.stage IS NULL AND a.status IN ('pending', 'verified') THEN v_stage := 'not_selected_faculty';
    ELSIF p_stage IN ('finalist_draft', 'not_selected_university') AND e.stage = 'semifinalist' AND a.status = 'verified' THEN v_stage := p_stage::public.selection_stage;
    ELSIF p_stage = 'reset_finalist_draft' AND e.stage = 'finalist_draft' AND a.status = 'verified' THEN v_stage := 'semifinalist';
    ELSE RAISE EXCEPTION 'Transisi tahap seleksi tidak valid'; END IF;
    INSERT INTO public.selection_entries (applicant_id, year, stage, semifinalist_at)
    VALUES (a.id, v_year, v_stage, COALESCE(e.semifinalist_at, CASE WHEN v_stage = 'semifinalist' THEN now() END))
    ON CONFLICT (applicant_id) DO UPDATE SET stage = excluded.stage, semifinalist_at = excluded.semifinalist_at;
  ELSIF p_operation = 'group' THEN
    IF NOT EXISTS (SELECT 1 FROM public.faculties WHERE id = p_faculty_id) OR p_url IS NULL THEN RAISE EXCEPTION 'Fakultas tidak valid'; END IF;
    IF p_url = '' THEN DELETE FROM public.faculty_whatsapp_groups WHERE year = v_year AND faculty_id = p_faculty_id;
    ELSE INSERT INTO public.faculty_whatsapp_groups (year, faculty_id, invite_url) VALUES (v_year, p_faculty_id, p_url)
      ON CONFLICT (year, faculty_id) DO UPDATE SET invite_url = excluded.invite_url;
    END IF;
  ELSIF p_operation = 'announcement' THEN
    IF p_title IS NULL OR p_body IS NULL OR length(p_title) > 200 OR length(p_body) > 20000 THEN RAISE EXCEPTION 'Pengumuman tidak valid'; END IF;
    INSERT INTO public.selection_announcements (year, title, body) VALUES (v_year, btrim(p_title), btrim(p_body))
      ON CONFLICT (year) DO UPDATE SET title = excluded.title, body = excluded.body;
  ELSIF p_operation = 'publish' THEN
    SELECT COALESCE(array_agg(applicant_id ORDER BY applicant_id), '{}'::uuid[]) INTO v_ids
      FROM public.selection_entries WHERE year = v_year AND stage = 'finalist_draft';
    IF p_expected_ids IS NULL OR p_expected_title IS DISTINCT FROM n.title OR p_expected_body IS DISTINCT FROM n.body
      OR EXISTS (SELECT 1 FROM unnest(p_expected_ids) id WHERE id IS NULL)
      OR cardinality(p_expected_ids) <> (SELECT count(DISTINCT id) FROM unnest(p_expected_ids) id)
      OR v_ids IS DISTINCT FROM (SELECT COALESCE(array_agg(id ORDER BY id), '{}'::uuid[]) FROM unnest(p_expected_ids) id)
      THEN RAISE EXCEPTION 'Pratinjau berubah. Muat ulang data seleksi sebelum publikasi.'; END IF;
    IF n.year IS NULL OR btrim(n.title) = '' OR btrim(n.body) = '' THEN RAISE EXCEPTION 'Judul dan isi pengumuman wajib diisi'; END IF;
    PERFORM a2.id FROM public.applicants a2 JOIN public.selection_entries e2 ON e2.applicant_id = a2.id
      WHERE e2.year = v_year ORDER BY a2.id FOR UPDATE OF a2;
    IF NOT EXISTS (SELECT 1 FROM public.selection_entries WHERE year = v_year AND stage = 'finalist_draft') THEN RAISE EXCEPTION 'Belum ada calon finalis'; END IF;
    IF EXISTS (SELECT 1 FROM public.selection_entries e2 JOIN public.applicants a2 ON a2.id = e2.applicant_id
      WHERE e2.year = v_year AND (e2.stage = 'finalist' OR (e2.stage = 'finalist_draft' AND
        (a2.status <> 'verified' OR a2.selection_year <> v_year OR e2.semifinalist_at IS NULL OR btrim(a2.full_name) = ''
         OR COALESCE(btrim(a2.faculty), '') = '' OR COALESCE(btrim(a2.study_program), '') = '')))) THEN RAISE EXCEPTION 'Data calon finalis tidak valid'; END IF;
    SELECT jsonb_agg(jsonb_build_object('id', a2.id, 'full_name', a2.full_name,
      'faculty', COALESCE(f.name, a2.faculty), 'study_program', COALESCE(p.name, a2.study_program),
      'gender', a2.gender, 'photo_url', COALESCE(fp.photo_url, a2.photo_url)) ORDER BY a2.full_name, a2.id)::text
      INTO v_snapshot FROM public.selection_entries e2 JOIN public.applicants a2 ON a2.id = e2.applicant_id
      LEFT JOIN public.faculties f ON f.id::text = a2.faculty LEFT JOIN public.study_programs p ON p.id::text = a2.study_program
      LEFT JOIN LATERAL (SELECT photo_url FROM public.finalist_profiles WHERE applicant_id = a2.id AND photo_url IS NOT NULL ORDER BY created_at DESC LIMIT 1) fp ON true
      WHERE e2.year = v_year AND e2.stage = 'finalist_draft';
    UPDATE public.selection_entries SET stage = CASE WHEN stage = 'finalist_draft' THEN 'finalist'::public.selection_stage ELSE 'not_selected_university'::public.selection_stage END
      WHERE year = v_year AND stage IN ('finalist_draft', 'semifinalist');
    UPDATE public.selection_announcements SET published_at = now(), snapshot_json = v_snapshot WHERE year = v_year;
  ELSE RAISE EXCEPTION 'Operasi tidak valid'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.mutate_selection(text, integer, uuid, text, uuid, text, text, text, uuid[], text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mutate_selection(text, integer, uuid, text, uuid, text, text, text, uuid[], text, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.guard_applicant_registration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(10010, NEW.selection_year);
  IF EXISTS (SELECT 1 FROM public.selection_announcements WHERE year = NEW.selection_year AND published_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Seleksi tahun ini sudah dipublikasikan; pendaftaran ditutup';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_applicant_registration() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_applicant_registration() TO service_role;
DROP TRIGGER IF EXISTS guard_applicant_registration ON public.applicants;
CREATE TRIGGER guard_applicant_registration BEFORE INSERT ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION public.guard_applicant_registration();
COMMIT;

-- Bagian 7: academic catalog (same SQL as migration 00011).
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
