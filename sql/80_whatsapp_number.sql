-- ══════════════════════════════════════════════════════════════
-- sql/80 — Standardise whatsapp_number column name
-- Renames whatsapp_phone → whatsapp_number to match app code.
-- Safe to run multiple times (DO block guards each step).
-- ══════════════════════════════════════════════════════════════

DO $$ BEGIN
  -- Rename if old name exists and new name does not
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'whatsapp_phone'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'whatsapp_number'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN whatsapp_phone TO whatsapp_number;
  END IF;
END $$;

-- Ensure column exists on fresh installs that skipped sql/77
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_number text;

-- Ensure all three verification columns exist (harmless if already created by sql/78)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_verified    boolean     DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_verified_at timestamptz;

-- Back-fill: every row must have an explicit false (not null)
UPDATE public.profiles SET whatsapp_verified = false WHERE whatsapp_verified IS NULL;

-- Index for broadcast queries (all verified users, etc.)
CREATE INDEX IF NOT EXISTS idx_profiles_wa_verified
  ON public.profiles (whatsapp_verified)
  WHERE whatsapp_verified = true;
