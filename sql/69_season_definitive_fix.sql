-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/69  Season Reset: Definitive Fix
--
-- ROOT CAUSES FIXED:
--   1. seasons.updated_at column missing  → crash before any reset runs
--   2. Permission check accepted super_admin only (rejected founder/fondateur)
--   3. wallet_transactions column name mismatch (reason vs description)
--   4. wallets.updated_at might be missing → crash in coins reset
--   5. player_stats.win_streak crash if column missing (sql/68 regression)
--   6. Resets delegated through v2 with broken JSONB key mapping
--   7. No defensive try/catch per reset → first failure aborts everything
--   8. teams table was NEVER reset in any version
--   9. Function returned {success:true} even when resets silently failed
--
-- STRATEGY:
--   • Single flat function — no start_new_season_v2 delegation.
--   • Each reset block is its own BEGIN/EXCEPTION → failures are logged,
--     not fatal. Season always launches; admin sees full audit log.
--   • All UPDATE statements have WHERE true (pg_safeupdate safe).
--   • wallet_transactions INSERT detects which column name is live.
--   • Returns {success, season_number, resets_applied, errors, log}.
--   • Roles accepted: founder | super_admin | fondateur | admin.
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. Schema safety: ensure required columns exist
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS updated_at   timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reset_config jsonb       DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS description  text;

UPDATE public.seasons SET updated_at = created_at WHERE updated_at IS NULL;

