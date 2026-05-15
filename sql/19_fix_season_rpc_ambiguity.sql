-- ================================================================
-- CIPHERPOOL — CRITICAL FIX: start_new_season RPC ambiguity
-- File: sql/19_fix_season_rpc_ambiguity.sql
-- Run this in Supabase SQL Editor as service-role / postgres
--
-- Problem: Two overloads of start_new_season exist in the database,
--   causing PostgREST to fail with "could not choose best candidate".
-- Fix: Drop both overloads → create one canonical 11-param function.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. ADD description COLUMN TO seasons (safe / idempotent)
-- ----------------------------------------------------------------
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS description text;

-- ----------------------------------------------------------------
-- 2. SEASON AUDIT LOG TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.season_audit_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id    uuid        REFERENCES public.seasons(id) ON DELETE SET NULL,
  action       text        NOT NULL,
  actor_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  details      jsonb       NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.season_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_read_admin"  ON public.season_audit_log;
DROP POLICY IF EXISTS "audit_insert_any"  ON public.season_audit_log;

CREATE POLICY "audit_read_admin" ON public.season_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );
-- Insert is done from SECURITY DEFINER functions, so service-role only
CREATE POLICY "audit_insert_any" ON public.season_audit_log FOR INSERT WITH CHECK (true);

GRANT SELECT ON public.season_audit_log TO authenticated;

-- ----------------------------------------------------------------
-- 3. DROP ALL EXISTING VARIANTS (by exact signature)
-- ----------------------------------------------------------------

-- Variant A — 9 params from sql/03_seasons.sql
DROP FUNCTION IF EXISTS public.start_new_season(
  text, integer,
  boolean, boolean, boolean, boolean, boolean, boolean, boolean
);

-- Variant B — 11 params from sql/phase_a_normalized/003_rls_and_rpc.sql
DROP FUNCTION IF EXISTS public.start_new_season(
  text, integer, text,
  boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean
);

-- Safety: drop any other arity variants that may exist
DROP FUNCTION IF EXISTS public.start_new_season(text);
DROP FUNCTION IF EXISTS public.start_new_season(text, integer);
DROP FUNCTION IF EXISTS public.start_new_season(text, text);

