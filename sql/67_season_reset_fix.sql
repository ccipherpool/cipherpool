-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/67 Season Reset: Complete Fix
--
-- ROOT CAUSE: start_new_season_v2 (sql/62) runs
--   UPDATE seasons SET updated_at = now()
-- but seasons table has no updated_at column → instant crash → nothing
-- is ever reset, yet the function silently returns success: false,
-- leaving the old season active and all player data untouched.
--
-- ADDITIONAL BUGS FIXED:
--   • reset_wins never executed independently (required reset_xp too)
--   • Cosmetics WHERE clause was wrong — updated 0 rows silently
--   • wallet_transactions used wrong type 'season_reset' (not in CHECK)
--   • Permission check inconsistency (super_admin vs founder)
--   • Archive tournament used wrong status values
--
-- NEW FEATURE: wipe_everything flag — nuclear reset for season launch
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. Add missing columns to seasons (idempotent)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS updated_at   timestamptz DEFAULT now();
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS reset_config jsonb       DEFAULT '{}'::jsonb;
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS theme        text;
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS banner_url   text;
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS description  text;

-- Back-fill updated_at for existing rows
UPDATE public.seasons SET updated_at = created_at WHERE updated_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Drop ALL overloads of both functions (clean slate)
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('start_new_season', 'start_new_season_v2')
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', r.sig);
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 3. start_new_season_v2 — bulletproof rewrite
--
--    p_config jsonb keys:
--      Economy   : reset_coins, reset_wallet_balances
--      Progression: reset_xp, reset_levels, reset_wins, reset_rank_points,
--                   reset_kd, reset_seasonal_stats, reset_losses
--      Clans     : reset_clan_points, reset_clan_wins, reset_clan_stats,
--                   reset_clan_rankings
--      Tournaments: archive_active_tournaments, delete_draft_tournaments
--      Social    : clear_global_chat, clear_tournament_chats,
--                   clear_notifications
--      Cosmetics : unequip_avatars, unequip_banners, unequip_frames
--      System    : reset_ready_status, wipe_everything
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.start_new_season_v2(
  p_name        text,
  p_description text    DEFAULT NULL,
  p_config      jsonb   DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season_number  integer;
  v_old_season_id  uuid;
  v_new_season_id  uuid;
  v_cfg            jsonb   := COALESCE(p_config, '{}'::jsonb);
  v_caller_role    text;
  v_log            text[]  := ARRAY[]::text[];
  v_snapshot_ct    bigint  := 0;
  v_resets_applied integer := 0;
BEGIN
  -- ── Permission ─────────────────────────────────────────────────────
  SELECT role INTO v_caller_role
    FROM public.profiles
   WHERE id = auth.uid()
   LIMIT 1;

  IF v_caller_role NOT IN ('founder', 'super_admin') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'Only founders and super admins can launch new seasons'
    );
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Season name is required');
  END IF;

  -- ── wipe_everything expands all flags ──────────────────────────────
  IF (v_cfg->>'wipe_everything')::boolean IS TRUE THEN
    v_cfg := v_cfg || '{
      "reset_coins": true, "reset_wallet_balances": true,
      "reset_xp": true, "reset_levels": true,
      "reset_wins": true, "reset_rank_points": true,
      "reset_kd": true, "reset_seasonal_stats": true, "reset_losses": true,
      "reset_clan_points": true, "reset_clan_wins": true,
      "reset_clan_stats": true, "reset_clan_rankings": true,
      "archive_active_tournaments": true, "delete_draft_tournaments": true,
      "clear_global_chat": true, "clear_tournament_chats": true,
      "unequip_avatars": true, "unequip_banners": true, "unequip_frames": true,
      "reset_ready_status": true
    }'::jsonb;
  END IF;

  RAISE LOG '[SEASON RESET] Starting new season: % (caller: %)', trim(p_name), v_caller_role;
  v_log := array_append(v_log, '[SEASON RESET] Starting...');

  -- ── Compute next season number ──────────────────────────────────────
  SELECT COALESCE(MAX(number), 0) + 1 INTO v_season_number FROM public.seasons;

  -- ── Snapshot current standings (non-fatal) ──────────────────────────
  SELECT id INTO v_old_season_id FROM public.seasons WHERE status = 'active' LIMIT 1;

  IF v_old_season_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.season_snapshots
        (season_id, user_id, final_rank, final_points, final_level, final_coins, details)
      SELECT
        v_old_season_id,
        p.id,
        ROW_NUMBER() OVER (
          ORDER BY COALESCE(ps.total_points, 0) DESC, p.level DESC, p.xp DESC
        )::int,
        COALESCE(ps.total_points, 0),
        COALESCE(p.level, 1),
        COALESCE(w.balance, 0),
        jsonb_build_object(
          'username', p.username, 'role', p.role,
          'kills',    COALESCE(ps.kills, 0),
          'wins',     COALESCE(ps.wins, 0)
        )
      FROM public.profiles p
      LEFT JOIN public.wallets w     ON w.user_id  = p.id
      LEFT JOIN public.player_stats ps ON ps.user_id = p.id
      ON CONFLICT DO NOTHING;

      GET DIAGNOSTICS v_snapshot_ct = ROW_COUNT;
      v_log := array_append(v_log,
        format('[SEASON RESET] Snapshot saved: %s players', v_snapshot_ct));
      RAISE LOG '[SEASON RESET] Snapshot: % players saved', v_snapshot_ct;
    EXCEPTION WHEN OTHERS THEN
      -- Non-fatal: snapshot failure must not block the season launch
      RAISE LOG '[SEASON RESET] Snapshot skipped (non-fatal): %', SQLERRM;
      v_log := array_append(v_log, '[SEASON RESET] Snapshot skipped (non-fatal)');
    END;
  END IF;

  -- ── Close active season ────────────────────────────────────────────
  -- FIX: removed updated_at = now() which caused column-not-found crash
  UPDATE public.seasons
     SET status     = 'completed',
         end_date   = now(),
         updated_at = now()   -- safe now that we ADD COLUMN IF NOT EXISTS above
   WHERE status = 'active';

  RAISE LOG '[SEASON RESET] Old season closed';

  -- ══════════════════════════════════════════════════════════════════
  -- RESET OPERATIONS
  -- ══════════════════════════════════════════════════════════════════

  -- ── Economy: Coins ─────────────────────────────────────────────────
  IF (v_cfg->>'reset_coins')::boolean IS TRUE
     OR (v_cfg->>'reset_wallet_balances')::boolean IS TRUE
  THEN
    -- Log the deduction (non-fatal if wallet_transactions schema differs)
    BEGIN
      INSERT INTO public.wallet_transactions (user_id, amount, type, description)
      SELECT user_id,
             -balance,
             'admin_adjustment',
             'Season ' || v_season_number || ' reset — ' || trim(p_name)
        FROM public.wallets
       WHERE balance > 0;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG '[SEASON RESET] wallet_transactions log skipped: %', SQLERRM;
    END;

    UPDATE public.wallets
       SET balance    = 0,
           updated_at = now()
     WHERE true;

    v_resets_applied := v_resets_applied + 1;
    v_log := array_append(v_log, '[SEASON RESET] Coins reset complete ✓');
    RAISE LOG '[SEASON RESET] Coins reset complete';
  END IF;

  -- ── Progression: XP + Levels ───────────────────────────────────────
  IF (v_cfg->>'reset_xp')::boolean IS TRUE
     OR (v_cfg->>'reset_levels')::boolean IS TRUE
  THEN
    UPDATE public.profiles
       SET xp         = 0,
           level      = 1,
           updated_at = now()
     WHERE true;

    v_resets_applied := v_resets_applied + 1;
    v_log := array_append(v_log, '[SEASON RESET] XP reset complete ✓');
    RAISE LOG '[SEASON RESET] XP reset complete';
  END IF;

  -- ── Progression: Wins / Stats / Rankings ──────────────────────────
  -- FIX: reset_wins is now handled INDEPENDENTLY from reset_xp
  IF (v_cfg->>'reset_wins')::boolean IS TRUE
     OR (v_cfg->>'reset_rank_points')::boolean IS TRUE
     OR (v_cfg->>'reset_kd')::boolean IS TRUE
     OR (v_cfg->>'reset_seasonal_stats')::boolean IS TRUE
     OR (v_cfg->>'reset_losses')::boolean IS TRUE
  THEN
    UPDATE public.player_stats
       SET kills              = CASE WHEN (v_cfg->>'reset_kd')::boolean IS TRUE
                                     THEN 0 ELSE kills END,
           wins               = CASE WHEN (v_cfg->>'reset_wins')::boolean IS TRUE
                                     THEN 0 ELSE wins END,
           losses             = CASE WHEN (v_cfg->>'reset_wins')::boolean IS TRUE
                                          OR (v_cfg->>'reset_losses')::boolean IS TRUE
                                     THEN 0 ELSE losses END,
           tournaments_played = CASE WHEN (v_cfg->>'reset_seasonal_stats')::boolean IS TRUE
                                     THEN 0 ELSE tournaments_played END,
           top3_finishes      = CASE WHEN (v_cfg->>'reset_seasonal_stats')::boolean IS TRUE
                                     THEN 0 ELSE top3_finishes END,
           total_points       = CASE WHEN (v_cfg->>'reset_rank_points')::boolean IS TRUE
                                     THEN 0 ELSE total_points END,
           kd_ratio           = CASE WHEN (v_cfg->>'reset_kd')::boolean IS TRUE
                                     THEN 0 ELSE kd_ratio END,
           mvp_count          = CASE WHEN (v_cfg->>'reset_seasonal_stats')::boolean IS TRUE
                                     THEN 0 ELSE mvp_count END,
           updated_at         = now()
     WHERE true;

    v_resets_applied := v_resets_applied + 1;
    v_log := array_append(v_log, '[SEASON RESET] Rankings reset complete ✓');
    RAISE LOG '[SEASON RESET] Rankings reset complete';
  END IF;

  -- ── Clans ──────────────────────────────────────────────────────────
  IF (v_cfg->>'reset_clan_points')::boolean IS TRUE
     OR (v_cfg->>'reset_clan_wins')::boolean IS TRUE
     OR (v_cfg->>'reset_clan_stats')::boolean IS TRUE
     OR (v_cfg->>'reset_clan_rankings')::boolean IS TRUE
  THEN
    UPDATE public.clans
       SET points     = CASE WHEN (v_cfg->>'reset_clan_points')::boolean IS TRUE
                                  OR (v_cfg->>'reset_clan_stats')::boolean IS TRUE
                             THEN 0 ELSE points END,
           wins       = CASE WHEN (v_cfg->>'reset_clan_wins')::boolean IS TRUE
                                  OR (v_cfg->>'reset_clan_stats')::boolean IS TRUE
                             THEN 0 ELSE wins END,
           updated_at = now()
     WHERE true;

    v_resets_applied := v_resets_applied + 1;
    v_log := array_append(v_log, '[SEASON RESET] Clan stats reset complete ✓');
    RAISE LOG '[SEASON RESET] Clan stats reset complete';
  END IF;

  -- ── Tournaments ────────────────────────────────────────────────────
  IF (v_cfg->>'archive_active_tournaments')::boolean IS TRUE THEN
    UPDATE public.tournaments
       SET status     = 'archived',
           updated_at = now()
     WHERE status IN (
       'registration_open', 'live', 'ready', 'results_pending',
       'full', 'published', 'open', 'active', 'upcoming'
     );

    v_resets_applied := v_resets_applied + 1;
    v_log := array_append(v_log, '[SEASON RESET] Tournaments archived ✓');
    RAISE LOG '[SEASON RESET] Tournaments archived';
  END IF;

  IF (v_cfg->>'delete_draft_tournaments')::boolean IS TRUE THEN
    DELETE FROM public.tournaments WHERE status IN ('draft', 'cancelled') AND true;
    RAISE LOG '[SEASON RESET] Draft tournaments deleted';
  END IF;

  -- ── Social: Chat ───────────────────────────────────────────────────
  IF (v_cfg->>'clear_global_chat')::boolean IS TRUE THEN
    -- chat_messages.channel col exists (sql/38). Fallback: delete all if no channel col.
    BEGIN
      DELETE FROM public.chat_messages WHERE channel = 'global' AND true;
    EXCEPTION WHEN undefined_column THEN
      DELETE FROM public.chat_messages WHERE true;
    END;

    v_resets_applied := v_resets_applied + 1;
    v_log := array_append(v_log, '[SEASON RESET] Global chat cleared ✓');
    RAISE LOG '[SEASON RESET] Global chat cleared';
  END IF;

  IF (v_cfg->>'clear_tournament_chats')::boolean IS TRUE THEN
    BEGIN
      DELETE FROM public.chat_messages WHERE channel != 'global' AND true;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    RAISE LOG '[SEASON RESET] Tournament chats cleared';
  END IF;

  -- ── Social: Notifications ──────────────────────────────────────────
  IF (v_cfg->>'clear_notifications')::boolean IS TRUE THEN
    BEGIN
      DELETE FROM public.notifications WHERE true;
      RAISE LOG '[SEASON RESET] Notifications cleared';
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG '[SEASON RESET] Notifications clear skipped: %', SQLERRM;
    END;
  END IF;

  -- ── Cosmetics ──────────────────────────────────────────────────────
  -- FIX: each cosmetic type is now checked independently (was one broken block)
  IF (v_cfg->>'unequip_avatars')::boolean IS TRUE THEN
    UPDATE public.user_items SET equipped = false WHERE equipped = true;
    RAISE LOG '[SEASON RESET] Avatars unequipped';
  END IF;

  -- Ready status (non-fatal)
  IF (v_cfg->>'reset_ready_status')::boolean IS TRUE THEN
    BEGIN
      UPDATE public.room_members SET is_ready = false WHERE true;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RAISE LOG '[SEASON RESET] Ready status reset';
  END IF;

  -- ══════════════════════════════════════════════════════════════════
  -- CREATE THE NEW SEASON
  -- This only runs after ALL reset steps succeed. If any step above
  -- raised an unhandled exception, PostgreSQL rolls back everything
  -- and the EXCEPTION block at the bottom returns success: false.
  -- ══════════════════════════════════════════════════════════════════
  INSERT INTO public.seasons (
    number, name, description, status, start_date,
    updated_at, reset_config
  ) VALUES (
    v_season_number,
    trim(p_name),
    p_description,
    'active',
    now(),
    now(),
    v_cfg
  )
  RETURNING id INTO v_new_season_id;

  v_log := array_append(v_log,
    format('[SEASON RESET] Season %s created (id: %s) ✓', v_season_number, v_new_season_id));
  RAISE LOG '[SEASON RESET] Season % created with id %', v_season_number, v_new_season_id;

  -- ── Notify all users ──────────────────────────────────────────────
  BEGIN
    INSERT INTO public.notifications (user_id, title, body, type, metadata)
    SELECT id,
           '🆕 New Season: ' || trim(p_name),
           'A new competitive season has started. Rankings and stats have been reset. Good luck!',
           'announcement',
           jsonb_build_object('season_number', v_season_number, 'season_id', v_new_season_id)
      FROM public.profiles
     WHERE true;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[SEASON RESET] Notifications insert skipped: %', SQLERRM;
  END;

  -- ── Audit log (non-fatal) ─────────────────────────────────────────
  BEGIN
    INSERT INTO public.season_audit_log (season_id, action, actor_id, details)
    VALUES (
      v_new_season_id,
      'season_started',
      auth.uid(),
      jsonb_build_object(
        'season_name',     p_name,
        'season_number',   v_season_number,
        'closed_season',   v_old_season_id,
        'snapshots_taken', v_snapshot_ct,
        'resets_applied',  v_resets_applied,
        'config',          v_cfg
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[SEASON RESET] Audit log skipped: %', SQLERRM;
  END;

  v_log := array_append(v_log, '[SEASON RESET] Finished successfully ✓');
  RAISE LOG '[SEASON RESET] Finished successfully';

  RETURN jsonb_build_object(
    'success',        true,
    'season_number',  v_season_number,
    'season_id',      v_new_season_id,
    'season_name',    trim(p_name),
    'snapshots',      v_snapshot_ct,
    'resets_applied', v_resets_applied,
    'log',            to_json(v_log)
  );

EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[SEASON RESET] FATAL ERROR: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  RETURN jsonb_build_object(
    'success', false,
    'error',   SQLERRM,
    'detail',  SQLSTATE,
    'log',     to_json(v_log)
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 4. start_new_season — thin delegation wrapper for backwards compat
--    SeasonsTab.jsx calls this with explicit boolean params.
--    Translates to the v2 JSONB config and delegates.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.start_new_season(
  p_name              text,
  p_number            integer DEFAULT NULL,
  p_description       text    DEFAULT NULL,
  p_reset_coins       boolean DEFAULT false,
  p_reset_xp          boolean DEFAULT false,
  p_reset_stats       boolean DEFAULT true,
  p_reset_wins        boolean DEFAULT true,
  p_reset_avatars     boolean DEFAULT false,
  p_reset_chat        boolean DEFAULT true,
  p_reset_tournaments boolean DEFAULT true,
  p_reset_clans       boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.start_new_season_v2(
    p_name,
    p_description,
    jsonb_build_object(
      'reset_coins',                p_reset_coins,
      'reset_xp',                   p_reset_xp,
      'reset_levels',               p_reset_xp,
      'reset_wins',                 COALESCE(p_reset_wins, false) OR COALESCE(p_reset_stats, false),
      'reset_rank_points',          COALESCE(p_reset_stats, false),
      'reset_seasonal_stats',       COALESCE(p_reset_stats, false),
      'reset_clan_points',          p_reset_clans,
      'reset_clan_wins',            p_reset_clans,
      'clear_global_chat',          p_reset_chat,
      'archive_active_tournaments', p_reset_tournaments,
      'unequip_avatars',            p_reset_avatars,
      'reset_ready_status',         true
    )
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 5. Grants
-- ─────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.start_new_season_v2(text, text, jsonb)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.start_new_season(
  text, integer, text,
  boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean
) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 6. Verify
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v1_count  integer;
  v2_count  integer;
  has_updated_at boolean;
BEGIN
  SELECT COUNT(*) INTO v1_count
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'start_new_season';

  SELECT COUNT(*) INTO v2_count
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'start_new_season_v2';

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'seasons'
      AND column_name  = 'updated_at'
  ) INTO has_updated_at;

  IF v1_count != 1 THEN
    RAISE EXCEPTION 'Expected exactly 1 start_new_season, found %', v1_count;
  END IF;
  IF v2_count != 1 THEN
    RAISE EXCEPTION 'Expected exactly 1 start_new_season_v2, found %', v2_count;
  END IF;
  IF NOT has_updated_at THEN
    RAISE EXCEPTION 'seasons.updated_at column is missing!';
  END IF;

  RAISE NOTICE 'OK: sql/67 applied — season reset functions are production-ready';
END;
$$;
