-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — Profile patches
-- Adds username column if not present (profiles.username is used
-- throughout the frontend but may be missing from older DB setups)
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text;

-- Optional: unique constraint so no two users share a username
-- (comment out if you allow duplicate usernames)
-- CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
--   ON public.profiles(username) WHERE username IS NOT NULL;
