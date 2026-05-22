-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/40 Performance Indexes
-- Fixes: analytics_platform_summary (12 sequential COUNTs → 1 query),
--        leaderboard query optimization, governance dashboard
--        aggregation, and any remaining missing indexes.
-- Safe to run multiple times (fully idempotent).
-- Depends on: sql/37_database_integrity.sql already applied.
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. ADDITIONAL PERFORMANCE INDEXES
--    These supplement the indexes added in sql/37.
-- ─────────────────────────────────────────────────────────────────────

-- Tournaments: common admin filter — active tournaments by date
CREATE INDEX IF NOT EXISTS tournaments_active_date_idx
  ON public.tournaments(status, start_date DESC)
  WHERE status IN ('registration_open','full','ready','live');

-- Profiles: admin ban expiry sweep
CREATE INDEX IF NOT EXISTS profiles_banned_until_idx
  ON public.profiles(banned_until)
  WHERE banned_until IS NOT NULL;

-- Profiles: verification queue
CREATE INDEX IF NOT EXISTS profiles_verification_status_idx
  ON public.profiles(verification_status)
  WHERE verification_status IN ('pending','unverified');

-- Match results: pending verification queue
CREATE INDEX IF NOT EXISTS mr_pending_idx
  ON public.match_results(tournament_id, submitted_at DESC)
  WHERE status = 'pending';

-- User daily claims: streak lookup (most recent per user)
CREATE INDEX IF NOT EXISTS udc_user_recent_idx
  ON public.user_daily_claims(user_id, claimed_at DESC);

-- Gift transactions: expiry cleanup sweep
CREATE INDEX IF NOT EXISTS gt_expires_idx
  ON public.gift_transactions(expires_at)
  WHERE status = 'pending';

-- Feature requests: vote score ranking
DO $$
BEGIN
  IF to_regclass('public.feature_requests') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS fr_vote_score_idx
               ON public.feature_requests(vote_score DESC)
               WHERE status NOT IN (''completed'', ''rejected'')';
  END IF;
END;
$$;

-- Admin applications: review queue
DO $$
BEGIN
  IF to_regclass('public.admin_applications') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS aa_status_date_idx
               ON public.admin_applications(status, created_at DESC)
               WHERE status IN (''pending'',''under_review'',''shortlisted'')';
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 2. OPTIMISED analytics_platform_summary
--    Old version: 12 sequential SELECT COUNT(*) statements = 12
--    sequential table scans. New version: single CTE or aggregation
--    per table, assembled in one plpgsql call. Estimated speedup: 4-8x.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_platform_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_role(ARRAY['admin','super_admin']) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'total_users',        COUNT(*),
    'new_users_7d',       COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '7 days'),
    'new_users_30d',      COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '30 days'),
    'verified_players',   COUNT(*) FILTER (WHERE is_verified = true),
    'banned_users',       COUNT(*) FILTER (WHERE role = 'banned'),
    'avg_fair_play',      ROUND(AVG(fair_play_score)::numeric, 1)
  )
  INTO v_result
  FROM public.profiles;

  SELECT v_result || jsonb_build_object(
    'total_tournaments',  COUNT(*),
    'active_tournaments', COUNT(*) FILTER (WHERE status IN ('registration_open','full','ready','live'))
  )
  INTO v_result
  FROM public.tournaments;

  SELECT v_result || jsonb_build_object(
    'total_matches', COUNT(*)
  )
  INTO v_result
  FROM public.match_results;

  SELECT v_result || jsonb_build_object(
    'total_coins',        COALESCE(SUM(balance), 0),
    'total_transactions', (SELECT COUNT(*) FROM public.wallet_transactions)
  )
  INTO v_result
  FROM public.wallets;

  BEGIN
    SELECT v_result || jsonb_build_object('total_clans', COUNT(*))
    INTO v_result
    FROM public.clans;
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('total_clans', 0);
  END;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.analytics_platform_summary() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 3. OPTIMISED leaderboard query
