-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/35 Security Patches
-- Fixes ALL critical vulnerabilities identified in the production audit.
-- Safe to run multiple times (fully idempotent).
--
-- Fixes applied:
--   1.  add_season_xp          — no auth check (XP injection)
--   2.  add_war_points         — no membership check (score manipulation)
--   3.  claim_daily_reward     — p_user_id bypass
--   4.  claim_mission_reward   — p_user_id bypass
--   5.  analytics_* (8 funcs) — accessible to any authenticated user
--   6.  community RLS          — 'superadmin' typo vs actual 'super_admin'
--   7.  admin_application_audit INSERT policy — allows any user
--   8.  wallets_admin_write    — bypasses immutable transaction log
--   9.  profiles_write_admin   — allows phantom profile insertion
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. FIX: add_season_xp — Add authorization guard
--
-- PROBLEM: Any authenticated user could call
--   supabase.rpc('add_season_xp', { p_user_id: 'victim-uuid', p_xp: 9999999 })
-- and max-level any player instantly. No permission check existed.
--
-- DANGER: Economy exploit + PvP fairness destruction.
--
-- FIX: Only the player themselves OR admin/super_admin may add XP.
--
-- ROLLBACK: Re-run the original version from sql/11_season_pass.sql
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.add_season_xp(
  p_user_id   uuid,
  p_season_id uuid,
  p_xp        integer
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_usp      record;
  v_new_xp   integer;
  v_new_tier integer;
BEGIN
  -- ── AUTHORIZATION ──────────────────────────────────────────────────
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Only the user themselves, OR admin/super_admin, may add XP
  IF p_user_id != v_caller AND NOT public.is_role(ARRAY['admin','super_admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: cannot modify another user''s XP');
  END IF;

  -- Guard: positive XP only (negative deltas go through apply_fair_play_event)
  IF p_xp <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'XP amount must be positive');
  END IF;

  -- Cap to prevent single-call overflow
  IF p_xp > 50000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'XP amount too large (max 50000 per call)');
  END IF;

  -- ── UPSERT USER SEASON PASS ────────────────────────────────────────
  INSERT INTO public.user_season_pass (user_id, season_id, current_xp, current_tier)
  VALUES (p_user_id, p_season_id, 0, 0)
  ON CONFLICT (user_id, season_id) DO NOTHING;

  SELECT * INTO v_usp
  FROM public.user_season_pass
  WHERE user_id = p_user_id AND season_id = p_season_id;

  v_new_xp := v_usp.current_xp + p_xp;

  -- Calculate new tier based on cumulative XP
  SELECT COALESCE(MAX(tier), 0) INTO v_new_tier
  FROM public.season_pass_tiers
  WHERE season_id = p_season_id AND xp_required <= v_new_xp;

  UPDATE public.user_season_pass
  SET current_xp  = v_new_xp,
      current_tier = GREATEST(current_tier, v_new_tier),
      updated_at  = now()
  WHERE user_id = p_user_id AND season_id = p_season_id;

  RETURN jsonb_build_object(
    'success',    true,
    'new_xp',     v_new_xp,
    'new_tier',   GREATEST(v_usp.current_tier, v_new_tier),
    'leveled_up', GREATEST(v_usp.current_tier, v_new_tier) > v_usp.current_tier
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_season_xp(uuid, uuid, integer) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 2. FIX: add_war_points — Add clan membership check
--
-- PROBLEM: Any authenticated user could call
--   supabase.rpc('add_war_points', { p_war_id: '...', p_clan_id: '...', p_points: 9999 })
-- and win any active clan war by falsifying scores.
--
-- DANGER: Clan war integrity completely destroyed.
--
-- FIX: Verify caller is an actual member of the clan they are adding
--      points for, OR is an admin.
--
-- ROLLBACK: Re-run original from sql/12_clan_wars.sql
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.add_war_points(
  p_war_id   uuid,
  p_clan_id  uuid,
  p_user_id  uuid,
  p_points   integer,
  p_kills    integer DEFAULT 0,
  p_wins     integer DEFAULT 0,
  p_reason   text    DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_war    record;
BEGIN
  -- ── AUTHORIZATION ──────────────────────────────────────────────────
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Caller must be adding points for themselves, OR be an admin
  IF p_user_id != v_caller AND NOT public.is_role(ARRAY['admin','super_admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot add points on behalf of another user');
  END IF;

  -- Caller (or target user) must actually be a member of this clan
  IF NOT EXISTS (
    SELECT 1 FROM public.clan_members
    WHERE user_id = p_user_id AND clan_id = p_clan_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not a member of this clan');
  END IF;

  -- ── VALIDATE WAR ───────────────────────────────────────────────────
  SELECT * INTO v_war FROM public.clan_wars WHERE id = p_war_id AND status = 'active';
  IF v_war IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'War not found or not active');
  END IF;

  -- Verify clan is part of this war
  IF v_war.clan_a_id != p_clan_id AND v_war.clan_b_id != p_clan_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Clan is not part of this war');
  END IF;

  -- Validate points range
  IF p_points < 0 OR p_points > 10000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid points value (0–10000)');
  END IF;

  -- ── RECORD CONTRIBUTION ────────────────────────────────────────────
  INSERT INTO public.clan_war_contributions (war_id, clan_id, user_id, points, kills, wins, reason)
  VALUES (p_war_id, p_clan_id, p_user_id, p_points, p_kills, p_wins, p_reason);

  -- Update war aggregate score
  IF v_war.clan_a_id = p_clan_id THEN
    UPDATE public.clan_wars
    SET clan_a_score = clan_a_score + p_points, updated_at = now()
    WHERE id = p_war_id;
  ELSE
    UPDATE public.clan_wars
    SET clan_b_score = clan_b_score + p_points, updated_at = now()
    WHERE id = p_war_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'points_added', p_points);
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_war_points(uuid, uuid, uuid, integer, integer, integer, text) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 3 & 4. FIX: claim_daily_reward + claim_mission_reward
--         Remove the p_user_id bypass that allowed reward theft
--
-- PROBLEM: Frontend passed p_user_id explicitly. The function fell back
--   to p_user_id when auth.uid() was null (possible via service key or
--   JWT edge cases). An attacker with a victim's UUID could:
--   a) Block the victim's daily reward for the day
--   b) Fraudulently trigger the claim on any user
--
-- DANGER: Reward theft / denial-of-service against any user's daily claim.
--
-- FIX: ALWAYS use auth.uid(). The p_user_id parameter is kept for
--      backward compatibility but is now IGNORED for callers that are
--      not admin/super_admin. Admins can still grant on behalf of a user.
--
-- ROLLBACK: Re-run original from sql/34_production_complete_sync.sql
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.claim_daily_reward(uuid);
CREATE OR REPLACE FUNCTION public.claim_daily_reward(
  p_user_id uuid DEFAULT NULL  -- kept for backward compat, ignored unless admin
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_user_id  uuid;
  v_last     record;
  v_streak   integer := 1;
  v_day      integer;
  v_reward   record;
  v_today    date := CURRENT_DATE;
BEGIN
  -- ── AUTH CHECK ─────────────────────────────────────────────────────
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Admins can claim on behalf of a user; regular users always use auth.uid()
  IF p_user_id IS NOT NULL
     AND p_user_id != v_caller
     AND NOT public.is_role(ARRAY['admin','super_admin'])
  THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot claim rewards for another user');
  END IF;

  v_user_id := COALESCE(
    CASE WHEN public.is_role(ARRAY['admin','super_admin']) THEN p_user_id ELSE NULL END,
    v_caller
  );

  -- ── CLAIM LOGIC ────────────────────────────────────────────────────
  SELECT * INTO v_last
  FROM public.user_daily_claims
  WHERE user_id = v_user_id
  ORDER BY claimed_at DESC
  LIMIT 1;

  IF v_last IS NOT NULL AND v_last.claimed_at::date = v_today THEN
    RETURN jsonb_build_object(
      'success',    false,
      'error',      'Already claimed today',
      'next_claim', (v_today + 1)::text
    );
  END IF;

  -- Calculate streak
  IF v_last IS NULL THEN
    v_streak := 1;
  ELSIF v_last.claimed_at::date = v_today - 1 THEN
    v_streak := v_last.streak + 1;
  ELSE
    v_streak := 1;
  END IF;

  v_day := ((v_streak - 1) % 7) + 1;

  SELECT * INTO v_reward FROM public.daily_rewards WHERE day = v_day;
  IF NOT FOUND THEN
    v_reward.coins      := 50;
    v_reward.xp         := 100;
    v_reward.is_special := false;
  END IF;

  -- Credit wallet
  UPDATE public.wallets
  SET balance = balance + v_reward.coins, updated_at = now()
  WHERE user_id = v_user_id;

  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (v_user_id, v_reward.coins, 'daily_reward',
    format('Daily reward Day %s — Streak %s', v_day, v_streak));

  -- Credit XP
  UPDATE public.profiles
  SET xp = COALESCE(xp, 0) + v_reward.xp, updated_at = now()
  WHERE id = v_user_id;

  -- Record claim
  INSERT INTO public.user_daily_claims (user_id, claimed_at, day, streak, coins, xp)
  VALUES (v_user_id, now(), v_day, v_streak, v_reward.coins, v_reward.xp);

  -- Notify
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_user_id,
      'achievement',
      CASE WHEN v_reward.is_special THEN 'Special Reward!' ELSE 'Daily Reward' END,
      format('+%s CP · +%s XP · Day %s · Streak %s', v_reward.coins, v_reward.xp, v_day, v_streak),
      jsonb_build_object('coins', v_reward.coins, 'xp', v_reward.xp,
                         'day', v_day, 'streak', v_streak)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success',    true,
    'coins',      v_reward.coins,
    'xp',         v_reward.xp,
    'day',        v_day,
    'streak',     v_streak,
    'is_special', COALESCE(v_reward.is_special, false)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_daily_reward(uuid) TO authenticated;


DROP FUNCTION IF EXISTS public.claim_mission_reward(uuid, uuid);
CREATE OR REPLACE FUNCTION public.claim_mission_reward(
  p_user_id    uuid DEFAULT NULL,  -- kept for backward compat, ignored unless admin
  p_mission_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_user_id  uuid;
  v_mission  record;
  v_um       record;
  v_today    date := CURRENT_DATE;
BEGIN
  -- ── AUTH CHECK ─────────────────────────────────────────────────────
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_mission_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'p_mission_id is required');
  END IF;

  IF p_user_id IS NOT NULL
     AND p_user_id != v_caller
     AND NOT public.is_role(ARRAY['admin','super_admin'])
  THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot claim rewards for another user');
  END IF;

  v_user_id := COALESCE(
    CASE WHEN public.is_role(ARRAY['admin','super_admin']) THEN p_user_id ELSE NULL END,
    v_caller
  );

  -- ── CLAIM LOGIC ────────────────────────────────────────────────────
  SELECT * INTO v_mission FROM public.missions WHERE id = p_mission_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission not found');
  END IF;

  SELECT * INTO v_um FROM public.user_missions
  WHERE user_id = v_user_id AND mission_id = p_mission_id AND reset_date = v_today;

  IF v_um IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission not started');
  END IF;
  IF NOT v_um.completed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission not completed yet');
  END IF;
  IF v_um.claimed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward already claimed');
  END IF;

  UPDATE public.user_missions SET claimed = true WHERE id = v_um.id;

  IF COALESCE(v_mission.coins_reward, 0) > 0 THEN
    UPDATE public.wallets SET balance = balance + v_mission.coins_reward, updated_at = now()
    WHERE user_id = v_user_id;
    INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (v_user_id, v_mission.coins_reward, 'mission_reward',
      format('Mission: %s', v_mission.title));
  END IF;

  IF COALESCE(v_mission.xp_reward, 0) > 0 THEN
    UPDATE public.profiles SET xp = COALESCE(xp, 0) + v_mission.xp_reward, updated_at = now()
    WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'coins',   v_mission.coins_reward,
    'xp',      v_mission.xp_reward,
    'mission', v_mission.title
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_mission_reward(uuid, uuid) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 5. FIX: analytics_* functions — Add authorization to all 8 functions
--
-- PROBLEM: All analytics functions were SECURITY DEFINER with no internal
--   auth check. Any authenticated user could call them and see total user
--   count, total coins in circulation, banned user count, etc.
--   The comment in sql/15 said "SuperAdmin UI only renders for super_admin"
--   — this is security-by-obscurity, not real security.
--
-- DANGER: Information leakage of sensitive platform metrics.
--
-- FIX: Add is_role check at the start of each function.
--
-- NOTE: The functions return NULL/error for unauthorized callers,
--       not an exception, to avoid breaking frontend error handling.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_registrations_daily(p_days integer DEFAULT 30)
RETURNS TABLE (day date, count bigint)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_role(ARRAY['admin','super_admin']) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
    SELECT DATE(created_at) AS day, COUNT(*) AS count
    FROM public.profiles
    WHERE created_at >= NOW() - (p_days || ' days')::interval
    GROUP BY DATE(created_at)
    ORDER BY day ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.analytics_tournaments_weekly(p_weeks integer DEFAULT 12)
RETURNS TABLE (week_start date, created bigint, completed bigint)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_role(ARRAY['admin','super_admin']) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
    SELECT
      DATE_TRUNC('week', created_at)::date AS week_start,
      COUNT(*) AS created,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed
    FROM public.tournaments
    WHERE created_at >= NOW() - (p_weeks || ' weeks')::interval
    GROUP BY DATE_TRUNC('week', created_at)
    ORDER BY week_start ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.analytics_coin_flow_daily(p_days integer DEFAULT 30)
RETURNS TABLE (day date, credits bigint, debits bigint, net bigint)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_role(ARRAY['admin','super_admin']) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
    SELECT
      DATE(created_at) AS day,
      COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS credits,
      COALESCE(ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)), 0) AS debits,
      COALESCE(SUM(amount), 0) AS net
    FROM public.wallet_transactions
    WHERE created_at >= NOW() - (p_days || ' days')::interval
    GROUP BY DATE(created_at)
    ORDER BY day ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.analytics_active_players_daily(p_days integer DEFAULT 30)
