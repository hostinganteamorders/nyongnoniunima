# Nyong Noni UNIMA Official Portal




\
Portal resmi Nyong & Noni Universitas Negeri Manado — platform pemilihan duta mahasiswa di bidang kepemimpinan, budaya, pariwisata, dan prestasi akademik.

## Tech Stack

- Next.js 15 (App Router)
- TypeScript (strict mode)
- Supabase (Auth, Database, Storage, RLS) — opsional
- SQLite lokal via better-sqlite3 (default, tanpa perlu konfigurasi)
- TailwindCSS v4
- shadcn/ui components
- Zod validation + React Hook Form
- Vitest (unit tests) + Playwright (E2E tests)
- pnpm

## Quick Start

```bash
pnpm install
pnpm dev
```

Buka http://localhost:3000. Tanpa environment Supabase, aplikasi otomatis memakai database SQLite lokal di `data/nyong-noni.db`.

## Commands

- `pnpm dev` — Jalankan development server
- `pnpm build` — Production build
- `pnpm start` — Jalankan server produksi
- `pnpm test` — Unit tests (Vitest)
- `pnpm test:e2e` — E2E tests (Playwright)
- `pnpm lint` — Lint code
- `pnpm typecheck` — TypeScript type checking

## Project Structure

```
src/
  app/          → Next.js App Router pages
    (public)/   → Situs publik (titleholders, news, events, gallery, dll.)
    admin/      → Dashboard admin
  components/   → Reusable UI components
  features/     → Modul fitur berbasis domain
  lib/          → Utilities (db, supabase, helpers, validations)
  server/       → Server actions dan logic API
  types/        → TypeScript types
data/
  nyong-noni.db → Database SQLite lokal (di-commit ke repo)
tests/
  unit/         → Unit tests (Vitest)
  e2e/          → E2E tests (Playwright)
supabase/
  migrations/   → Migrasi database untuk produksi (Supabase)
public/
  images/       → Aset gambar statis
```

## Route Publik

- `/` — Beranda (reigning pair)
- `/titleholders` — Arsip gelar Nyong Noni (2025)
- `/current-titleholders` — Pemegang gelar saat ini
- `/hall-of-fame` — Hall of Fame
- `/news`, `/events`, `/gallery`, `/about`, `/register`
- `/admin` — Dashboard admin (tidak terhubung dari navigasi publik)

## Konvensi Foto Titleholders

Foto pemegang gelar disimpan di `public/images/Title holders/` dengan format nama file:

```
Nama Lengkap (Label Nyong Noni UNIMA Tahun) Fakultas Prodi.png
```

Contoh: `Loren Estefina Lontoh (Wakil I Noni UNIMA 2025) FMIPAK Pendidikan Matematika.png`

Label kategori Duta dan Berbakat memakai "Nyong Noni" (bukan hanya Nyong/Noni).

## Data Lokal & Git

- Database SQLite `data/nyong-noni.db` di-commit ke repo sehingga data ikut ter-deploy ke Vercel.
- Karena aplikasi memakai mode WAL, perubahan data bisa tersimpan di file `.db-wal` (git-ignored) selama server dev masih berjalan.
- **Sebelum push**, pastikan perubahan sudah ter-checkpoint ke file utama:

```bash
pkill -f "next dev"
node -e "require('better-sqlite3')('data/nyong-noni.db').close()"
```

- Di lingkungan filesystem read-only (Vercel serverless), koneksi DB otomatis dibuka read-only sebagai fallback.

## Deployment (Vercel)

1. Push ke branch `main` dari `https://github.com/OrdersMDC/Nyong-Noni-UNIMA`
2. Import repo di Vercel, build command `pnpm build`
3. Jika ingin memakai Supabase, set env vars di bawah; tanpa env vars aplikasi memakai SQLite lokal.

## Semifinalis Manual

Terapkan `supabase/migrations/00012_manual_semifinalists.sql` pada Supabase sebelum memakai **Tambah Semifinalis** di `/admin/selection`. SQLite dimigrasikan otomatis. Data pendaftaran yang belum tersedia disimpan sebagai `NULL`; validasi pendaftaran publik tetap lengkap. Program studi asli harus dilengkapi sebelum publikasi finalis.

Impor daftar privat memakai format JSON berisi `full_name`, `phone`, `faculty_code` (`FT` untuk FATEK), `gender`, dan `selection_year`:

```bash
node --env-file=.env.local scripts/import-semifinalists.cjs data/semifinalists-2026.private.json
node --env-file=.env.local scripts/import-semifinalists.cjs data/semifinalists-2026.private.json --apply
```

Perintah pertama hanya memeriksa; `--apply` menyimpan peserta melalui transaksi server dan memverifikasi tahapnya. Peserta yang sudah cocok dilewati, konflik tidak ditimpa. File `data/*.private.*` tidak masuk Git karena berisi kontak pribadi.

Untuk menyiapkan satu file SQL privat berisi migrasi dan impor transaksional bagi SQL Editor Supabase:

```bash
node scripts/import-semifinalists.cjs data/semifinalists-2026.private.json --sql-file data/semifinalists-2026.private.sql
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```