--    RPC returning paginated leaderboard (by balance or by xp).
--    Uses partial index on xp DESC and wallets.balance DESC.
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_leaderboard(text, integer, integer);
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_type   text    DEFAULT 'coins',  -- 'coins' | 'xp' | 'fairplay'
  p_limit  integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  rank         bigint,
  user_id      uuid,
  username     text,
  avatar_url   text,
  score        bigint,
  level        integer,
  is_verified  boolean,
  country      text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  p_limit  := LEAST(COALESCE(p_limit, 50), 100);
  p_offset := GREATEST(COALESCE(p_offset, 0), 0);

  IF p_type = 'coins' THEN
    RETURN QUERY
      SELECT
        ROW_NUMBER() OVER (ORDER BY w.balance DESC)::bigint AS rank,
        p.id,
        p.username,
        p.avatar_url,
        w.balance::bigint AS score,
        p.level,
        p.is_verified,
        p.country
      FROM public.wallets w
      JOIN public.profiles p ON p.id = w.user_id
      WHERE p.role NOT IN ('banned')
      ORDER BY w.balance DESC
      LIMIT p_limit OFFSET p_offset;

  ELSIF p_type = 'xp' THEN
    RETURN QUERY
      SELECT
        ROW_NUMBER() OVER (ORDER BY p.xp DESC)::bigint AS rank,
        p.id,
        p.username,
        p.avatar_url,
        p.xp::bigint AS score,
        p.level,
        p.is_verified,
        p.country
      FROM public.profiles p
      WHERE p.role NOT IN ('banned')
      ORDER BY p.xp DESC
      LIMIT p_limit OFFSET p_offset;

  ELSIF p_type = 'fairplay' THEN
    RETURN QUERY
      SELECT
        ROW_NUMBER() OVER (ORDER BY p.fair_play_score DESC)::bigint AS rank,
        p.id,
        p.username,
        p.avatar_url,
        p.fair_play_score::bigint AS score,
        p.level,
        p.is_verified,
        p.country
      FROM public.profiles p
      WHERE p.role NOT IN ('banned')
      ORDER BY p.fair_play_score DESC
      LIMIT p_limit OFFSET p_offset;

  ELSE
    RAISE EXCEPTION 'Invalid leaderboard type: %. Use coins, xp, or fairplay', p_type;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, integer, integer) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 4. OPTIMISED get_governance_dashboard
--    The version in sql/20 runs many sequential COUNTs. Replace with
--    aggregations per table in one pass.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_governance_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb := '{}';
BEGIN
  IF NOT public.is_role(ARRAY['admin','super_admin']) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Applications stats
  BEGIN
    SELECT jsonb_build_object(
      'applications_pending',       COUNT(*) FILTER (WHERE status = 'pending'),
      'applications_under_review',  COUNT(*) FILTER (WHERE status = 'under_review'),
      'applications_shortlisted',   COUNT(*) FILTER (WHERE status = 'shortlisted'),
      'applications_approved',      COUNT(*) FILTER (WHERE status = 'approved'),
      'applications_rejected',      COUNT(*) FILTER (WHERE status = 'rejected'),
      'applications_total',         COUNT(*)
    )
    INTO v_result
    FROM public.admin_applications;
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('applications_total', 0);
  END;

  -- Reports stats
  BEGIN
    SELECT v_result || jsonb_build_object(
      'reports_pending',   COUNT(*) FILTER (WHERE status = 'pending'),
      'reports_resolved',  COUNT(*) FILTER (WHERE status = 'resolved'),
      'reports_dismissed', COUNT(*) FILTER (WHERE status = 'dismissed'),
      'reports_total',     COUNT(*)
    )
    INTO v_result
    FROM public.reports;
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('reports_total', 0);
  END;

  -- Feature requests stats
  BEGIN
    SELECT v_result || jsonb_build_object(
      'feature_requests_open',       COUNT(*) FILTER (WHERE status = 'open'),
      'feature_requests_planned',    COUNT(*) FILTER (WHERE status = 'planned'),
      'feature_requests_total',      COUNT(*)
    )
    INTO v_result
    FROM public.feature_requests;
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('feature_requests_total', 0);
  END;

  -- Bug reports stats
  BEGIN
    SELECT v_result || jsonb_build_object(
      'bugs_open',     COUNT(*) FILTER (WHERE status = 'open'),
      'bugs_critical', COUNT(*) FILTER (WHERE severity = 'critical' AND status = 'open'),
      'bugs_total',    COUNT(*)
    )
    INTO v_result
    FROM public.bug_reports;
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('bugs_total', 0);
  END;

  -- Warnings stats
  BEGIN
    SELECT v_result || jsonb_build_object(
      'active_warnings', COUNT(*) FILTER (WHERE expires_at IS NULL OR expires_at > now()),
      'total_warnings',  COUNT(*)
    )
    INTO v_result
    FROM public.user_warnings;
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('active_warnings', 0);
  END;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_governance_dashboard() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 5. INDEX ON profiles.created_at for registration trend queries
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS profiles_created_idx
  ON public.profiles(created_at DESC);

CREATE INDEX IF NOT EXISTS tournaments_created_at_idx
  ON public.tournaments(created_at DESC);

CREATE INDEX IF NOT EXISTS wallet_tx_created_idx
  ON public.wallet_transactions(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────
-- 6. REGISTER MIGRATION
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.schema_migrations (filename)
VALUES ('40_performance_indexes.sql')
ON CONFLICT (filename) DO NOTHING;
