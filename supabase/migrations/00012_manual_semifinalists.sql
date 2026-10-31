BEGIN;

-- Manual faculty selections may not yet have a complete registration form.
ALTER TABLE public.applicants
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN date_of_birth DROP NOT NULL,
  ALTER COLUMN address DROP NOT NULL,
  ALTER COLUMN city DROP NOT NULL,
  ALTER COLUMN province DROP NOT NULL,
  ALTER COLUMN height_cm DROP NOT NULL,
  ALTER COLUMN height_cm DROP DEFAULT,
  ALTER COLUMN weight_kg DROP NOT NULL,
  ALTER COLUMN weight_kg DROP DEFAULT,
  ALTER COLUMN occupation DROP NOT NULL,
  ALTER COLUMN occupation DROP DEFAULT,
  ALTER COLUMN education DROP NOT NULL,
  ALTER COLUMN education DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.create_manual_semifinalist(
  p_full_name text, p_phone text, p_faculty uuid, p_gender text, p_year integer
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_id uuid;
  v_phone text := regexp_replace(p_phone, '[ ()-]', '', 'g');
  v_normalized text;
BEGIN
  IF p_year IS NULL OR p_year NOT BETWEEN 2000 AND 2100
    OR p_full_name IS NULL OR length(btrim(p_full_name)) NOT BETWEEN 3 AND 200
    OR p_gender IS NULL OR p_gender NOT IN ('Laki-laki', 'Perempuan')
    OR p_phone IS NULL OR length(p_phone) > 30 OR p_phone !~ '^[+0-9 ()-]+$'
    OR v_phone !~ '^(08|628|\+628)[0-9]{8,11}$' THEN
    RAISE EXCEPTION 'Data semifinalis tidak valid';
  END IF;
  v_normalized := regexp_replace(regexp_replace(v_phone, '^0', '62'), '^\+', '');
  PERFORM pg_advisory_xact_lock(10010, p_year);
  IF EXISTS (SELECT 1 FROM public.selection_announcements WHERE year = p_year AND published_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Seleksi tahun ini sudah dipublikasikan';
  END IF;
  PERFORM id FROM public.faculties WHERE id = p_faculty FOR KEY SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Fakultas tidak ditemukan'; END IF;
  IF EXISTS (SELECT 1 FROM public.applicants WHERE selection_year = p_year AND (
    lower(btrim(full_name)) = lower(btrim(p_full_name)) OR
    regexp_replace(regexp_replace(regexp_replace(phone, '[ ()-]', '', 'g'), '^0', '62'), '^\+', '') = v_normalized
  )) THEN RAISE EXCEPTION 'Peserta dengan nama atau nomor WhatsApp ini sudah terdaftar pada tahun tersebut'; END IF;

  INSERT INTO public.applicants (full_name, phone, faculty, gender, selection_year, status)
    VALUES (btrim(p_full_name), btrim(p_phone), p_faculty::text, p_gender, p_year, 'verified') RETURNING id INTO v_id;
  INSERT INTO public.selection_entries (applicant_id, year, stage, semifinalist_at)
    VALUES (v_id, p_year, 'semifinalist', now());
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_manual_semifinalist(text, text, uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_manual_semifinalist(text, text, uuid, text, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.set_selection_study_program(p_applicant_id uuid, p_program_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_year integer;
  a public.applicants%ROWTYPE;
  e public.selection_entries%ROWTYPE;
BEGIN
  SELECT selection_year INTO v_year FROM public.applicants WHERE id = p_applicant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Peserta tidak ditemukan'; END IF;
  PERFORM pg_advisory_xact_lock(10010, v_year);
  PERFORM year FROM public.selection_announcements WHERE year = v_year FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.selection_announcements WHERE year = v_year AND published_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Seleksi tahun ini sudah dipublikasikan';
  END IF;
  SELECT * INTO a FROM public.applicants WHERE id = p_applicant_id FOR UPDATE;
  IF NOT FOUND OR a.selection_year <> v_year THEN RAISE EXCEPTION 'Tahun peserta berubah'; END IF;
  SELECT * INTO e FROM public.selection_entries WHERE applicant_id = p_applicant_id FOR UPDATE;
  IF NOT FOUND OR e.year <> v_year OR a.status <> 'verified' OR e.semifinalist_at IS NULL
    OR e.stage NOT IN ('semifinalist', 'finalist_draft') THEN
    RAISE EXCEPTION 'Tahap peserta tidak valid untuk melengkapi program studi';
  END IF;
  PERFORM id FROM public.study_programs
    WHERE id = p_program_id AND faculty_id::text = a.faculty AND is_active = true FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Program studi tidak valid atau tidak aktif untuk fakultas peserta'; END IF;
  UPDATE public.applicants SET study_program = p_program_id::text, updated_at = now() WHERE id = p_applicant_id;
END;
$$;
REVOKE ALL ON FUNCTION public.set_selection_study_program(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_selection_study_program(uuid, uuid) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