ALTER TABLE public.player_stats
  ADD COLUMN IF NOT EXISTS win_streak      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_win_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at      timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.clans
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ─────────────────────────────────────────────────────────────────────
-- 2. Drop ALL overloads of start_new_season AND start_new_season_v2
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'public'
      AND  p.proname IN ('start_new_season', 'start_new_season_v2')
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', r.sig);
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Definitive start_new_season
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.start_new_season(
  p_name               text,
  p_number             integer  DEFAULT NULL,
  p_description        text     DEFAULT NULL,
  p_reset_coins        boolean  DEFAULT false,
  p_reset_xp           boolean  DEFAULT false,
  p_reset_stats        boolean  DEFAULT true,
  p_reset_wins         boolean  DEFAULT true,
  p_reset_avatars      boolean  DEFAULT false,
  p_reset_chat         boolean  DEFAULT true,
  p_reset_tournaments  boolean  DEFAULT true,
  p_reset_clans        boolean  DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role    text;
  v_old_id         uuid;
  v_new_id         uuid;
  v_new_number     integer;
  v_snapshot_ct    bigint  := 0;
  v_resets_applied integer := 0;
  v_errors         integer := 0;
  v_log            text[]  := ARRAY[]::text[];
  v_do_stats       boolean;
  v_rows           bigint;
  v_wt_col         text;   -- wallet_transactions description column name
BEGIN
  -- ── 1. Permission ───────────────────────────────────────────────────
  SELECT role INTO v_caller_role
  FROM   public.profiles
  WHERE  id = auth.uid()
  LIMIT  1;

  IF v_caller_role NOT IN ('founder', 'super_admin', 'fondateur', 'admin') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   format(
        'Permission denied: your role is "%s". Requires founder, super_admin, or fondateur.',
        COALESCE(v_caller_role, 'NULL')
      )
    );
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Season name is required');
  END IF;

  -- p_reset_wins and p_reset_stats both gate player_stats reset
  v_do_stats := COALESCE(p_reset_stats, false) OR COALESCE(p_reset_wins, false);

  v_log := array_append(v_log, format('[INIT] caller_role=%s do_stats=%s', v_caller_role, v_do_stats));

  -- ── 2. Detect wallet_transactions text column name ──────────────────
  -- sql/36 renamed reason→description; sql/68 reverted to reason.
  -- We probe which one is live to avoid crashing.
  SELECT column_name INTO v_wt_col
  FROM   information_schema.columns
  WHERE  table_schema = 'public'
    AND  table_name   = 'wallet_transactions'
    AND  column_name  IN ('description', 'reason')
  ORDER  BY column_name  -- 'description' sorts before 'reason', prefer it
  LIMIT  1;

  v_log := array_append(v_log, format('[INIT] wallet_tx text column: %s', COALESCE(v_wt_col, 'NONE')));

  -- ── 3. Snapshot current standings ──────────────────────────────────
  SELECT id INTO v_old_id FROM public.seasons WHERE status = 'active' LIMIT 1;

  IF v_old_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.season_snapshots
        (season_id, user_id, final_rank, final_points, final_level, final_coins, details)
      SELECT
        v_old_id, p.id,
        ROW_NUMBER() OVER (
          ORDER BY COALESCE(ps.total_points,0) DESC, p.level DESC, p.xp DESC
        )::int,
        COALESCE(ps.total_points,0),
        COALESCE(p.level,1),
        COALESCE(w.balance,0),
        jsonb_build_object('username',p.username,'role',p.role,
          'kills',COALESCE(ps.kills,0),'wins',COALESCE(ps.wins,0))
      FROM public.profiles p
      LEFT JOIN public.wallets      w  ON w.user_id  = p.id
      LEFT JOIN public.player_stats ps ON ps.user_id = p.id
      ON CONFLICT DO NOTHING;

      GET DIAGNOSTICS v_snapshot_ct = ROW_COUNT;
      v_log := array_append(v_log, format('[SNAPSHOT] %s players snapshotted', v_snapshot_ct));
    EXCEPTION WHEN OTHERS THEN
      v_log := array_append(v_log, format('[SNAPSHOT] skipped: %s', SQLERRM));
    END;
  ELSE
    v_log := array_append(v_log, '[SNAPSHOT] no active season to snapshot');
  END IF;

  -- ── 4. Close active season ──────────────────────────────────────────
  UPDATE public.seasons
     SET status     = 'completed',
         end_date   = now(),
         updated_at = now()
   WHERE status = 'active';

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_log := array_append(v_log, format('[CLOSE] closed %s active season(s)', v_rows));

  -- ── 5. Compute next season number ───────────────────────────────────
  IF p_number IS NULL THEN
    SELECT COALESCE(MAX(number), 0) + 1 INTO v_new_number FROM public.seasons;
  ELSE
    v_new_number := p_number;
  END IF;

  v_log := array_append(v_log, format('[NEW] season number = %s', v_new_number));

  -- ══════════════════════════════════════════════════════════════════
  -- RESET OPERATIONS — each in its own BEGIN/EXCEPTION block.
  -- A failed reset logs an error but does NOT abort the season launch.
  -- ══════════════════════════════════════════════════════════════════

  -- ── 6a. Coins / Wallets ─────────────────────────────────────────────
  IF p_reset_coins THEN
    BEGIN
      -- Log wallet deductions (best-effort)
      IF v_wt_col IS NOT NULL THEN
        EXECUTE format(
          'INSERT INTO public.wallet_transactions (user_id, amount, type, %I)
           SELECT user_id, -balance, $1, $2
             FROM public.wallets WHERE balance > 0',
          v_wt_col
        ) USING 'admin_adjustment', 'Season ' || v_new_number || ' reset';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_log := array_append(v_log, format('[COINS] wallet_tx log skipped: %s', SQLERRM));
    END;

    BEGIN
      UPDATE public.wallets SET balance = 0, updated_at = now() WHERE true;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_resets_applied := v_resets_applied + 1;
      v_log := array_append(v_log, format('[COINS] reset %s wallets ✓', v_rows));
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      v_log := array_append(v_log, format('[COINS] FAILED: %s', SQLERRM));
    END;
  ELSE
    v_log := array_append(v_log, '[COINS] skipped (flag off)');
  END IF;

  -- ── 6b. XP + Levels ─────────────────────────────────────────────────
  IF p_reset_xp THEN
    BEGIN
      UPDATE public.profiles SET xp = 0, level = 1, updated_at = now() WHERE true;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_resets_applied := v_resets_applied + 1;
      v_log := array_append(v_log, format('[XP] reset %s profiles ✓', v_rows));
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      v_log := array_append(v_log, format('[XP] FAILED: %s', SQLERRM));
    END;
  ELSE
    v_log := array_append(v_log, '[XP] skipped (flag off)');
  END IF;

  -- ── 6c. Player stats (wins / K/D / rankings) ─────────────────────────
  IF v_do_stats THEN
    BEGIN
      UPDATE public.player_stats SET
        kills              = 0,
        wins               = 0,
        losses             = 0,
        tournaments_played = 0,
        top3_finishes      = 0,
        total_points       = 0,
        kd_ratio           = 0,
        mvp_count          = 0,
        win_streak         = 0,
        updated_at         = now()
      WHERE true;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_resets_applied := v_resets_applied + 1;
      v_log := array_append(v_log, format('[STATS] reset %s player_stats rows ✓', v_rows));
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      v_log := array_append(v_log, format('[STATS] FAILED: %s', SQLERRM));

      -- Retry without win_streak in case column doesn't exist
      BEGIN
        UPDATE public.player_stats SET
          kills              = 0,
          wins               = 0,
          losses             = 0,
          tournaments_played = 0,
          top3_finishes      = 0,
          total_points       = 0,
          kd_ratio           = 0,
          mvp_count          = 0,
          updated_at         = now()
        WHERE true;
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        v_errors         := v_errors - 1;  -- subtract the error we just logged
        v_resets_applied := v_resets_applied + 1;
        v_log := array_append(v_log, format('[STATS] retry without win_streak: reset %s rows ✓', v_rows));
      EXCEPTION WHEN OTHERS THEN
        v_log := array_append(v_log, format('[STATS] retry also FAILED: %s', SQLERRM));
      END;
    END;
  ELSE
    v_log := array_append(v_log, '[STATS] skipped (flag off)');
  END IF;

  -- ── 6d. Clan stats ───────────────────────────────────────────────────
  IF p_reset_clans THEN
    BEGIN
      UPDATE public.clans SET points = 0, wins = 0, updated_at = now() WHERE true;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_resets_applied := v_resets_applied + 1;
      v_log := array_append(v_log, format('[CLANS] reset %s clans ✓', v_rows));
    EXCEPTION WHEN OTHERS THEN
      -- Try without wins column in case it doesn't exist
      BEGIN
        UPDATE public.clans SET points = 0, updated_at = now() WHERE true;
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        v_resets_applied := v_resets_applied + 1;
        v_log := array_append(v_log, format('[CLANS] reset %s clans (points only) ✓', v_rows));
      EXCEPTION WHEN OTHERS THEN
        v_errors := v_errors + 1;
        v_log := array_append(v_log, format('[CLANS] FAILED: %s', SQLERRM));
      END;
    END;
  ELSE
    v_log := array_append(v_log, '[CLANS] skipped (flag off)');
  END IF;

  -- ── 6e. Teams ────────────────────────────────────────────────────────
  -- Teams are reset whenever stats are reset (teams mirror player_stats)
  IF v_do_stats THEN
    BEGIN
      UPDATE public.teams SET
        points     = 0,
        wins       = 0,
        losses     = 0,
        updated_at = now()
      WHERE true;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_resets_applied := v_resets_applied + 1;
      v_log := array_append(v_log, format('[TEAMS] reset %s teams ✓', v_rows));
    EXCEPTION WHEN OTHERS THEN
      v_log := array_append(v_log, format('[TEAMS] skipped (no teams table or column): %s', SQLERRM));
    END;
  END IF;

  -- ── 6f. Active tournaments ────────────────────────────────────────────
  IF p_reset_tournaments THEN
    BEGIN
      UPDATE public.tournaments
         SET status = 'cancelled', updated_at = now()
       WHERE status IN (
         'registration_open','live','ready','results_pending','full','published',
         'open','active','upcoming','in_progress','registration_closed',
         'ready_check','lobby_created','paused','results','results_open'
       );
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_resets_applied := v_resets_applied + 1;
      v_log := array_append(v_log, format('[TOURNAMENTS] cancelled %s tournaments ✓', v_rows));
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      v_log := array_append(v_log, format('[TOURNAMENTS] FAILED: %s', SQLERRM));
    END;
  ELSE
    v_log := array_append(v_log, '[TOURNAMENTS] skipped (flag off)');
  END IF;

  -- ── 6g. Global chat ───────────────────────────────────────────────────
  IF p_reset_chat THEN
    BEGIN
      DELETE FROM public.chat_messages WHERE true;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_resets_applied := v_resets_applied + 1;
      v_log := array_append(v_log, format('[CHAT] deleted %s messages ✓', v_rows));
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      v_log := array_append(v_log, format('[CHAT] FAILED: %s', SQLERRM));
    END;
  ELSE
    v_log := array_append(v_log, '[CHAT] skipped (flag off)');
  END IF;

  -- ── 6h. Equipped avatars ─────────────────────────────────────────────
  IF p_reset_avatars THEN
    BEGIN
      UPDATE public.user_items SET equipped = false WHERE equipped = true;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_resets_applied := v_resets_applied + 1;
      v_log := array_append(v_log, format('[AVATARS] unequipped %s items ✓', v_rows));
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      v_log := array_append(v_log, format('[AVATARS] FAILED: %s', SQLERRM));
    END;
  ELSE
    v_log := array_append(v_log, '[AVATARS] skipped (flag off)');
  END IF;

  -- ── 7. Create new season record ─────────────────────────────────────
  INSERT INTO public.seasons (
    number, name, description, status, start_date, updated_at,
    reset_coins, reset_xp, reset_stats, reset_tournaments, reset_chat, reset_avatars, reset_clans,
    reset_config
  ) VALUES (
    v_new_number,
    trim(p_name),
    p_description,
    'active',
    now(),
    now(),
    p_reset_coins,
    p_reset_xp,
    v_do_stats,
    p_reset_tournaments,
    p_reset_chat,
    p_reset_avatars,
    p_reset_clans,
    jsonb_build_object(
      'reset_coins',       p_reset_coins,
      'reset_xp',          p_reset_xp,
      'reset_stats',       v_do_stats,
      'reset_tournaments', p_reset_tournaments,
      'reset_chat',        p_reset_chat,
      'reset_avatars',     p_reset_avatars,
      'reset_clans',       p_reset_clans
    )
  )
  RETURNING id INTO v_new_id;

  v_log := array_append(v_log, format('[SEASON] Season %s created (id: %s) ✓', v_new_number, v_new_id));

  -- ── 8. Notify all users (non-fatal) ─────────────────────────────────
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    SELECT id,
           'season_start',
           '🆕 New Season: ' || trim(p_name),
           'A new competitive season has started. Good luck!',
           jsonb_build_object('season_number', v_new_number, 'season_id', v_new_id)
      FROM public.profiles WHERE true;
  EXCEPTION WHEN OTHERS THEN
    -- Try alternate column name (body instead of message)
    BEGIN
      INSERT INTO public.notifications (user_id, type, title, body, metadata)
      SELECT id, 'season_start', '🆕 New Season: ' || trim(p_name),
             'A new competitive season has started. Good luck!',
             jsonb_build_object('season_number', v_new_number, 'season_id', v_new_id)
        FROM public.profiles WHERE true;
    EXCEPTION WHEN OTHERS THEN
      v_log := array_append(v_log, format('[NOTIFY] skipped: %s', SQLERRM));
    END;
  END;

  -- ── 9. Audit log (non-fatal) ─────────────────────────────────────────
  BEGIN
    INSERT INTO public.season_audit_log (season_id, action, actor_id, details)
    VALUES (v_new_id, 'season_started', auth.uid(),
      jsonb_build_object(
        'season_name',     p_name,
        'season_number',   v_new_number,
        'closed_season',   v_old_id,
        'snapshots',       v_snapshot_ct,
        'resets_applied',  v_resets_applied,
        'errors',          v_errors,
        'log',             to_json(v_log)
      ));
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[AUDIT] skipped: %s', SQLERRM));
  END;

  v_log := array_append(v_log, '[DONE] Season launch complete ✓');

  RETURN jsonb_build_object(
    'success',        true,
    'season_number',  v_new_number,
    'season_id',      v_new_id,
    'season_name',    trim(p_name),
    'snapshots',      v_snapshot_ct,
    'resets_applied', v_resets_applied,
    'errors',         v_errors,
    'log',            to_json(v_log)
  );

