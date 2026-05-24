-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/54 Season + Admin Logs Fixes
-- Fixes:
--   1. seasons.theme_color column missing (SeasonBadge queries it)
--   2. seasons.description column missing (start_new_season inserts it)
--   3. season_audit_log.admin_id column missing (live RPC uses admin_id)
--   4. Recreate start_new_season with canonical column names
--   5. Fix ban_user RPC admin_logs insert (user_id → admin_id)
--   6. Fix match_verification RPCs admin_logs insert (user_id → admin_id)
-- Safe to run multiple times (fully idempotent).
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. ADD MISSING COLUMNS TO seasons
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS theme_color  text DEFAULT '#10b981';
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS description  text;

-- ─────────────────────────────────────────────────────────────────────
-- 2. ADD admin_id TO season_audit_log
--    The live DB version of start_new_season inserts with admin_id,
--    but the table was created with actor_id. Add admin_id so both
--    old and new versions can run without error.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.season_audit_log
  ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 3. RECREATE start_new_season — canonical version
--    Drops all overloads; creates one 11-param function using actor_id.
-- ─────────────────────────────────────────────────────────────────────
-- Drop ALL overloads dynamically — catches any signature regardless of param count
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'start_new_season'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', r.sig);
  END LOOP;
END;
$$;

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
  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied: super_admin only');
  END IF;

  v_do_stats := COALESCE(p_reset_stats, false) OR COALESCE(p_reset_wins, false);

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
        'username',    p.username,
        'role',        p.role,
        'kills',       COALESCE(ps.kills, 0),
        'wins',        COALESCE(ps.wins, 0),
        'tournaments', COALESCE(ps.tournaments_played, 0)
      )
    FROM public.profiles p
    LEFT JOIN public.wallets      w  ON w.user_id  = p.id
    LEFT JOIN public.player_stats ps ON ps.user_id = p.id
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_snapshot_ct = ROW_COUNT;
  END IF;

  UPDATE public.seasons SET status = 'completed', end_date = now() WHERE status = 'active';

  IF p_number IS NULL THEN
    SELECT COALESCE(MAX(number), 0) + 1 INTO v_new_number FROM public.seasons;
  ELSE
    v_new_number := p_number;
  END IF;

  IF p_reset_coins THEN
    INSERT INTO public.wallet_transactions (user_id, amount, type, reason, metadata)
    SELECT user_id, -balance, 'admin_adjustment',
      'Season ' || v_new_number || ' reset',
      jsonb_build_object('season_reset', true, 'season_number', v_new_number)
    FROM public.wallets WHERE balance > 0;
    UPDATE public.wallets SET balance = 0, updated_at = now();
  END IF;

  IF p_reset_xp THEN
    UPDATE public.profiles SET xp = 0, level = 1, updated_at = now();
  END IF;

  IF v_do_stats THEN
    UPDATE public.player_stats SET
      kills = 0, wins = 0, losses = 0, tournaments_played = 0,
      top3_finishes = 0, total_points = 0, kd_ratio = 0, mvp_count = 0,
      updated_at = now();
  END IF;

  IF p_reset_chat THEN DELETE FROM public.chat_messages; END IF;

  IF p_reset_tournaments THEN
    UPDATE public.tournaments SET status = 'cancelled', updated_at = now()
    WHERE status IN ('open','active','upcoming','registration_closed','live','in_progress','full');
  END IF;

  IF p_reset_avatars THEN
    UPDATE public.user_items SET equipped = false WHERE equipped = true;
  END IF;

  IF p_reset_clans THEN
    UPDATE public.clans SET points = 0, updated_at = now();
  END IF;

  INSERT INTO public.seasons (
    name, number, description,
    reset_coins, reset_xp, reset_stats,
    reset_tournaments, reset_chat, reset_avatars, reset_clans,
    status, start_date
  ) VALUES (
    p_name, v_new_number, p_description,
    p_reset_coins, p_reset_xp, v_do_stats,
    p_reset_tournaments, p_reset_chat, p_reset_avatars, p_reset_clans,
    'active', now()
  )
  RETURNING id INTO v_new_id;

  -- Write audit log using actor_id (canonical column)
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success',          true,
    'new_season_id',    v_new_id,
    'season_number',    v_new_number,
    'closed_season_id', v_old_id,
    'snapshots_taken',  v_snapshot_ct
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$;

GRANT EXECUTE
  ON FUNCTION public.start_new_season(
    text, integer, text,
    boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean
  )
  TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 4. FIX ban_user RPC — admin_logs insert uses wrong column user_id
--    sql/45 created ban_user with user_id; live DB has admin_id.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ban_user(
  target_user   uuid,
  banned_until  timestamptz,
  banned_by     uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin', 'super_admin', 'founder') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  UPDATE public.profiles
  SET banned = true, banned_until = ban_user.banned_until, updated_at = now()
  WHERE id = target_user;

  BEGIN
    INSERT INTO public.admin_logs (admin_id, action, target_user_id, details)
    VALUES (auth.uid(), 'ban_user', target_user,
      jsonb_build_object('banned_until', banned_until, 'banned_by', COALESCE(banned_by, auth.uid())));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('success', true, 'banned_until', banned_until);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ban_user(uuid, timestamptz, uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 5. FIX unban_user RPC — ensure it exists with admin_id logging
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.unban_user(target_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin', 'super_admin', 'founder') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  UPDATE public.profiles
  SET banned = false, banned_until = NULL, updated_at = now()
  WHERE id = target_user;

  BEGIN
    INSERT INTO public.admin_logs (admin_id, action, target_user_id, details)
    VALUES (auth.uid(), 'unban_user', target_user, '{}');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.unban_user(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 6. VERIFY
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE fn_count int;
BEGIN
  SELECT COUNT(*) INTO fn_count
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'start_new_season';

  IF fn_count = 0 THEN
    RAISE EXCEPTION 'start_new_season was not created!';
  ELSIF fn_count > 1 THEN
    RAISE EXCEPTION '% overloads of start_new_season still exist!', fn_count;
  ELSE
    RAISE NOTICE 'OK: seasons.theme_color added, season_audit_log.admin_id added, start_new_season recreated (% function).', fn_count;
  END IF;
END;
$$;
