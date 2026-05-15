-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — Analytics RPCs
-- Aggregated data queries for the SuperAdmin Analytics Dashboard
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. USER REGISTRATIONS PER DAY (last 30 days)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_registrations_daily(p_days integer DEFAULT 30)
RETURNS TABLE (day date, count bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    DATE(created_at) AS day,
    COUNT(*) AS count
  FROM public.profiles
  WHERE created_at >= NOW() - (p_days || ' days')::interval
  GROUP BY DATE(created_at)
  ORDER BY day ASC;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 2. TOURNAMENTS CREATED PER WEEK (last 12 weeks)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_tournaments_weekly(p_weeks integer DEFAULT 12)
RETURNS TABLE (week_start date, created bigint, completed bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    DATE_TRUNC('week', created_at)::date AS week_start,
    COUNT(*) AS created,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed
  FROM public.tournaments
  WHERE created_at >= NOW() - (p_weeks || ' weeks')::interval
  GROUP BY DATE_TRUNC('week', created_at)
  ORDER BY week_start ASC;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 3. COIN FLOW PER DAY (credits vs debits, last 30 days)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_coin_flow_daily(p_days integer DEFAULT 30)
RETURNS TABLE (day date, credits bigint, debits bigint, net bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    DATE(created_at) AS day,
    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS credits,
    COALESCE(ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)), 0) AS debits,
    COALESCE(SUM(amount), 0) AS net
  FROM public.wallet_transactions
  WHERE created_at >= NOW() - (p_days || ' days')::interval
  GROUP BY DATE(created_at)
  ORDER BY day ASC;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 4. ACTIVE PLAYERS PER DAY (unique users with wallet transactions)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_active_players_daily(p_days integer DEFAULT 30)
RETURNS TABLE (day date, active_users bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    DATE(created_at) AS day,
    COUNT(DISTINCT user_id) AS active_users
  FROM public.wallet_transactions
  WHERE created_at >= NOW() - (p_days || ' days')::interval
  GROUP BY DATE(created_at)
  ORDER BY day ASC;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 5. PLATFORM SUMMARY STATS
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_platform_summary()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
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
  v_avg_fair_play      numeric;
BEGIN
  SELECT COUNT(*) INTO v_total_users FROM public.profiles;
  SELECT COUNT(*) INTO v_new_users_7d  FROM public.profiles WHERE created_at >= NOW() - INTERVAL '7 days';
  SELECT COUNT(*) INTO v_new_users_30d FROM public.profiles WHERE created_at >= NOW() - INTERVAL '30 days';
  SELECT COUNT(*) INTO v_total_tournaments FROM public.tournaments;
  SELECT COUNT(*) INTO v_active_tournaments FROM public.tournaments WHERE status IN ('open','ongoing');
  SELECT COUNT(*) INTO v_total_matches FROM public.match_results;
  SELECT COALESCE(SUM(balance), 0) INTO v_total_coins FROM public.wallets;
  SELECT COUNT(*) INTO v_total_transactions FROM public.wallet_transactions;
  SELECT COUNT(*) INTO v_total_clans FROM public.clans;
  SELECT COUNT(*) INTO v_verified_players FROM public.profiles WHERE is_verified = true;
  SELECT COUNT(*) INTO v_banned_users FROM public.profiles WHERE role = 'banned';
  SELECT ROUND(AVG(fair_play_score), 1) INTO v_avg_fair_play FROM public.profiles;

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
    'banned_users',       v_banned_users,
    'avg_fair_play',      v_avg_fair_play
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 6. TOP EARNERS (richest wallets)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_top_earners(p_limit integer DEFAULT 10)
RETURNS TABLE (username text, avatar_url text, balance bigint, fair_play_score integer, is_verified boolean)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    p.username,
    p.avatar_url,
    w.balance::bigint,
    p.fair_play_score,
    p.is_verified
  FROM public.wallets w
  JOIN public.profiles p ON p.id = w.user_id
  WHERE p.role NOT IN ('banned')
  ORDER BY w.balance DESC
  LIMIT p_limit;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 7. TOURNAMENT STATUS BREAKDOWN
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_tournament_breakdown()
RETURNS TABLE (status text, count bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT status, COUNT(*) AS count
  FROM public.tournaments
  GROUP BY status
  ORDER BY count DESC;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 8. REFERRAL STATS SUMMARY
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_referral_summary()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_codes    bigint;
  v_total_uses     bigint;
  v_total_rewarded bigint;
  v_coins_spent    bigint;
BEGIN
  SELECT COUNT(*) INTO v_total_codes FROM public.referral_codes WHERE is_active = true;
  SELECT COUNT(*) INTO v_total_uses  FROM public.referral_uses;
  SELECT COUNT(*) INTO v_total_rewarded FROM public.referral_uses WHERE rewarded = true;
  SELECT COALESCE(SUM(referrer_reward + referred_reward), 0) INTO v_coins_spent FROM public.referral_uses WHERE rewarded = true;
  RETURN jsonb_build_object(
    'active_codes',    v_total_codes,
    'total_referrals', v_total_uses,
    'rewarded',        v_total_rewarded,
    'coins_spent',     v_coins_spent
  );
END;
$$;

-- Grant access to admins only via RLS / SECURITY DEFINER
-- These functions are SECURITY DEFINER so any authenticated user can call them
-- but the SuperAdmin UI only renders for super_admin role