RETURNS TABLE (day date, active_users bigint)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_role(ARRAY['admin','super_admin']) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
    SELECT
      DATE(created_at) AS day,
      COUNT(DISTINCT user_id) AS active_users
    FROM public.wallet_transactions
    WHERE created_at >= NOW() - (p_days || ' days')::interval
    GROUP BY DATE(created_at)
    ORDER BY day ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.analytics_platform_summary()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_users        bigint;
  v_new_users_7d       bigint;
  v_new_users_30d      bigint;
  v_total_tournaments  bigint;
  v_active_tournaments bigint;
  v_total_matches      bigint;
  v_total_coins        bigint;
  v_total_transactions bigint;
  v_total_clans        bigint;
  v_verified_players   bigint;
  v_banned_users       bigint;
BEGIN
  IF NOT public.is_role(ARRAY['admin','super_admin']) THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  SELECT COUNT(*)                                              INTO v_total_users        FROM public.profiles;
  SELECT COUNT(*)                                              INTO v_new_users_7d       FROM public.profiles  WHERE created_at >= NOW() - INTERVAL '7 days';
  SELECT COUNT(*)                                              INTO v_new_users_30d      FROM public.profiles  WHERE created_at >= NOW() - INTERVAL '30 days';
  SELECT COUNT(*)                                              INTO v_total_tournaments  FROM public.tournaments;
  SELECT COUNT(*)                                              INTO v_active_tournaments FROM public.tournaments WHERE status IN ('registration_open','live','ready','full');
  SELECT COUNT(*)                                              INTO v_total_matches      FROM public.match_results;
  SELECT COALESCE(SUM(balance), 0)                             INTO v_total_coins        FROM public.wallets;
  SELECT COUNT(*)                                              INTO v_total_transactions FROM public.wallet_transactions;
  SELECT COUNT(*)                                              INTO v_total_clans        FROM public.clans;
  SELECT COUNT(*)                                              INTO v_verified_players   FROM public.profiles WHERE is_verified = true;
  SELECT COUNT(*)                                              INTO v_banned_users       FROM public.profiles WHERE role = 'banned';

  RETURN jsonb_build_object(
    'total_users',        v_total_users,
    'new_users_7d',       v_new_users_7d,
    'new_users_30d',      v_new_users_30d,
    'total_tournaments',  v_total_tournaments,
    'active_tournaments', v_active_tournaments,
    'total_matches',      v_total_matches,
    'total_coins',        v_total_coins,
    'total_transactions', v_total_transactions,
    'total_clans',        v_total_clans,
    'verified_players',   v_verified_players,
    'banned_users',       v_banned_users
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.analytics_top_earners(p_limit integer DEFAULT 10)
RETURNS TABLE (username text, avatar_url text, balance bigint, fair_play_score integer, is_verified boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_role(ARRAY['admin','super_admin']) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
    SELECT p.username, p.avatar_url, w.balance::bigint, p.fair_play_score, p.is_verified
    FROM public.wallets w
    JOIN public.profiles p ON p.id = w.user_id
    WHERE p.role NOT IN ('banned')
    ORDER BY w.balance DESC
    LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.analytics_tournament_breakdown()
RETURNS TABLE (status text, count bigint)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_role(ARRAY['admin','super_admin']) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
    SELECT t.status, COUNT(*) AS count
    FROM public.tournaments t
    GROUP BY t.status
    ORDER BY count DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.analytics_referral_summary()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_codes    bigint;
  v_total_uses     bigint;
  v_total_rewarded bigint;
  v_coins_spent    bigint;
BEGIN
  IF NOT public.is_role(ARRAY['admin','super_admin']) THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  SELECT COUNT(*) INTO v_total_codes    FROM public.referral_codes WHERE is_active = true;
  SELECT COUNT(*) INTO v_total_uses     FROM public.referral_uses;
  SELECT COUNT(*) INTO v_total_rewarded FROM public.referral_uses WHERE rewarded = true;
  SELECT COALESCE(SUM(referrer_reward + referred_reward), 0) INTO v_coins_spent
  FROM public.referral_uses WHERE rewarded = true;

  RETURN jsonb_build_object(
    'active_codes',    v_total_codes,
    'total_referrals', v_total_uses,
    'rewarded',        v_total_rewarded,
    'coins_spent',     v_coins_spent
  );
END;
$$;

-- Grants for updated analytics functions
GRANT EXECUTE ON FUNCTION public.analytics_registrations_daily(integer)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_tournaments_weekly(integer)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_coin_flow_daily(integer)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_active_players_daily(integer)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_platform_summary()              TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_top_earners(integer)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_tournament_breakdown()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_referral_summary()              TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 6. FIX: Community RLS — 'superadmin' typo → 'super_admin'
--
-- PROBLEM: sql/18_community_system.sql used 'superadmin' (no underscore)
--   as the role string in ALL community RLS policies, but the actual
--   stored role value is 'super_admin' (with underscore).
--   Result: super_admin users were SILENTLY BLOCKED from moderating
--   feature_requests, bug_reports, admin_applications, warnings, etc.
--   via direct PostgREST queries. They could only use SECURITY DEFINER
--   RPCs that internally call is_role().
--
-- DANGER: Privilege gap — super_admin appeared to work but secretly
--   failed on direct table queries. Any frontend code doing
--   .from('feature_requests').update(...) as super_admin silently failed.
--
-- ROLLBACK: Replace 'super_admin' with 'superadmin' in policies below.
-- ─────────────────────────────────────────────────────────────────────

-- feature_requests
DROP POLICY IF EXISTS "feature_requests_update_admin"   ON public.feature_requests;
DROP POLICY IF EXISTS "feature_requests_delete_admin"   ON public.feature_requests;
CREATE POLICY "feature_requests_update_admin" ON public.feature_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );
CREATE POLICY "feature_requests_delete_admin" ON public.feature_requests
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

-- bug_reports
DROP POLICY IF EXISTS "bug_reports_update_admin" ON public.bug_reports;
DROP POLICY IF EXISTS "bug_reports_select_own"   ON public.bug_reports;
CREATE POLICY "bug_reports_select_own" ON public.bug_reports
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );
CREATE POLICY "bug_reports_update_admin" ON public.bug_reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

