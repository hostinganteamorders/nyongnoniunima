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
