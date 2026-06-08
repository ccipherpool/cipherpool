-- ══════════════════════════════════════════════════════════════
-- sql/78 — WhatsApp Verification
-- ══════════════════════════════════════════════════════════════

-- ── Phase 1: Add columns to profiles ─────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_verified    boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_phone       text,
  ADD COLUMN IF NOT EXISTS whatsapp_verified_at timestamptz;

-- Back-fill: make sure existing rows have the default
UPDATE public.profiles
  SET whatsapp_verified = false
  WHERE whatsapp_verified IS NULL;

-- ── Phase 2: OTP table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.whatsapp_verification_codes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone      text        NOT NULL,
  code       text        NOT NULL,
  expires_at timestamptz NOT NULL,
  used       boolean     DEFAULT false,
  attempts   int         DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wvc_user_id    ON public.whatsapp_verification_codes (user_id);
CREATE INDEX IF NOT EXISTS idx_wvc_phone      ON public.whatsapp_verification_codes (phone);
CREATE INDEX IF NOT EXISTS idx_wvc_expires_at ON public.whatsapp_verification_codes (expires_at);
CREATE INDEX IF NOT EXISTS idx_wvc_active     ON public.whatsapp_verification_codes (phone, used, expires_at)
  WHERE used = false;

ALTER TABLE public.whatsapp_verification_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wvc_own_select" ON public.whatsapp_verification_codes;
CREATE POLICY "wvc_own_select" ON public.whatsapp_verification_codes
  FOR SELECT USING (user_id = auth.uid());

-- Service role bypasses RLS — used by all API endpoints.
-- No additional policy needed for server-side operations.

-- ── Cleanup helper (called by cron or server) ─────────────────
CREATE OR REPLACE FUNCTION public.cleanup_expired_otp_codes()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM public.whatsapp_verification_codes
  WHERE expires_at < now() - interval '1 hour';
$$;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_otp_codes() TO service_role;