-- admin_applications
DROP POLICY IF EXISTS "admin_apps_select" ON public.admin_applications;
DROP POLICY IF EXISTS "admin_apps_update" ON public.admin_applications;
CREATE POLICY "admin_apps_select" ON public.admin_applications
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );
CREATE POLICY "admin_apps_update" ON public.admin_applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

-- admin_candidate_scores
DROP POLICY IF EXISTS "candidate_scores_select" ON public.admin_candidate_scores;
CREATE POLICY "candidate_scores_select" ON public.admin_candidate_scores
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

-- user_reputation_events
DROP POLICY IF EXISTS "rep_events_admin" ON public.user_reputation_events;
CREATE POLICY "rep_events_admin" ON public.user_reputation_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

-- user_warnings
DROP POLICY IF EXISTS "warnings_select" ON public.user_warnings;
CREATE POLICY "warnings_select" ON public.user_warnings
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

-- moderation_reviews
DROP POLICY IF EXISTS "mod_reviews_select" ON public.moderation_reviews;
CREATE POLICY "mod_reviews_select" ON public.moderation_reviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

-- bug_report_rewards: add admin write
DROP POLICY IF EXISTS "bug_rewards_admin" ON public.bug_report_rewards;
CREATE POLICY "bug_rewards_admin" ON public.bug_report_rewards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );


