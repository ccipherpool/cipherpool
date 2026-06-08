-- ══════════════════════════════════════════════════════════════
-- sql/79 — Fix: grant table privileges for whatsapp_verification_codes
--
-- Root cause: sql/78 enabled RLS but never ran GRANT, so PostgreSQL
-- blocks all access at the table level before RLS even runs.
-- The error "permission denied for table" is a GRANT issue, not RLS.
-- service_role bypasses RLS row-checks but still needs table GRANT.
-- ══════════════════════════════════════════════════════════════

-- Grant full access to all Supabase roles that need it
GRANT ALL ON TABLE public.whatsapp_verification_codes
  TO postgres, anon, authenticated, service_role;

-- Also grant sequence (for uuid gen, though uuid uses gen_random_uuid)
GRANT USAGE ON SCHEMA public TO service_role;

-- Fix RLS: add INSERT + UPDATE + DELETE policies for authenticated users
-- (the API uses service_role which bypasses RLS, but add these for completeness)

DROP POLICY IF EXISTS "wvc_own_select" ON public.whatsapp_verification_codes;
DROP POLICY IF EXISTS "wvc_own_insert" ON public.whatsapp_verification_codes;
DROP POLICY IF EXISTS "wvc_own_update" ON public.whatsapp_verification_codes;

-- Select: user can only see their own codes
CREATE POLICY "wvc_own_select" ON public.whatsapp_verification_codes
  FOR SELECT USING (user_id = auth.uid());

-- Insert: user can only insert rows for themselves
CREATE POLICY "wvc_own_insert" ON public.whatsapp_verification_codes
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Update: user can only update their own codes
CREATE POLICY "wvc_own_update" ON public.whatsapp_verification_codes
  FOR UPDATE USING (user_id = auth.uid());

-- Also ensure the profiles columns are accessible
-- (these were added in sql/77+78 but may also be missing grants on some projects)
GRANT ALL ON TABLE public.profiles TO postgres, anon, authenticated, service_role;
