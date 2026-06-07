-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/73  Free Fire Name Field
-- Adds: free_fire_name (in-game nickname) to profiles
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_fire_name text;

CREATE INDEX IF NOT EXISTS profiles_ff_name_idx ON public.profiles(free_fire_name);

DO $$
BEGIN
  RAISE NOTICE 'OK: sql/73 applied — free_fire_name column ready.';
END;
$$;