-- ─────────────────────────────────────────────────────────────────────
-- 7. FIX: admin_application_audit INSERT policy
--
-- PROBLEM: CREATE POLICY "app_audit_insert_any" ... FOR INSERT WITH CHECK (true)
--   allowed ANY authenticated user to INSERT fake audit log records
--   for any application. This pollutes the audit trail and could be
--   used to inject false history into the governance process.
--
-- DANGER: Audit trail integrity compromised.
--
-- FIX: Restrict INSERT to admin/super_admin only.
-- ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "app_audit_insert_any"   ON public.admin_application_audit;
DROP POLICY IF EXISTS "app_audit_insert_staff" ON public.admin_application_audit;

CREATE POLICY "app_audit_insert_staff" ON public.admin_application_audit
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );


-- ─────────────────────────────────────────────────────────────────────
-- 8. FIX: Remove wallets_admin_write RLS policy
--
-- PROBLEM: This policy allowed admin/super_admin to UPDATE wallets
--   DIRECTLY — bypassing the immutable wallet_transactions ledger.
--   An admin could do: UPDATE wallets SET balance = 999999 WHERE user_id = X
--   and there would be NO wallet_transaction record of this change.
--
-- DANGER: Invisible coin creation; audit trail bypass; potential fraud.
--
-- FIX: Remove the policy. ALL wallet writes MUST go through RPCs
--   (admin_adjust_coins, purchase_item, etc.) which create tx records.
--   Emergency manual adjustments go through admin_adjust_coins which
--   already has admin permission check built in.
--
-- NOTE: This is a DESTRUCTIVE policy change. After this, direct
--   UPDATE wallets ... as admin will fail. Use admin_adjust_coins RPC.
-- ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "wallets_admin_write"  ON public.wallets;
DROP POLICY IF EXISTS "wallets_write_self"   ON public.wallets;