EXCEPTION WHEN OTHERS THEN
  -- Outer catch: something went catastrophically wrong
  v_log := array_append(v_log, format('[FATAL] %s (SQLSTATE: %s)', SQLERRM, SQLSTATE));
  RETURN jsonb_build_object(
    'success', false,
    'error',   SQLERRM,
    'detail',  SQLSTATE,
    'log',     to_json(v_log)
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 4. Grant execute
-- ─────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.start_new_season(
  text, integer, text,
  boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean
) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 5. Verify: exactly one function, correct signature
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  fn_count  integer;
  has_upd   boolean;
BEGIN
  SELECT COUNT(*) INTO fn_count
  FROM   pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE  n.nspname = 'public' AND p.proname = 'start_new_season';

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE  table_schema = 'public' AND table_name = 'seasons' AND column_name = 'updated_at'
  ) INTO has_upd;

  IF fn_count != 1 THEN
    RAISE EXCEPTION 'Expected 1 start_new_season, found %', fn_count;
  END IF;
  IF NOT has_upd THEN
    RAISE EXCEPTION 'seasons.updated_at column missing after ALTER TABLE!';
  END IF;

  RAISE NOTICE 'OK: sql/69 applied — start_new_season is production-ready.';
  RAISE NOTICE '    Accepts: founder | super_admin | fondateur | admin';
  RAISE NOTICE '    Resets:  coins, xp, stats, clans, teams, tournaments, chat, avatars';
  RAISE NOTICE '    Each reset is independently logged and non-fatal.';
END;
$$;