-- ----------------------------------------------------------------
-- 4. CREATE ONE CANONICAL FUNCTION
-- Signature: (text, integer, text, boolean×8)  — 11 params total
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_new_season(
  p_name               text,
  p_number             integer DEFAULT NULL,
  p_description        text    DEFAULT NULL,
  p_reset_coins        boolean DEFAULT false,
  p_reset_xp           boolean DEFAULT false,
  p_reset_stats        boolean DEFAULT true,
  p_reset_wins         boolean DEFAULT true,
  p_reset_avatars      boolean DEFAULT false,
  p_reset_chat         boolean DEFAULT true,
  p_reset_tournaments  boolean DEFAULT true,
  p_reset_clans        boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role  text;
  v_old_id       uuid;
  v_new_id       uuid;
  v_new_number   integer;
  v_snapshot_ct  bigint := 0;
  v_do_stats     boolean;
BEGIN
  -- ── 1. Permission guard: super_admin only ──────────────────────
  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'super_admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'Permission denied: super_admin only'
    );
  END IF;

  -- ── 2. Merge the two stats flags ───────────────────────────────
  -- p_reset_wins is kept for backwards compatibility with older
  -- frontend builds; both flags are OR-ed together.
  v_do_stats := COALESCE(p_reset_stats, false) OR COALESCE(p_reset_wins, false);

  -- ── 3. Snapshot current standings ─────────────────────────────
  SELECT id INTO v_old_id
  FROM public.seasons
  WHERE status = 'active'
  LIMIT 1;

  IF v_old_id IS NOT NULL THEN
    INSERT INTO public.season_snapshots
      (season_id, user_id, final_rank, final_points, final_level, final_coins, details)
    SELECT
      v_old_id,
      p.id,
      COALESCE(
        ROW_NUMBER() OVER (
          ORDER BY COALESCE(ps.total_points, 0) DESC, p.level DESC, p.xp DESC
        )::int,
        0
      ),
      COALESCE(ps.total_points, 0),
      COALESCE(p.level, 1),
      COALESCE(w.balance, 0),
      jsonb_build_object(
        'username',        p.username,
        'role',            p.role,
        'kills',           COALESCE(ps.kills, 0),
        'wins',            COALESCE(ps.wins, 0),
        'tournaments',     COALESCE(ps.tournaments_played, 0)
      )
    FROM public.profiles p
    LEFT JOIN public.wallets     w  ON w.user_id  = p.id
    LEFT JOIN public.player_stats ps ON ps.user_id = p.id
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_snapshot_ct = ROW_COUNT;
  END IF;

  -- ── 4. Close active season ─────────────────────────────────────
  UPDATE public.seasons
  SET status = 'completed', end_date = now()
  WHERE status = 'active';

  -- ── 5. Auto-compute season number ─────────────────────────────
  IF p_number IS NULL THEN
    SELECT COALESCE(MAX(number), 0) + 1 INTO v_new_number
    FROM public.seasons;
  ELSE
    v_new_number := p_number;
  END IF;

  -- ── 6. Apply resets ────────────────────────────────────────────

  -- 6a. Coins reset
  IF p_reset_coins THEN
    INSERT INTO public.wallet_transactions
      (user_id, amount, type, reason, metadata)
    SELECT
      user_id,
      -balance,
      'admin_adjustment',
      'Season ' || v_new_number || ' reset',
      jsonb_build_object('season_reset', true, 'season_number', v_new_number)
    FROM public.wallets
    WHERE balance > 0;

    UPDATE public.wallets
    SET balance = 0, updated_at = now();
  END IF;

  -- 6b. XP / Level reset
  IF p_reset_xp THEN
    UPDATE public.profiles
    SET xp = 0, level = 1, updated_at = now();
  END IF;

  -- 6c. Player stats reset
  IF v_do_stats THEN
    UPDATE public.player_stats
    SET
      kills             = 0,
      wins              = 0,
      losses            = 0,
      tournaments_played = 0,
      top3_finishes     = 0,
      total_points      = 0,
      kd_ratio          = 0,
      mvp_count         = 0,
      updated_at        = now();
  END IF;

  -- 6d. Global chat reset
  IF p_reset_chat THEN
    DELETE FROM public.chat_messages;
  END IF;

  -- 6e. Tournament archive
  IF p_reset_tournaments THEN
    UPDATE public.tournaments
    SET status = 'cancelled', updated_at = now()
    WHERE status IN ('open','active','upcoming','registration_closed','live','in_progress','full');
  END IF;

  -- 6f. Equipped avatar reset
  IF p_reset_avatars THEN
    UPDATE public.user_items
    SET equipped = false
    WHERE equipped = true;
  END IF;

  -- 6g. Clan stats reset (clans table has `points` column)
  IF p_reset_clans THEN
    UPDATE public.clans
    SET points = 0, updated_at = now();
  END IF;

  -- ── 7. Insert new season ───────────────────────────────────────
  INSERT INTO public.seasons (
    name, number, description,
    reset_coins, reset_xp, reset_stats,
    reset_tournaments, reset_chat, reset_avatars, reset_clans,
    status, start_date
  ) VALUES (
    p_name,
    v_new_number,
    p_description,
    p_reset_coins,
    p_reset_xp,
    v_do_stats,
    p_reset_tournaments,
    p_reset_chat,
    p_reset_avatars,
    p_reset_clans,
    'active',
    now()
  )
  RETURNING id INTO v_new_id;

  -- ── 8. Audit log ───────────────────────────────────────────────
  INSERT INTO public.season_audit_log (season_id, action, actor_id, details)
  VALUES (
    v_new_id,
    'season_started',
    auth.uid(),
    jsonb_build_object(
      'season_name',     p_name,
      'season_number',   v_new_number,
      'closed_season',   v_old_id,
      'snapshots_taken', v_snapshot_ct,
      'resets', jsonb_build_object(
        'coins',       p_reset_coins,
        'xp',          p_reset_xp,
        'stats',       v_do_stats,
        'chat',        p_reset_chat,
        'tournaments', p_reset_tournaments,
        'avatars',     p_reset_avatars,
        'clans',       p_reset_clans
      )
    )
  );

  -- ── 9. Return ──────────────────────────────────────────────────
  RETURN jsonb_build_object(
    'success',          true,
    'new_season_id',    v_new_id,
    'season_number',    v_new_number,
    'closed_season_id', v_old_id,
    'snapshots_taken',  v_snapshot_ct
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Never crash silently — return a clean error the frontend can display
    RETURN jsonb_build_object(
      'success', false,
      'error',   SQLERRM,
      'detail',  SQLSTATE
    );
END;
$$;

-- ----------------------------------------------------------------
-- 5. GRANT EXECUTE (to authenticated — super_admin check is inside)
-- ----------------------------------------------------------------
GRANT EXECUTE
  ON FUNCTION public.start_new_season(
    text, integer, text,
    boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean
  )
  TO authenticated;

-- ----------------------------------------------------------------
-- 6. VERIFY — confirm exactly ONE function exists with this name
-- ----------------------------------------------------------------
DO $$
DECLARE
  fn_count int;
BEGIN
  SELECT COUNT(*)
  INTO fn_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'start_new_season';

  IF fn_count = 0 THEN
    RAISE EXCEPTION 'MIGRATION ERROR: start_new_season was not created!';
  ELSIF fn_count > 1 THEN
    RAISE EXCEPTION 'MIGRATION ERROR: % overloads of start_new_season still exist — ambiguity not resolved!', fn_count;
  ELSE
    RAISE NOTICE 'OK: exactly 1 start_new_season function exists. Ambiguity resolved.';
  END IF;
END;
$$;
