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
  category text NOT NULL CHECK (category IN ('Juara Utama', 'Wakil I', 'Wakil II', 'Harapan I', 'Harapan II', 'Berbakat', 'Favorit', 'Fotogenik', 'Persahabatan', 'Digital', 'Duta Lingkungan', 'Duta Sosial', 'Duta Budaya', 'Duta Bahasa', 'Duta Seni', 'Intelegensia', 'Other')),
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


-- Bagian 5: kolom tambahan gallery

-- ============================================================
-- Tambahan gallery: kolom dimensi untuk <Image> agar tidak layout shift
-- ============================================================
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS width INTEGER;
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS height INTEGER;

