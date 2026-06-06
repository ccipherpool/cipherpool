-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/72  Extended Profile Fields
--
-- Adds: free_fire_uid, city, age, instagram, tiktok, discord, youtube,
--        verified, last_login_at
-- Copies: free_fire_id → free_fire_uid for existing players
-- Adds: partial unique index on free_fire_uid (NULLs allowed)
-- Adds: age >= 13 constraint
-- Adds: country/city/ff_uid search indexes
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_fire_uid  text,
  ADD COLUMN IF NOT EXISTS city           text,
  ADD COLUMN IF NOT EXISTS age            integer,
  ADD COLUMN IF NOT EXISTS instagram      text,
  ADD COLUMN IF NOT EXISTS tiktok         text,
  ADD COLUMN IF NOT EXISTS discord        text,
  ADD COLUMN IF NOT EXISTS youtube        text,
  ADD COLUMN IF NOT EXISTS verified       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at  timestamptz;

-- Age constraint (≥ 13, nullable for existing accounts)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_age_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_age_check CHECK (age IS NULL OR age >= 13);

-- Free Fire UID must be numeric when provided
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_ff_uid_numeric;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_ff_uid_numeric
    CHECK (free_fire_uid IS NULL OR free_fire_uid ~ '^[0-9]+$');

-- Copy existing free_fire_id data into free_fire_uid
UPDATE public.profiles
   SET free_fire_uid = free_fire_id
 WHERE free_fire_id  IS NOT NULL
   AND free_fire_id  ~ '^[0-9]+$'   -- only copy if it's numeric
   AND free_fire_uid IS NULL;

-- Unique partial index: two players can't share the same UID,
-- but NULL means "not set" and is unconstrained.
DROP INDEX IF EXISTS profiles_ff_uid_unique;
CREATE UNIQUE INDEX profiles_ff_uid_unique
  ON public.profiles(free_fire_uid)
  WHERE free_fire_uid IS NOT NULL;

-- Search / filter indexes
CREATE INDEX IF NOT EXISTS profiles_country_idx       ON public.profiles(country);
CREATE INDEX IF NOT EXISTS profiles_city_idx          ON public.profiles(city);
CREATE INDEX IF NOT EXISTS profiles_free_fire_uid_idx ON public.profiles(free_fire_uid);
CREATE INDEX IF NOT EXISTS profiles_last_login_idx    ON public.profiles(last_login_at DESC NULLS LAST);

-- Update last_login_at via trigger whenever a user authenticates.
-- The trigger fires on UPDATE of last_seen_at (already maintained by auth flow).
CREATE OR REPLACE FUNCTION public.sync_last_login()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.last_seen_at IS DISTINCT FROM OLD.last_seen_at THEN
    NEW.last_login_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_last_login ON public.profiles;
CREATE TRIGGER trg_sync_last_login
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_last_login();

DO $$
BEGIN
  RAISE NOTICE 'OK: sql/72 applied — extended profile fields ready.';
END;
$$;