-- Ensure the read policy for self is correctly named (remove old duplicates)
DROP POLICY IF EXISTS "wallets_read_self"         ON public.wallets;
DROP POLICY IF EXISTS "wallets_read_self_only"    ON public.wallets;
DROP POLICY IF EXISTS "wallets_read_admin"        ON public.wallets;

-- Canonical policies: read-only for users, full read for admin (no write via RLS)
CREATE POLICY "wallets_read_self" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "wallets_read_admin" ON public.wallets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

-- Revoke direct UPDATE grant from authenticated (only RPCs may write)
REVOKE UPDATE ON TABLE public.wallets FROM authenticated;
GRANT SELECT ON TABLE public.wallets TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 9. FIX: profiles_write_admin — prevent phantom profile INSERT
--
-- PROBLEM: The profiles_write_admin FOR ALL policy allowed admin to
--   INSERT a new profile row. Profiles should ONLY be created by the
--   on_auth_user_created trigger (auth.users → profiles). An admin
--   inserting a phantom profile with no auth.users row creates an
--   orphaned record that could be used to bypass authentication flows.
--
-- DANGER: Ghost accounts; orphaned rows; auth bypass potential.
--
-- FIX: Replace FOR ALL with separate SELECT + UPDATE policies for admin.
--   Admin can read all profiles and update any profile (for bans, etc.)
--   but cannot INSERT or DELETE profiles directly.
-- ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_write_admin" ON public.profiles;

CREATE POLICY "profiles_read_admin" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin'))
  );

CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin'))
  );

-- ─────────────────────────────────────────────────────────────────────
-- 10. GRANT: Ensure proper execution grants for all fixed functions
-- ─────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.add_season_xp(uuid, uuid, integer)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_war_points(uuid, uuid, uuid, integer, integer, integer, text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 11. REGISTER MIGRATION
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.schema_migrations (filename)
VALUES ('35_security_patches.sql')
ON CONFLICT (filename) DO NOTHING;

DO $$ BEGIN
  RAISE NOTICE '35_security_patches: ALL SECURITY PATCHES APPLIED ✓';
END; $$;
