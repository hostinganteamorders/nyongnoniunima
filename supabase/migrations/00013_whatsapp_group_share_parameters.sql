BEGIN;

ALTER TABLE public.faculty_whatsapp_groups
  DROP CONSTRAINT IF EXISTS faculty_whatsapp_groups_invite_url_check;
ALTER TABLE public.faculty_whatsapp_groups
  ADD CONSTRAINT faculty_whatsapp_groups_invite_url_check CHECK (
    invite_url ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]+(\?(mode|s|p|mlu|ilr|iam)=[A-Za-z0-9_-]+(&(mode|s|p|mlu|ilr|iam)=[A-Za-z0-9_-]+)*)?$'
    AND invite_url !~ '[[:space:][:cntrl:]]'
  );

NOTIFY pgrst, 'reload schema';
COMMIT;
