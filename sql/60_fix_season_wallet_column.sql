-- ══════════════════════════════════════════════════════════════════════
-- sql/60 — Fix start_new_season: reason → description
-- ──────────────────────────────────────────────────────────────────────
-- sql/54 introduced a bug at the wallet_transactions INSERT:
--   INSERT INTO ... (user_id, amount, type, reason, metadata)
-- The column was renamed reason → description by sql/36.
-- `metadata` does not exist on wallet_transactions either.
-- This migration re-creates the function with the correct column name.
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. Ensure description column exists (idempotent)
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'wallet_transactions'
      AND column_name  = 'description'
  ) THEN
    -- Still on old name — rename it
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'wallet_transactions'
        AND column_name  = 'reason'
    ) THEN
      ALTER TABLE public.wallet_transactions RENAME COLUMN reason TO description;
    ELSE
      ALTER TABLE public.wallet_transactions ADD COLUMN description text NOT NULL DEFAULT '';
    END IF;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Drop all start_new_season overloads, then recreate with fix
-- ─────────────────────────────────────────────────────────────────────
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
    -- FIX: was (reason, metadata) — correct column is description
    INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    SELECT user_id, -balance, 'admin_adjustment',
      'Season ' || v_new_number || ' reset'
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
    WHERE status IN ('open','active','upcoming','registration_closed','live','in_progress','full','registration_open');
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
-- Verify
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  fn_count integer;
  has_desc boolean;
BEGIN
  SELECT COUNT(*) INTO fn_count
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'start_new_season';

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'wallet_transactions'
      AND column_name  = 'description'
  ) INTO has_desc;

  IF fn_count = 0 THEN
    RAISE EXCEPTION 'start_new_season was not created!';
  ELSIF fn_count > 1 THEN
    RAISE EXCEPTION '% overloads of start_new_season still exist!', fn_count;
  ELSIF NOT has_desc THEN
    RAISE EXCEPTION 'wallet_transactions.description column missing!';
  ELSE
    RAISE NOTICE 'OK: start_new_season fixed (description column confirmed).';
  END IF;
END;
$$;
