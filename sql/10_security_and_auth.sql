-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — Security & Auth Hardening
-- Run this after 06_base_schema.sql and 09_rpc_functions.sql
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. PREVENT ROLE SELF-ESCALATION
--    Users cannot change their own role via direct UPDATE
-- ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_write_self" ON public.profiles;

CREATE POLICY "profiles_write_self" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent self-role modification: new role must equal current role
    AND (
      role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- 2. PREVENT DIRECT WALLET MANIPULATION BY USERS
--    Only RPC functions (SECURITY DEFINER) can update balances
-- ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "wallets_write_self" ON public.wallets;

-- Users can only READ their own wallet (not write)
-- All writes go through the admin_adjust_coins / join_tournament RPCs
CREATE POLICY "wallets_read_self_only" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

-- Only admins/super_admins can directly modify wallets (for emergency fixes)
CREATE POLICY "wallets_admin_write" ON public.wallets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- ─────────────────────────────────────────────────────────────────────
-- 3. IMMUTABLE ADMIN LOGS
--    Admin logs can only be inserted, never updated or deleted
-- ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_logs_update" ON public.admin_logs;
DROP POLICY IF EXISTS "admin_logs_delete" ON public.admin_logs;

-- No UPDATE or DELETE policies = no one can modify or delete logs

-- ─────────────────────────────────────────────────────────────────────
-- 4. SYSTEM CONFIG — SINGLE ROW ENFORCEMENT
-- ─────────────────────────────────────────────────────────────────────
-- Ensure only one row can ever exist in system_config
CREATE OR REPLACE FUNCTION public.enforce_system_config_singleton()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id != 1 THEN
    RAISE EXCEPTION 'system_config must have exactly one row with id=1';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_singleton ON public.system_config;
CREATE TRIGGER enforce_singleton
  BEFORE INSERT ON public.system_config
  FOR EACH ROW EXECUTE FUNCTION public.enforce_system_config_singleton();

-- ─────────────────────────────────────────────────────────────────────
-- 5. RATE-LIMIT WALLET TRANSACTIONS (prevent abuse)
--    Max 10 wallet operations per user per hour (checked in RPC)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_wallet_rate_limit(p_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COUNT(*) < 10
  FROM public.wallet_transactions
  WHERE user_id = p_user_id
    AND created_at > now() - INTERVAL '1 hour';
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 6. SECURE TOURNAMENT JOIN
--    Prevent joining multiple times and verify status
-- ─────────────────────────────────────────────────────────────────────
-- Already secured in join_tournament RPC in 09_rpc_functions.sql

-- ─────────────────────────────────────────────────────────────────────
-- 7. PROFILE COMPLETENESS FUNCTION
--    Returns percentage of profile completion (for UI badge)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_profile_completion(p_user_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE sql SECURITY DEFINER AS $$
  SELECT (
    CASE WHEN username IS NOT NULL AND username != '' THEN 20 ELSE 0 END +
    CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 20 ELSE 0 END +
    CASE WHEN avatar_url IS NOT NULL AND avatar_url != '' THEN 20 ELSE 0 END +
    CASE WHEN free_fire_id IS NOT NULL AND free_fire_id != '' THEN 20 ELSE 0 END +
    CASE WHEN verification_status = 'verified' THEN 20 ELSE 0 END
  )::integer
  FROM public.profiles
  WHERE id = COALESCE(p_user_id, auth.uid());
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 8. PREVENT BANNED USERS FROM JOINING TOURNAMENTS
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_ban_status()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_role text;
  v_banned_until timestamptz;
BEGIN
  SELECT role, banned_until INTO v_role, v_banned_until
  FROM public.profiles WHERE id = NEW.user_id;

  IF v_role = 'banned' THEN
    RAISE EXCEPTION 'Banned users cannot join tournaments';
  END IF;

  IF v_banned_until IS NOT NULL AND v_banned_until > now() THEN
    RAISE EXCEPTION 'Your account is temporarily suspended until %', v_banned_until;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_ban_on_join ON public.tournament_players;
CREATE TRIGGER check_ban_on_join
  BEFORE INSERT ON public.tournament_players
  FOR EACH ROW EXECUTE FUNCTION public.check_ban_status();

-- ─────────────────────────────────────────────────────────────────────
-- 9. EMAIL VERIFICATION CHECK FUNCTION
--    Use in frontend/RPC to check if user has verified email
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_email_verified()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT email_confirmed_at IS NOT NULL
  FROM auth.users
  WHERE id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 10. CLEANUP EXPIRED ANNOUNCEMENTS (scheduled via pg_cron if available)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cleanup_expired_announcements()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.announcements
  SET is_active = false
  WHERE expires_at IS NOT NULL
    AND expires_at < now()
    AND is_active = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- SUPABASE DASHBOARD CONFIGURATION (do these manually)
-- ─────────────────────────────────────────────────────────────────────
-- Authentication > URL Configuration:
--   Site URL:     https://cipherpool.space
--   Redirect URLs (add all):
--     http://localhost:5173/**
--     https://cipherpool.space/**
--
-- Authentication > Email Templates:
--   Confirm signup subject: "🎮 Activate your CipherPool account"
--   Reset password subject: "🔑 Reset your CipherPool password"
--
-- Authentication > Providers > Email:
--   Enable email confirmations: YES (recommended for production)
--   Secure email change: YES
-- ─────────────────────────────────────────────────────────────────────
