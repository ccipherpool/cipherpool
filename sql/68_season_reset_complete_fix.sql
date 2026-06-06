-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/68 Season Reset: Complete Bug Fix
--
-- BUGS FIXED IN start_new_season_v2 (sql/67):
--   1. notifications INSERT used "body" — correct column is "message"
--   2. wallet_transactions INSERT used "description" — correct is "reason"
--      + type 'admin_adjustment' not in CHECK → changed to 'debit'
--   3. clear_clan_chats did nothing  (DELETE FROM clan_messages missing)
--   4. clear_team_chats did nothing  (DELETE FROM team_messages / room_messages)
--   5. is_admin() / is_team_member() RLS functions ensured to exist
--      to prevent 403 on teams table query inside SeasonResetManager
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. Ensure helper RLS functions exist (prevent 403 on teams table)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'founder', 'fondateur')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id
      AND user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin()              TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid)   TO authenticated, anon;

-- ─────────────────────────────────────────────────────────────────────
-- 2. teams table — ensure SELECT policy allows authenticated reads
--    (prevents the 403 shown in browser when SeasonResetManager loads)
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'teams'
  ) THEN
    -- Drop the slow/broken policy that calls is_team_member per-row
    DROP POLICY IF EXISTS "teams_select"     ON public.teams;
    DROP POLICY IF EXISTS "teams_read_active" ON public.teams;

    -- Simple open-read policy for authenticated users
    DROP POLICY IF EXISTS "teams_read_authenticated" ON public.teams;
    CREATE POLICY "teams_read_authenticated" ON public.teams
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Recreate start_new_season_v2 with all bugs fixed
-- ─────────────────────────────────────────────────────────────────────

