-- Close public registration: site shows "Coming Soon" and submitRegistration is rejected.
-- Flip back to 'true' via Admin > Settings (key: registration_open) to reopen.
UPDATE settings
SET value = 'false', updated_at = now()
WHERE key = 'registration_open';
