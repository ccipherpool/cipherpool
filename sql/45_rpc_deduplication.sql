-- ════════════════════════════════════════════════════════════════════════════
-- CIPHERPOOL — SQL STABILIZATION: RPC Deduplication + Role Normalization
-- File: sql/45_rpc_deduplication.sql
-- Run in Supabase SQL Editor as postgres / service-role
--
-- What this does:
--   1. Migrates 'fondateur' users → 'founder'
--   2. Drops the 'fondateur' role from all role checks
--   3. Creates canonical permission helpers (is_admin, is_super_admin, etc.)
--   4. Drops all duplicate RPC functions (30+ pairs)
--   5. Creates ONE canonical version of each with:
--        - RETURNS jsonb (standard response)
--        - SET search_path = public
--        - EXCEPTION handling
--        - English-only text
--        - Param names compatible with existing frontend calls
-- ════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 1 — ROLE NORMALIZATION
-- ─────────────────────────────────────────────────────────────────────────────

-- 1a. Migrate all 'fondateur' users to 'founder'
UPDATE public.profiles
SET role = 'founder', updated_at = now()
WHERE role = 'fondateur';

-- 1b. Fix set_user_role to reject 'fondateur' and accept valid roles only
-- (handled in the canonical function below)

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 1b — PRE-DROP ALL FUNCTIONS WITH POSSIBLE RETURN TYPE CHANGES
-- (CREATE OR REPLACE cannot change return type — must drop first)
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.set_user_role(uuid, text);
DROP FUNCTION IF EXISTS public.ban_user(uuid, timestamptz, uuid);
DROP FUNCTION IF EXISTS public.unban_user(uuid);
DROP FUNCTION IF EXISTS public.delete_user_complete(uuid);
DROP FUNCTION IF EXISTS public.grant_coins(uuid, integer, text);
DROP FUNCTION IF EXISTS public.check_user_permission(uuid, text);
DROP FUNCTION IF EXISTS public.add_season_xp(uuid, integer, text);
DROP FUNCTION IF EXISTS public.admin_verify_result(uuid, text);
DROP FUNCTION IF EXISTS public.apply_report_action(uuid, text, text, text, uuid);
DROP FUNCTION IF EXISTS public.approve_ai_action(uuid, text);
DROP FUNCTION IF EXISTS public.broadcast_notification(text, text, text, text[]);
DROP FUNCTION IF EXISTS public.check_rate_limit(text, integer, interval);
DROP FUNCTION IF EXISTS public.dismiss_ai_alert(uuid, text);
DROP FUNCTION IF EXISTS public.emergency_freeze(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.final_review_admin_application(uuid, text, text, integer);
DROP FUNCTION IF EXISTS public.force_resolve_dispute(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.leave_tournament(uuid);
DROP FUNCTION IF EXISTS public.mark_notifications_read(uuid[]);
DROP FUNCTION IF EXISTS public.resolve_emergency(uuid, text);
DROP FUNCTION IF EXISTS public.schedule_maintenance(text, text, text, timestamptz, timestamptz, text[], boolean, text);
DROP FUNCTION IF EXISTS public.send_gift(uuid, uuid, integer, text);
DROP FUNCTION IF EXISTS public.setup_room(uuid, text, text, timestamptz, integer, integer);
DROP FUNCTION IF EXISTS public.submit_ai_action(text, text, text, text, text, text, uuid, text, jsonb, boolean, text, uuid);
DROP FUNCTION IF EXISTS public.submit_bug_report(text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.submit_match_result(uuid, integer, integer, text, integer, uuid, integer);
DROP FUNCTION IF EXISTS public.update_system_setting(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.vote_feature(uuid, integer);
DROP FUNCTION IF EXISTS public.delete_tournament_complete(uuid);
DROP FUNCTION IF EXISTS public.get_site_settings_public();
DROP FUNCTION IF EXISTS public.toggle_feature_flag(text, boolean);
DROP FUNCTION IF EXISTS public.update_site_setting(text, jsonb, text);

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 2 — CANONICAL PERMISSION HELPERS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- Overloaded version (uid param) — keep for internal use
CREATE OR REPLACE FUNCTION public.is_super_admin(uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_founder()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('founder', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.has_staff_access()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'founder', 'super_admin')
  );
$$;

-- Keep is_role helpers (no duplicate conflict, just replace)
CREATE OR REPLACE FUNCTION public.is_role(p_role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = p_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_role(p_roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ANY(p_roles)
  );
$$;

-- Fix is_super_or_founder to remove fondateur
CREATE OR REPLACE FUNCTION public.is_super_or_founder()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'founder')
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 3 — DROP DUPLICATE FUNCTIONS + CREATE CANONICAL VERSIONS
-- Each DROP removes all conflicting signatures, then we CREATE one canonical.
-- ─────────────────────────────────────────────────────────────────────────────


-- ────────────────────────────────────────────────────────────────────────
-- 3.1 set_user_role
-- Frontend calls: { target_user, new_role }
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.set_user_role(uuid, text);
DROP FUNCTION IF EXISTS public.set_user_role(p_user_id uuid, p_role text);

CREATE OR REPLACE FUNCTION public.set_user_role(
  target_user uuid,
  new_role    text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions', 'code', 'PERMISSION_DENIED');
  END IF;

  -- Valid roles only — fondateur removed
  IF new_role NOT IN ('super_admin', 'admin', 'founder', 'designer', 'user', 'banned') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role: ' || new_role, 'code', 'INVALID_ROLE');
  END IF;

  UPDATE public.profiles
  SET role = new_role, updated_at = now()
  WHERE id = target_user;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found', 'code', 'NOT_FOUND');
  END IF;

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('user_id', target_user, 'new_role', new_role));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.2 ban_user
-- Frontend calls: { target_user, banned_until, banned_by }
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.ban_user(uuid, timestamptz, uuid);
DROP FUNCTION IF EXISTS public.ban_user(p_user_id uuid, p_reason text, p_duration interval);
DROP FUNCTION IF EXISTS public.ban_user(target_user uuid, banned_until timestamptz, banned_by uuid);

CREATE OR REPLACE FUNCTION public.ban_user(
  target_user  uuid,
  banned_until timestamptz,
  banned_by    uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions', 'code', 'PERMISSION_DENIED');
  END IF;

  IF target_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target user required', 'code', 'INVALID_INPUT');
  END IF;

  UPDATE public.profiles
  SET
    role         = 'banned',
    banned_until = ban_user.banned_until,
    banned_by    = ban_user.banned_by,
    updated_at   = now()
  WHERE id = target_user;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found', 'code', 'NOT_FOUND');
  END IF;

  -- Log the ban action
  INSERT INTO public.admin_logs (user_id, action, details)
  VALUES (
    auth.uid(),
    'ban_user',
    jsonb_build_object('target_user', target_user, 'banned_until', banned_until)
  ) ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('target_user', target_user));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ban_user(uuid, timestamptz, uuid) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.3 unban_user
-- Frontend calls: { target_user }
-- Backup had: p_user_id — fix param name
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.unban_user(uuid);

CREATE OR REPLACE FUNCTION public.unban_user(target_user uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions', 'code', 'PERMISSION_DENIED');
  END IF;

  UPDATE public.profiles
  SET role = 'user', banned_until = NULL, banned_by = NULL, updated_at = now()
  WHERE id = target_user AND role = 'banned';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found or not banned', 'code', 'NOT_FOUND');
  END IF;

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('target_user', target_user));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.unban_user(uuid) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.4 delete_user_complete
-- Frontend calls: { target_user }
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.delete_user_complete(uuid);

CREATE OR REPLACE FUNCTION public.delete_user_complete(target_user uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only super_admin can delete users', 'code', 'PERMISSION_DENIED');
  END IF;

  IF target_user = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete your own account', 'code', 'SELF_DELETE');
  END IF;

  DELETE FROM public.profiles WHERE id = target_user;
  DELETE FROM auth.users WHERE id = target_user;

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('deleted_user', target_user));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_complete(uuid) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.5 grant_coins
-- Frontend calls: { target_user, amount } or { target_user, amount, reason }
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.grant_coins(uuid, integer);
DROP FUNCTION IF EXISTS public.grant_coins(target_user uuid, amount integer);
DROP FUNCTION IF EXISTS public.grant_coins(p_user_id uuid, p_amount integer, p_reason text);

CREATE OR REPLACE FUNCTION public.grant_coins(
  target_user uuid,
  amount      integer,
  reason      text DEFAULT 'Admin grant'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_new_balance integer;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('admin', 'super_admin', 'founder') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions', 'code', 'PERMISSION_DENIED');
  END IF;

  IF amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive', 'code', 'INVALID_INPUT');
  END IF;

  INSERT INTO public.wallets (user_id, balance)
  VALUES (target_user, 0)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.wallets
  SET balance = balance + amount, updated_at = now()
  WHERE user_id = target_user
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to update wallet', 'code', 'WALLET_ERROR');
  END IF;

  INSERT INTO public.wallet_transactions (user_id, amount, type, reason, admin_id)
  VALUES (target_user, amount, 'credit', COALESCE(reason, 'Admin grant'), auth.uid());

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    target_user, 'coins_received', 'CP Received!',
    format('You received %s CP. Reason: %s', amount, COALESCE(reason, 'Admin grant')),
    jsonb_build_object('amount', amount, 'new_balance', v_new_balance)
  ) ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('new_balance', v_new_balance, 'amount', amount));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_coins(uuid, integer, text) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.6 check_user_permission
-- Frontend calls: { user_id (or p_user_id), required_role }
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.check_user_permission(uuid, text);
DROP FUNCTION IF EXISTS public.check_user_permission(p_user_id uuid, required_role text, permission_name text);

CREATE OR REPLACE FUNCTION public.check_user_permission(
  p_user_id     uuid,
  required_role text DEFAULT 'user'
)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id
      AND CASE required_role
        WHEN 'super_admin' THEN role = 'super_admin'
        WHEN 'admin'       THEN role IN ('admin', 'super_admin')
        WHEN 'founder'     THEN role IN ('founder', 'admin', 'super_admin')
        WHEN 'designer'    THEN role IN ('designer', 'admin', 'super_admin')
        ELSE role NOT IN ('banned')
      END
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_user_permission(uuid, text) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.7 add_season_xp
-- Keep 3-param version (p_user_id, p_xp, p_reason)
-- Drop 3-param version with season_id (deprecated)
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.add_season_xp(uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.add_season_xp(p_user_id uuid, p_season_id uuid, p_xp integer);

-- The (p_user_id, p_xp, p_reason) version is already canonical — just replace to ensure clean state
CREATE OR REPLACE FUNCTION public.add_season_xp(
  p_user_id uuid,
  p_xp      integer,
  p_reason  text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_xp    integer;
  v_new_level integer;
  v_xp_per_lv integer := 1000;
BEGIN
  IF p_xp <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'XP must be positive', 'code', 'INVALID_INPUT');
  END IF;

  UPDATE public.profiles
  SET
    xp         = xp + p_xp,
    level      = GREATEST(1, (xp + p_xp) / v_xp_per_lv + 1),
    updated_at = now()
  WHERE id = p_user_id
  RETURNING xp, level INTO v_new_xp, v_new_level;

  IF v_new_xp IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found', 'code', 'NOT_FOUND');
  END IF;

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object(
    'new_xp', v_new_xp, 'new_level', v_new_level, 'xp_gained', p_xp
  ));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_season_xp(uuid, integer, text) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.8 admin_verify_result
-- Frontend calls: { p_result_id, p_action }
-- Drop older (p_result_id, p_approved, p_note) version
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.admin_verify_result(uuid, boolean, text);
DROP FUNCTION IF EXISTS public.admin_verify_result(p_result_id uuid, p_approved boolean, p_note text);

-- (p_result_id, p_action) version is kept — just replace for clean state
CREATE OR REPLACE FUNCTION public.admin_verify_result(
  p_result_id uuid,
  p_action    text  -- 'approve' | 'reject' | 'dispute'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_new_status  text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('admin', 'founder', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions', 'code', 'PERMISSION_DENIED');
  END IF;

  IF p_action NOT IN ('approve', 'reject', 'dispute') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action: ' || p_action, 'code', 'INVALID_INPUT');
  END IF;

  v_new_status := CASE p_action
    WHEN 'approve'  THEN 'approved'
    WHEN 'reject'   THEN 'rejected'
    WHEN 'dispute'  THEN 'disputed'
  END;

  UPDATE public.match_results
  SET status = v_new_status, reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_result_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Result not found', 'code', 'NOT_FOUND');
  END IF;

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('status', v_new_status));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_verify_result(uuid, text) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.9 apply_report_action
-- Frontend calls: { p_report_id, p_action, p_note }
-- Drop older 3-param version, keep extended version
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.apply_report_action(uuid, text, text);

CREATE OR REPLACE FUNCTION public.apply_report_action(
  p_report_id  uuid,
  p_action     text,
  p_note       text    DEFAULT NULL,
  p_new_status text    DEFAULT NULL,
  p_assign_to  uuid    DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_status      text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('admin', 'founder', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions', 'code', 'PERMISSION_DENIED');
  END IF;

  IF p_action NOT IN ('resolve', 'dismiss', 'ban', 'warn', 'escalate', 'review', 'close') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action', 'code', 'INVALID_INPUT');
  END IF;

  v_status := COALESCE(p_new_status, CASE p_action
    WHEN 'resolve'  THEN 'resolved'
    WHEN 'dismiss'  THEN 'dismissed'
    WHEN 'close'    THEN 'closed'
    WHEN 'escalate' THEN 'escalated'
    ELSE 'under_review'
  END);

  UPDATE public.reports
  SET
    status      = v_status,
    resolved_by = auth.uid(),
    resolved_at = now(),
    admin_note  = COALESCE(p_note, admin_note),
    assigned_to = COALESCE(p_assign_to, assigned_to)
  WHERE id = p_report_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Report not found', 'code', 'NOT_FOUND');
  END IF;

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('status', v_status));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_report_action(uuid, text, text, text, uuid) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.10 approve_ai_action
-- Keep JSONB return version; drop boolean return
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.approve_ai_action(uuid, text, text);

CREATE OR REPLACE FUNCTION public.approve_ai_action(
  p_action_id uuid,
  p_note      text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions', 'code', 'PERMISSION_DENIED');
  END IF;

  UPDATE public.ai_action_queue
  SET
    status      = 'approved',
    approved_by = auth.uid(),
    approved_at = now(),
    note        = COALESCE(p_note, note)
  WHERE id = p_action_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Action not found or already processed', 'code', 'NOT_FOUND');
  END IF;

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('action_id', p_action_id));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_ai_action(uuid, text) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.11 broadcast_notification
-- Keep extended JSONB version (p_title, p_message, p_type, p_roles)
-- Drop old (p_role text, p_type, p_title, p_message, ...) version
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.broadcast_notification(text, text, text, text, jsonb, text);
DROP FUNCTION IF EXISTS public.broadcast_notification(p_role text, p_type text, p_title text, p_message text, p_data jsonb, p_action_url text);

CREATE OR REPLACE FUNCTION public.broadcast_notification(
  p_title   text,
  p_message text,
  p_type    text    DEFAULT 'info',
  p_roles   text[]  DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_count       integer := 0;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions', 'code', 'PERMISSION_DENIED');
  END IF;

  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Title is required', 'code', 'INVALID_INPUT');
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message)
  SELECT
    p.id,
    p_type,
    p_title,
    p_message
  FROM public.profiles p
  WHERE p.role NOT IN ('banned')
    AND (p_roles IS NULL OR p.role = ANY(p_roles));

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('sent_to', v_count));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.broadcast_notification(text, text, text, text[]) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.12 check_rate_limit
-- Keep action-based JSONB version; drop (user_id, endpoint, max, window_minutes)
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.check_rate_limit(uuid, text, integer, integer);
DROP FUNCTION IF EXISTS public.check_rate_limit(check_user_id uuid, check_endpoint text, max_requests integer, window_minutes integer);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_action    text,
  p_max_calls integer  DEFAULT 10,
  p_window    interval DEFAULT '1 minute'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count   integer;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Not authenticated');
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.rate_limit_logs
  WHERE user_id = v_user_id
    AND action  = p_action
    AND created_at > now() - p_window;

  IF v_count >= p_max_calls THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Rate limit exceeded', 'count', v_count, 'max', p_max_calls);
  END IF;

  INSERT INTO public.rate_limit_logs (user_id, action)
  VALUES (v_user_id, p_action)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('allowed', true, 'count', v_count + 1, 'max', p_max_calls);

EXCEPTION WHEN OTHERS THEN
  -- Fail open — never block a user due to rate-limit table error
  RETURN jsonb_build_object('allowed', true, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, interval) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.13 create_team
-- Drop ALL existing signatures before recreating (return type may differ)
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.create_team(text, text, text, text, boolean, uuid);
DROP FUNCTION IF EXISTS public.create_team(text, text, text, text, boolean, uuid, integer, text, text);

CREATE OR REPLACE FUNCTION public.create_team(
  p_name        text,
  p_tag         text,
  p_description text    DEFAULT NULL,
  p_accent_color text   DEFAULT '#4F46E5',
  p_is_open     boolean DEFAULT true,
  p_captain_id  uuid    DEFAULT NULL,
  p_max_members integer DEFAULT 6,
  p_region      text    DEFAULT 'MA',
  p_team_type   text    DEFAULT 'competitive'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_captain  uuid := COALESCE(p_captain_id, auth.uid());
  v_team_id  uuid;
BEGIN
  IF v_captain IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated', 'code', 'NOT_AUTH');
  END IF;

  IF length(trim(p_name)) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Team name too short', 'code', 'INVALID_INPUT');
  END IF;

  IF length(trim(p_tag)) < 2 OR length(trim(p_tag)) > 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tag must be 2-5 characters', 'code', 'INVALID_INPUT');
  END IF;

  INSERT INTO public.teams (
    name, tag, description, accent_color, is_open,
    captain_id, max_members, region, team_type
  ) VALUES (
    trim(p_name), upper(trim(p_tag)), p_description, p_accent_color,
    p_is_open, v_captain, p_max_members, p_region, p_team_type
  ) RETURNING id INTO v_team_id;

  -- Add captain as member
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_team_id, v_captain, 'captain')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('team_id', v_team_id));

EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', false, 'error', 'Team name or tag already taken', 'code', 'DUPLICATE');
WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_team(text, text, text, text, boolean, uuid, integer, text, text) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.14 dismiss_ai_alert
-- Keep JSONB version with reason; drop boolean version
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.dismiss_ai_alert(uuid);

CREATE OR REPLACE FUNCTION public.dismiss_ai_alert(
  p_alert_id uuid,
  p_reason   text DEFAULT 'false_positive'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions', 'code', 'PERMISSION_DENIED');
  END IF;

  UPDATE public.ai_alerts
  SET status = 'dismissed', dismissed_by = auth.uid(), dismissed_at = now(), dismiss_reason = p_reason
  WHERE id = p_alert_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Alert not found', 'code', 'NOT_FOUND');
  END IF;

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('alert_id', p_alert_id));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.dismiss_ai_alert(uuid, text) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.15 emergency_freeze
-- Keep extended version (with action, severity, ip, agent)
-- Drop simple 2-param version
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.emergency_freeze(text, interval);

CREATE OR REPLACE FUNCTION public.emergency_freeze(
  p_reason   text,
  p_action   text    DEFAULT 'emergency_freeze',
  p_severity text    DEFAULT 'critical',
  p_ip       text    DEFAULT NULL,
  p_agent    text    DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_event_id    uuid;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only super_admin can trigger emergency freeze', 'code', 'PERMISSION_DENIED');
  END IF;

  -- Insert system event
  INSERT INTO public.system_events (event_type, severity, message, actor_id, metadata)
  VALUES (p_action, p_severity, p_reason, auth.uid(),
    jsonb_build_object('ip', p_ip, 'user_agent', p_agent))
  RETURNING id INTO v_event_id;

  -- Set maintenance mode
  INSERT INTO public.system_config (key, value, updated_by)
  VALUES ('maintenance_mode', 'true', auth.uid())
  ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = now(), updated_by = auth.uid();

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('event_id', v_event_id, 'reason', p_reason));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.emergency_freeze(text, text, text, text, text) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.16 final_review_admin_application
-- Frontend calls: { p_application_id, p_decision, p_note }
-- Keep version with blacklist_days; drop old 3-param version
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.final_review_admin_application(uuid, text, text);

CREATE OR REPLACE FUNCTION public.final_review_admin_application(
  p_app_id         uuid,
  p_status         text,
  p_note           text    DEFAULT NULL,
  p_blacklist_days integer DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions', 'code', 'PERMISSION_DENIED');
  END IF;

  IF p_status NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Status must be approved or rejected', 'code', 'INVALID_INPUT');
  END IF;

  UPDATE public.admin_applications
  SET
    status       = p_status,
    final_note   = p_note,
    reviewed_by  = auth.uid(),
    reviewed_at  = now(),
    final_status = p_status
  WHERE id = p_app_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application not found', 'code', 'NOT_FOUND');
  END IF;

  -- If approved, update the user role
  IF p_status = 'approved' THEN
    UPDATE public.profiles
    SET role = 'admin', updated_at = now()
    WHERE id = (SELECT user_id FROM public.admin_applications WHERE id = p_app_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('status', p_status));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.final_review_admin_application(uuid, text, text, integer) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.17 force_resolve_dispute
-- Frontend calls: { p_tournament_id, p_result_ids } or { p_tournament_id, p_winner_id, p_reason }
-- Keep winner-based version; drop result_ids array version
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.force_resolve_dispute(uuid, uuid[]);

CREATE OR REPLACE FUNCTION public.force_resolve_dispute(
  p_tournament_id uuid,
  p_winner_id     uuid,
  p_reason        text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('admin', 'founder', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions', 'code', 'PERMISSION_DENIED');
  END IF;

  UPDATE public.match_results
  SET status = 'rejected', admin_note = 'Force resolved: ' || COALESCE(p_reason, 'Admin action'), reviewed_by = auth.uid()
  WHERE tournament_id = p_tournament_id AND status IN ('pending', 'disputed');

  IF p_winner_id IS NOT NULL THEN
    UPDATE public.match_results
    SET status = 'approved', reviewed_by = auth.uid()
    WHERE tournament_id = p_tournament_id AND user_id = p_winner_id;
  END IF;

  UPDATE public.tournaments
  SET status = 'completed', updated_at = now()
  WHERE id = p_tournament_id;

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object(
    'tournament_id', p_tournament_id, 'winner_id', p_winner_id
  ));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.force_resolve_dispute(uuid, uuid, text) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.18 leave_tournament
-- Frontend calls: { p_tournament_id }
-- Drop version with explicit p_user_id
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.leave_tournament(uuid, uuid);
DROP FUNCTION IF EXISTS public.leave_tournament(p_tournament_id uuid, p_user_id uuid);

-- Canonical leave_tournament already exists from sql/09; just replace cleanly
CREATE OR REPLACE FUNCTION public.leave_tournament(p_tournament_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_tournament record;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated', 'code', 'NOT_AUTH');
  END IF;

  SELECT * INTO v_tournament FROM public.tournaments WHERE id = p_tournament_id;

  IF v_tournament IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_tournament.status NOT IN ('open', 'registration_open') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot leave after tournament starts', 'code', 'INVALID_STATE');
  END IF;

  DELETE FROM public.tournament_players
  WHERE tournament_id = p_tournament_id AND user_id = v_user_id;

  IF FOUND THEN
    UPDATE public.tournaments
    SET current_players = GREATEST(0, current_players - 1), updated_at = now()
    WHERE id = p_tournament_id;

    IF COALESCE(v_tournament.entry_fee, 0) > 0 THEN
      UPDATE public.wallets SET balance = balance + v_tournament.entry_fee, updated_at = now()
      WHERE user_id = v_user_id;

      INSERT INTO public.wallet_transactions (user_id, amount, type, reason, reference)
      VALUES (v_user_id, v_tournament.entry_fee, 'refund', 'Tournament leave refund', p_tournament_id::text);
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_tournament(uuid) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.19 mark_notifications_read
-- Drop void return version; keep integer return version
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.mark_notifications_read(uuid);
DROP FUNCTION IF EXISTS public.mark_all_notifications_read(uuid);

CREATE OR REPLACE FUNCTION public.mark_notifications_read(
  p_notification_ids uuid[] DEFAULT NULL
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_notification_ids IS NULL THEN
    UPDATE public.notifications
    SET is_read = true, read_at = now()
    WHERE user_id = auth.uid() AND is_read = false;
  ELSE
    UPDATE public.notifications
    SET is_read = true, read_at = now()
    WHERE user_id = auth.uid()
      AND id = ANY(p_notification_ids)
      AND is_read = false;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;

EXCEPTION WHEN OTHERS THEN
  RETURN 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.20 resolve_emergency
-- Keep version with notes
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.resolve_emergency(uuid);

CREATE OR REPLACE FUNCTION public.resolve_emergency(
  p_action_id uuid,
  p_notes     text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only super_admin can resolve emergencies', 'code', 'PERMISSION_DENIED');
  END IF;

  UPDATE public.system_events
  SET status = 'resolved', resolved_by = auth.uid(), resolved_at = now(), resolution_notes = p_notes
  WHERE id = p_action_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event not found', 'code', 'NOT_FOUND');
  END IF;

  -- Lift maintenance mode if no other active emergencies
  IF NOT EXISTS (
    SELECT 1 FROM public.system_events
    WHERE severity = 'critical' AND status NOT IN ('resolved', 'dismissed')
    AND id <> p_action_id
  ) THEN
    UPDATE public.system_config
    SET value = 'false', updated_at = now()
    WHERE key = 'maintenance_mode';
  END IF;

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('action_id', p_action_id));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_emergency(uuid, text) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.21 schedule_maintenance
-- Drop simple 4-param version
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.schedule_maintenance(text, timestamptz, timestamptz, text);

CREATE OR REPLACE FUNCTION public.schedule_maintenance(
  p_title    text,
  p_description text    DEFAULT NULL,
  p_mode     text    DEFAULT 'full',
  p_start    timestamptz DEFAULT NULL,
  p_end      timestamptz DEFAULT NULL,
  p_systems  text[]  DEFAULT '{}',
  p_notify   boolean DEFAULT true,
  p_message  text    DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_sched_id    uuid;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only super_admin can schedule maintenance', 'code', 'PERMISSION_DENIED');
  END IF;

  INSERT INTO public.maintenance_schedules (
    title, description, mode, start_at, end_at, affected_systems, notify_users, message, created_by
  ) VALUES (
    p_title, p_description, p_mode, p_start, p_end, p_systems, p_notify,
    COALESCE(p_message, p_title), auth.uid()
  ) RETURNING id INTO v_sched_id;

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('schedule_id', v_sched_id));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.schedule_maintenance(text, text, text, timestamptz, timestamptz, text[], boolean, text) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.22 send_gift
-- Frontend calls: { p_receiver_id, p_amount, p_message }
-- Keep extended version; both actually have same param structure for basic use
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.send_gift(uuid, integer, text);

CREATE OR REPLACE FUNCTION public.send_gift(
  p_receiver_id uuid,
  p_item_id     uuid    DEFAULT NULL,
  p_amount      integer DEFAULT 0,
  p_message     text    DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id  uuid := auth.uid();
  v_sender_bal integer;
  v_gift_id    uuid;
BEGIN
  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated', 'code', 'NOT_AUTH');
  END IF;

  IF v_sender_id = p_receiver_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot send gift to yourself', 'code', 'INVALID_INPUT');
  END IF;

  IF p_amount > 0 THEN
    SELECT balance INTO v_sender_bal FROM public.wallets WHERE user_id = v_sender_id;

    IF COALESCE(v_sender_bal, 0) < p_amount THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance', 'code', 'INSUFFICIENT_BALANCE');
    END IF;

    UPDATE public.wallets SET balance = balance - p_amount, updated_at = now()
    WHERE user_id = v_sender_id;

    INSERT INTO public.wallet_transactions (user_id, amount, type, reason)
    VALUES (v_sender_id, p_amount, 'gift_sent', 'Gift to user');
  END IF;

  INSERT INTO public.gifts (sender_id, receiver_id, item_id, coins_amount, message, status)
  VALUES (v_sender_id, p_receiver_id, p_item_id, p_amount, p_message, 'pending')
  RETURNING id INTO v_gift_id;

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    p_receiver_id, 'gift_received', 'You received a gift!',
    format('You have a new gift from %s', (SELECT username FROM public.profiles WHERE id = v_sender_id)),
    jsonb_build_object('gift_id', v_gift_id, 'amount', p_amount)
  ) ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('gift_id', v_gift_id));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_gift(uuid, uuid, integer, text) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.23 setup_room
-- Frontend calls: { p_tournament_id, p_room_code, p_room_password, ... }
-- Drop simple 1-param version
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.setup_room(uuid);

-- Extended version already exists; just replace cleanly
CREATE OR REPLACE FUNCTION public.setup_room(
  p_tournament_id   uuid,
  p_room_code       text    DEFAULT NULL,
  p_room_password   text    DEFAULT NULL,
  p_start_time      timestamptz DEFAULT NULL,
  p_match_duration  integer DEFAULT 10,
  p_result_window   integer DEFAULT 30
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_code        text := COALESCE(p_room_code, upper(substring(md5(random()::text), 1, 8)));
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('admin', 'founder', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions', 'code', 'PERMISSION_DENIED');
  END IF;

  UPDATE public.tournaments
  SET
    room_code       = v_code,
    room_password   = p_room_password,
    match_start_time = COALESCE(p_start_time, now() + interval '5 minutes'),
    match_duration  = p_match_duration,
    result_window   = p_result_window,
    status          = CASE WHEN status IN ('open', 'registration_closed', 'full') THEN 'ready' ELSE status END,
    updated_at      = now()
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found', 'code', 'NOT_FOUND');
  END IF;

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object(
    'room_code', v_code, 'tournament_id', p_tournament_id
  ));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.setup_room(uuid, text, text, timestamptz, integer, integer) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.24 submit_ai_action
-- Keep extended uuid-return version
-- Drop simple 5-param version
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.submit_ai_action(text, text, uuid, text, jsonb);

-- Extended version already exists; just ensure correct state
CREATE OR REPLACE FUNCTION public.submit_ai_action(
  p_action_type  text,
  p_title        text,
  p_description  text,
  p_rationale    text,
  p_priority     text    DEFAULT 'normal',
  p_risk_level   text    DEFAULT 'low',
  p_target_entity uuid   DEFAULT NULL,
  p_target_type  text    DEFAULT NULL,
  p_payload      jsonb   DEFAULT '{}',
  p_is_reversible boolean DEFAULT true,
  p_rollback_plan text   DEFAULT NULL,
  p_alert_id     uuid    DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action_id uuid;
BEGIN
  INSERT INTO public.ai_action_queue (
    action_type, title, description, rationale, priority, risk_level,
    target_entity_id, target_type, payload, is_reversible, rollback_plan, alert_id,
    status, created_at
  ) VALUES (
    p_action_type, p_title, p_description, p_rationale, p_priority, p_risk_level,
    p_target_entity, p_target_type, p_payload, p_is_reversible, p_rollback_plan, p_alert_id,
    'pending', now()
  ) RETURNING id INTO v_action_id;

  RETURN v_action_id;

EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_ai_action(text, text, text, text, text, text, uuid, text, jsonb, boolean, text, uuid) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.25 submit_bug_report
-- Frontend calls with extended params; drop simple 5-param version
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.submit_bug_report(text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.submit_bug_report(
  p_title          text,
  p_description    text,
  p_category       text    DEFAULT 'general',
  p_severity       text    DEFAULT 'medium',
  p_steps          text    DEFAULT NULL,
  p_screenshot_url text    DEFAULT NULL,
  p_affected_page  text    DEFAULT NULL,
  p_device_info    text    DEFAULT NULL,
  p_browser_info   text    DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_bug_id  uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated', 'code', 'NOT_AUTH');
  END IF;

  IF length(trim(p_title)) < 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Title too short (min 5 chars)', 'code', 'INVALID_INPUT');
  END IF;

  INSERT INTO public.bug_reports (
    user_id, title, description, category, severity,
    steps_to_reproduce, screenshot_url, affected_page, device_info, browser_info
  ) VALUES (
    v_user_id, trim(p_title), p_description, p_category, p_severity,
    p_steps, p_screenshot_url, p_affected_page, p_device_info, p_browser_info
  ) RETURNING id INTO v_bug_id;

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('bug_id', v_bug_id));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_bug_report(text, text, text, text, text, text, text, text, text) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.26 submit_match_result
-- THREE versions exist — drop all; create ONE canonical
-- Frontend (SubmitResultPanel) calls: { p_tournament_id, p_rank, p_kills, p_screenshot_url }
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.submit_match_result(uuid, uuid, text, text, text);
DROP FUNCTION IF EXISTS public.submit_match_result(uuid, integer, uuid, integer, integer, text);

CREATE OR REPLACE FUNCTION public.submit_match_result(
  p_tournament_id  uuid,
  p_rank           integer DEFAULT NULL,
  p_kills          integer DEFAULT 0,
  p_screenshot_url text    DEFAULT NULL,
  p_match_number   integer DEFAULT NULL,
  p_team_id        uuid    DEFAULT NULL,
  p_placement      integer DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_tournament record;
  v_final_rank integer;
  v_result_id  uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated', 'code', 'NOT_AUTH');
  END IF;

  SELECT * INTO v_tournament FROM public.tournaments WHERE id = p_tournament_id;

  IF v_tournament IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_tournament.status NOT IN ('live', 'results_pending', 'active', 'in_progress') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Results cannot be submitted at this time', 'code', 'INVALID_STATE');
  END IF;

  -- Check player is registered
  IF NOT EXISTS (
    SELECT 1 FROM public.tournament_players
    WHERE tournament_id = p_tournament_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not registered for this tournament', 'code', 'NOT_REGISTERED');
  END IF;

  -- Check duplicate submission
  IF EXISTS (
    SELECT 1 FROM public.match_results
    WHERE tournament_id = p_tournament_id AND user_id = v_user_id AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Result already submitted', 'code', 'DUPLICATE');
  END IF;

  v_final_rank := COALESCE(p_rank, p_placement, 0);

  INSERT INTO public.match_results (
    tournament_id, user_id, rank, kills, screenshot_url, match_number, team_id, status
  ) VALUES (
    p_tournament_id, v_user_id, v_final_rank, COALESCE(p_kills, 0),
    p_screenshot_url, p_match_number, p_team_id, 'pending'
  ) RETURNING id INTO v_result_id;

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('result_id', v_result_id));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_match_result(uuid, integer, integer, text, integer, uuid, integer) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.27 update_system_setting
-- Keep extended version with reason/ip/agent
-- Drop simple 3-param version
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.update_system_setting(text, text, text);

CREATE OR REPLACE FUNCTION public.update_system_setting(
  p_key         text,
  p_value       text,
  p_reason      text DEFAULT NULL,
  p_ip          text DEFAULT NULL,
  p_agent       text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions', 'code', 'PERMISSION_DENIED');
  END IF;

  INSERT INTO public.system_config (key, value, updated_by, reason)
  VALUES (p_key, p_value, auth.uid(), p_reason)
  ON CONFLICT (key) DO UPDATE
  SET value = p_value, updated_at = now(), updated_by = auth.uid(), reason = COALESCE(p_reason, system_config.reason);

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('key', p_key, 'value', p_value));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_system_setting(text, text, text, text, text) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.28 vote_feature
-- Frontend calls: { p_request_id, p_vote }
-- Drop version with just p_feature_id (no vote)
-- ────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.vote_feature(uuid);

CREATE OR REPLACE FUNCTION public.vote_feature(
  p_request_id uuid,
  p_vote       integer DEFAULT 1  -- 1 = upvote, -1 = downvote
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_votes   integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated', 'code', 'NOT_AUTH');
  END IF;

  IF p_vote NOT IN (1, -1) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vote must be 1 or -1', 'code', 'INVALID_INPUT');
  END IF;

  -- Upsert vote
  INSERT INTO public.feature_votes (feature_id, user_id, vote)
  VALUES (p_request_id, v_user_id, p_vote)
  ON CONFLICT (feature_id, user_id) DO UPDATE SET vote = p_vote, updated_at = now();

  -- Update total votes on the feature request
  SELECT SUM(vote) INTO v_votes FROM public.feature_votes WHERE feature_id = p_request_id;

  UPDATE public.feature_requests SET vote_count = COALESCE(v_votes, 0), updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('votes', v_votes));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.vote_feature(uuid, integer) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.29 delete_tournament_complete
-- Fix to include founder role (remove fondateur)
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_tournament_complete(tournament_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('admin', 'super_admin', 'founder') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions', 'code', 'PERMISSION_DENIED');
  END IF;

  DELETE FROM public.tournaments WHERE id = tournament_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found', 'code', 'NOT_FOUND');
  END IF;

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('tournament_id', tournament_id));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_tournament_complete(uuid) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3.30 Fix RLS policies that reference 'fondateur'
-- ────────────────────────────────────────────────────────────────────────

-- Fix season_audit_log policy
DROP POLICY IF EXISTS "audit_read_admin" ON public.season_audit_log;
CREATE POLICY "audit_read_admin" ON public.season_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Fix any policies using fondateur (generic pattern — add as needed)
-- The main policy used everywhere is the profiles role check


-- ─────────────────────────────────────────────────────────────────────────────
-- PART 4 — FIX MISSING/BROKEN FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- 4.1 get_site_settings_public (called by useSiteSettings hook)
CREATE OR REPLACE FUNCTION public.get_site_settings_public()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb := '{}';
  v_row    record;
BEGIN
  FOR v_row IN
    SELECT key, value FROM public.site_settings WHERE is_public = true
  LOOP
    v_result := v_result || jsonb_build_object(v_row.key, v_row.value);
  END LOOP;

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  -- Return empty object on error — frontend has defaults
  RETURN '{}';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_site_settings_public() TO anon, authenticated;


-- 4.2 toggle_feature_flag (called by CMSTab and CommandCenter)
CREATE OR REPLACE FUNCTION public.toggle_feature_flag(
  p_key       text,
  p_enabled   boolean DEFAULT NULL  -- NULL = toggle current state
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_new_state   boolean;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions', 'code', 'PERMISSION_DENIED');
  END IF;

  IF p_enabled IS NOT NULL THEN
    v_new_state := p_enabled;
    UPDATE public.feature_flags SET is_enabled = v_new_state, updated_at = now()
    WHERE key = p_key;
  ELSE
    UPDATE public.feature_flags SET is_enabled = NOT is_enabled, updated_at = now()
    WHERE key = p_key
    RETURNING is_enabled INTO v_new_state;
  END IF;

  IF v_new_state IS NULL THEN
    -- Key doesn't exist — create it
    INSERT INTO public.feature_flags (key, is_enabled, description)
    VALUES (p_key, COALESCE(p_enabled, true), 'Created by admin')
    ON CONFLICT (key) DO NOTHING;
    v_new_state := COALESCE(p_enabled, true);
  END IF;

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('key', p_key, 'enabled', v_new_state));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_feature_flag(text, boolean) TO authenticated;


-- 4.3 update_site_setting (called by CMSTab — note: different from update_system_setting)
CREATE OR REPLACE FUNCTION public.update_site_setting(
  p_key   text,
  p_value jsonb,
  p_label text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions', 'code', 'PERMISSION_DENIED');
  END IF;

  INSERT INTO public.site_settings (key, value, label, updated_by)
  VALUES (p_key, p_value, COALESCE(p_label, p_key), auth.uid())
  ON CONFLICT (key) DO UPDATE
  SET value = p_value, updated_at = now(), updated_by = auth.uid();

  RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('key', p_key));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_site_setting(text, jsonb, text) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- PART 5 — VERIFY DEDUPLICATION
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  dup_count integer;
  dup_names text;
BEGIN
  SELECT COUNT(*), string_agg(proname, ', ')
  INTO dup_count, dup_names
  FROM (
    SELECT proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
    GROUP BY proname
    HAVING COUNT(*) > 1
    -- Exclude legitimate overloads
    AND proname NOT IN (
      'is_role', 'is_super_admin',        -- legitimate overloads (different param types)
      'check_achievements',               -- trigger vs manual call
      'advance_tournament_status'         -- may have overloads
    )
  ) t;

  IF dup_count > 0 THEN
    RAISE WARNING 'Still-duplicate RPCs (may need manual review): %', dup_names;
  ELSE
    RAISE NOTICE 'OK: No unexpected duplicate RPCs found.';
  END IF;
END;
$$;

DO $$ BEGIN RAISE NOTICE 'Migration 45_rpc_deduplication complete.'; END $$;
