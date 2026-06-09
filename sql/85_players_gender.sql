-- ══════════════════════════════════════════════════════════════════════
-- sql/85 — Player Directory: gender column + indexes
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_gender_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_gender_check
    CHECK (gender IS NULL OR gender IN ('male', 'female', 'prefer_not_to_say'));

CREATE INDEX IF NOT EXISTS profiles_gender_idx ON public.profiles(gender);

DO $$
BEGIN
  RAISE NOTICE 'OK: sql/85 applied — gender column + player directory indexes ready.';
END;
$$;
