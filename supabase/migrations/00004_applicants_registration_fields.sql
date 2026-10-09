-- 00004: Lengkapi kolom pendaftaran di tabel applicants + kolom category di events
-- Jalankan di SQL Editor Supabase (idempoten, aman diulang)

-- applicants: kolom yang dikirim form pendaftaran (belum ada di skema live)
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS place_of_birth TEXT;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('Laki-laki', 'Perempuan'));
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS nim TEXT;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS faculty TEXT;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS study_program TEXT;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS semester INTEGER;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS essay TEXT;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS consent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS tiktok TEXT;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS facebook TEXT;

-- events: kolom kategori (dipakai form admin acara)
ALTER TABLE events ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Kegiatan Sosial'
  CHECK (category IN ('Audisi', 'Karantina', 'Grand Final', 'Kegiatan Sosial', 'Promosi Wisata'));
