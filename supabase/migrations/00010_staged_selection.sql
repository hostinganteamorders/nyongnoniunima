-- Public applicant data is served exclusively by server-side safe DTOs.
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
-- No direct selection writes: every mutation must acquire the same year lock.
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