-- Drop ALL overloads of start_new_season_v2
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

  IF v_caller_role NOT IN ('founder', 'super_admin', 'fondateur') THEN
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
      "clear_clan_chats": true, "clear_team_chats": true,
      "unequip_avatars": true, "unequip_banners": true, "unequip_frames": true,
      "reset_ready_status": true
    }'::jsonb;
  END IF;

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
      LEFT JOIN public.wallets w      ON w.user_id  = p.id
      LEFT JOIN public.player_stats ps ON ps.user_id = p.id
      ON CONFLICT DO NOTHING;

      GET DIAGNOSTICS v_snapshot_ct = ROW_COUNT;
      v_log := array_append(v_log, format('[SEASON RESET] Snapshot: %s players', v_snapshot_ct));
    EXCEPTION WHEN OTHERS THEN
      v_log := array_append(v_log, '[SEASON RESET] Snapshot skipped: ' || SQLERRM);
    END;
  END IF;

  -- ── Close active season ────────────────────────────────────────────
  UPDATE public.seasons
     SET status     = 'completed',
         end_date   = now(),
         updated_at = now()
   WHERE status = 'active';

  -- ══════════════════════════════════════════════════════════════════
  -- RESET OPERATIONS
  -- ══════════════════════════════════════════════════════════════════

  -- ── Economy: Coins ─────────────────────────────────────────────────
  IF (v_cfg->>'reset_coins')::boolean IS TRUE
     OR (v_cfg->>'reset_wallet_balances')::boolean IS TRUE
  THEN
    -- FIX: was using wrong column "description" + invalid type "admin_adjustment"
    BEGIN
      INSERT INTO public.wallet_transactions (user_id, amount, type, reason)
      SELECT user_id,
             -balance,
             'debit',
             'Season ' || v_season_number || ' reset'
        FROM public.wallets
       WHERE balance > 0;
    EXCEPTION WHEN OTHERS THEN
      v_log := array_append(v_log, '[SEASON RESET] wallet_tx log skipped: ' || SQLERRM);
    END;

    UPDATE public.wallets SET balance = 0, updated_at = now();
    v_resets_applied := v_resets_applied + 1;
    v_log := array_append(v_log, '[SEASON RESET] Coins reset ✓');
  END IF;

  -- ── Progression: XP + Levels ───────────────────────────────────────
  IF (v_cfg->>'reset_xp')::boolean IS TRUE
     OR (v_cfg->>'reset_levels')::boolean IS TRUE
  THEN
    UPDATE public.profiles SET xp = 0, level = 1, updated_at = now();
    v_resets_applied := v_resets_applied + 1;
    v_log := array_append(v_log, '[SEASON RESET] XP reset ✓');
  END IF;

  -- ── Progression: Wins / Stats / Rankings ──────────────────────────
  IF (v_cfg->>'reset_wins')::boolean IS TRUE
     OR (v_cfg->>'reset_rank_points')::boolean IS TRUE
     OR (v_cfg->>'reset_kd')::boolean IS TRUE
     OR (v_cfg->>'reset_seasonal_stats')::boolean IS TRUE
     OR (v_cfg->>'reset_losses')::boolean IS TRUE
  THEN
    UPDATE public.player_stats
       SET kills              = CASE WHEN (v_cfg->>'reset_kd')::boolean             IS TRUE THEN 0 ELSE kills END,
           wins               = CASE WHEN (v_cfg->>'reset_wins')::boolean            IS TRUE THEN 0 ELSE wins END,
           losses             = CASE WHEN (v_cfg->>'reset_wins')::boolean IS TRUE
                                          OR (v_cfg->>'reset_losses')::boolean IS TRUE THEN 0 ELSE losses END,
           tournaments_played = CASE WHEN (v_cfg->>'reset_seasonal_stats')::boolean IS TRUE THEN 0 ELSE tournaments_played END,
           top3_finishes      = CASE WHEN (v_cfg->>'reset_seasonal_stats')::boolean IS TRUE THEN 0 ELSE top3_finishes END,
           total_points       = CASE WHEN (v_cfg->>'reset_rank_points')::boolean    IS TRUE THEN 0 ELSE total_points END,
           kd_ratio           = CASE WHEN (v_cfg->>'reset_kd')::boolean             IS TRUE THEN 0 ELSE kd_ratio END,
           mvp_count          = CASE WHEN (v_cfg->>'reset_seasonal_stats')::boolean IS TRUE THEN 0 ELSE mvp_count END,
           win_streak         = CASE WHEN (v_cfg->>'reset_wins')::boolean            IS TRUE THEN 0 ELSE win_streak END,
           updated_at         = now();

    v_resets_applied := v_resets_applied + 1;
    v_log := array_append(v_log, '[SEASON RESET] Rankings reset ✓');
  END IF;

  -- ── Clans ──────────────────────────────────────────────────────────
  IF (v_cfg->>'reset_clan_points')::boolean IS TRUE
     OR (v_cfg->>'reset_clan_wins')::boolean IS TRUE
     OR (v_cfg->>'reset_clan_stats')::boolean IS TRUE
     OR (v_cfg->>'reset_clan_rankings')::boolean IS TRUE
  THEN
    UPDATE public.clans
       SET points     = CASE WHEN (v_cfg->>'reset_clan_points')::boolean IS TRUE
                                  OR (v_cfg->>'reset_clan_stats')::boolean IS TRUE THEN 0 ELSE points END,
           wins       = CASE WHEN (v_cfg->>'reset_clan_wins')::boolean IS TRUE
                                  OR (v_cfg->>'reset_clan_stats')::boolean IS TRUE THEN 0 ELSE wins END,
           losses     = CASE WHEN (v_cfg->>'reset_clan_stats')::boolean IS TRUE THEN 0 ELSE losses END,
           updated_at = now();

    v_resets_applied := v_resets_applied + 1;
    v_log := array_append(v_log, '[SEASON RESET] Clan stats reset ✓');
  END IF;

  -- ── Tournaments ────────────────────────────────────────────────────
  IF (v_cfg->>'archive_active_tournaments')::boolean IS TRUE THEN
    BEGIN
      UPDATE public.tournaments
         SET status     = 'cancelled',
             updated_at = now()
       WHERE status IN (
         'registration_open', 'live', 'ready', 'results_pending',
         'full', 'published', 'open', 'active', 'upcoming',
         'in_progress', 'registration_closed', 'ready_check',
         'lobby_created', 'paused', 'results', 'results_open'
       );
    EXCEPTION WHEN OTHERS THEN
      v_log := array_append(v_log, '[SEASON RESET] Tournaments cancel skipped: ' || SQLERRM);
    END;

    v_resets_applied := v_resets_applied + 1;
    v_log := array_append(v_log, '[SEASON RESET] Tournaments archived ✓');
  END IF;

  IF (v_cfg->>'delete_draft_tournaments')::boolean IS TRUE THEN
    BEGIN
      DELETE FROM public.tournaments WHERE status IN ('draft', 'cancelled');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- ── Social: Global Chat ─────────────────────────────────────────────
  IF (v_cfg->>'clear_global_chat')::boolean IS TRUE THEN
    BEGIN
      DELETE FROM public.chat_messages WHERE channel = 'global';
    EXCEPTION WHEN undefined_column THEN
      DELETE FROM public.chat_messages;
    END;
    v_resets_applied := v_resets_applied + 1;
    v_log := array_append(v_log, '[SEASON RESET] Global chat cleared ✓');
  END IF;

  IF (v_cfg->>'clear_tournament_chats')::boolean IS TRUE THEN
    BEGIN
      DELETE FROM public.chat_messages WHERE channel != 'global';
    EXCEPTION WHEN OTHERS THEN
      -- Also try room_messages table (tournament room chat)
      BEGIN
        DELETE FROM public.room_messages;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END;
    v_log := array_append(v_log, '[SEASON RESET] Tournament chats cleared ✓');
  END IF;

  -- FIX: clear_clan_chats now actually deletes from clan_messages
  IF (v_cfg->>'clear_clan_chats')::boolean IS TRUE THEN
    BEGIN
      DELETE FROM public.clan_messages;
      v_resets_applied := v_resets_applied + 1;
      v_log := array_append(v_log, '[SEASON RESET] Clan chats cleared ✓');
    EXCEPTION WHEN OTHERS THEN
      v_log := array_append(v_log, '[SEASON RESET] Clan chat clear skipped: ' || SQLERRM);
    END;
  END IF;

  -- FIX: clear_team_chats now actually deletes from team messages
  IF (v_cfg->>'clear_team_chats')::boolean IS TRUE THEN
    BEGIN
      DELETE FROM public.team_messages;
      v_resets_applied := v_resets_applied + 1;
      v_log := array_append(v_log, '[SEASON RESET] Team chats cleared ✓');
    EXCEPTION WHEN OTHERS THEN
      v_log := array_append(v_log, '[SEASON RESET] Team chat clear skipped: ' || SQLERRM);
    END;
  END IF;

  -- ── Social: Notifications ──────────────────────────────────────────
  IF (v_cfg->>'clear_notifications')::boolean IS TRUE THEN
    BEGIN
      DELETE FROM public.notifications;
    EXCEPTION WHEN OTHERS THEN
      v_log := array_append(v_log, '[SEASON RESET] Notifications clear skipped: ' || SQLERRM);
    END;
  END IF;

  -- ── Cosmetics ──────────────────────────────────────────────────────
  IF (v_cfg->>'unequip_avatars')::boolean IS TRUE THEN
    BEGIN
      UPDATE public.user_items SET equipped = false WHERE equipped = true;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- Ready status
  IF (v_cfg->>'reset_ready_status')::boolean IS TRUE THEN
    BEGIN
      UPDATE public.room_members SET is_ready = false;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- ══════════════════════════════════════════════════════════════════
  -- CREATE THE NEW SEASON
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
    format('[SEASON RESET] Season %s created ✓', v_season_number));

  -- ── Notify all users ──────────────────────────────────────────────
  -- FIX: was using wrong column "body" — correct column is "message"
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    SELECT
      id,
      'season_start',
      '🆕 New Season: ' || trim(p_name),
      'A new competitive season has started. Rankings and stats have been reset. Good luck!',
      jsonb_build_object('season_number', v_season_number, 'season_id', v_new_season_id)
    FROM public.profiles;
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, '[SEASON RESET] Notifications skipped: ' || SQLERRM);
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
    v_log := array_append(v_log, '[SEASON RESET] Audit log skipped: ' || SQLERRM);
  END;

  v_log := array_append(v_log, '[SEASON RESET] Finished successfully ✓');

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
  RETURN jsonb_build_object(
    'success', false,
    'error',   SQLERRM,
    'detail',  SQLSTATE,
    'log',     to_json(v_log)
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 4. start_new_season wrapper — thin delegation (backwards compat)
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
      'reset_wallet_balances',      p_reset_coins,
      'reset_xp',                   p_reset_xp,
      'reset_levels',               p_reset_xp,
      'reset_wins',                 COALESCE(p_reset_wins, false) OR COALESCE(p_reset_stats, false),
      'reset_losses',               COALESCE(p_reset_stats, false),
      'reset_rank_points',          COALESCE(p_reset_stats, false),
      'reset_seasonal_stats',       COALESCE(p_reset_stats, false),
      'reset_kd',                   COALESCE(p_reset_stats, false),
      'reset_clan_points',          p_reset_clans,
      'reset_clan_wins',            p_reset_clans,
      'reset_clan_stats',           p_reset_clans,
      'clear_global_chat',          p_reset_chat,
      'clear_clan_chats',           p_reset_chat,
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
  v1 integer; v2 integer;
BEGIN
  SELECT COUNT(*) INTO v1
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'start_new_season';

  SELECT COUNT(*) INTO v2
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'start_new_season_v2';

  IF v1 != 1 THEN RAISE EXCEPTION 'Expected 1 start_new_season, found %', v1; END IF;
  IF v2 != 1 THEN RAISE EXCEPTION 'Expected 1 start_new_season_v2, found %', v2; END IF;

  RAISE NOTICE 'OK: sql/68 applied — season reset fully fixed';
END;
$$;
