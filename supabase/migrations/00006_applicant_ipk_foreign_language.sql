-- 00006: Tambah kolom IPK & Bahasa Asing ke tabel applicants (Syarat & Ketentuan).
-- Jalankan di SQL Editor Supabase (idempoten, aman diulang).
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS ipk NUMERIC;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS foreign_language TEXT;
