-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/62 Season Extended Reset System
-- Adds:
--   • reset_config jsonb column on seasons table
--   • start_new_season_v2(p_name, p_description, p_config) RPC
--     Accepts a full JSONB config with all platform reset flags
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. Add reset_config column to seasons (safe, idempotent)
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'seasons'
      AND column_name  = 'reset_config'
  ) THEN
    ALTER TABLE public.seasons ADD COLUMN reset_config jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'seasons'
      AND column_name  = 'theme'
  ) THEN
    ALTER TABLE public.seasons ADD COLUMN theme text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'seasons'
      AND column_name  = 'banner_url'
  ) THEN
    ALTER TABLE public.seasons ADD COLUMN banner_url text;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 2. start_new_season_v2 — full extended reset function
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
  v_season_number   integer;
  v_old_season_id   uuid;
  v_new_season_id   uuid;
  v_cfg             jsonb  := COALESCE(p_config, '{}'::jsonb);
  v_caller_role     text;

  -- helper: extract bool flag from config (defaults to false)
  v_b               boolean;
BEGIN
  -- ── Permission check ─────────────────────────────────────────────
  SELECT role INTO v_caller_role
    FROM public.profiles
   WHERE id = auth.uid()
   LIMIT 1;

  IF v_caller_role NOT IN ('founder', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only founders and super admins can start new seasons');
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Season name is required');
  END IF;

  -- ── Compute next season number ────────────────────────────────────
  SELECT COALESCE(MAX(number), 0) + 1 INTO v_season_number FROM public.seasons;

  -- ── Close active season ───────────────────────────────────────────
  UPDATE public.seasons
     SET status     = 'completed',
         end_date   = now(),
         updated_at = now()
   WHERE status = 'active'
  RETURNING id INTO v_old_season_id;

  -- ═══════════════════════════════════════════════════════════════════
  -- RESET OPERATIONS — each guarded by config flag
  -- pg_safeupdate: all UPDATE/DELETE include WHERE true or real filter
  -- ═══════════════════════════════════════════════════════════════════

  -- ── User Progression ─────────────────────────────────────────────
  IF (v_cfg->>'reset_xp')::boolean IS TRUE OR (v_cfg->>'reset_levels')::boolean IS TRUE THEN
    UPDATE public.profiles
       SET xp         = 0,
           level      = 1,
           updated_at = now()
     WHERE true;

    UPDATE public.player_stats
       SET kills         = 0,
           wins          = 0,
           losses        = 0,
           matches_played = 0,
           updated_at    = now()
     WHERE true;
  END IF;

  IF (v_cfg->>'reset_rank_points')::boolean IS TRUE THEN
    UPDATE public.player_stats
       SET rank_points = 0,
           updated_at  = now()
     WHERE true;
  END IF;

  IF (v_cfg->>'reset_streaks')::boolean IS TRUE THEN
    UPDATE public.player_stats
       SET win_streak    = 0,
           best_streak   = 0,
           updated_at    = now()
     WHERE EXISTS (SELECT 1 FROM player_stats ps WHERE ps.id = player_stats.id);
  END IF;

  -- ── Economy ──────────────────────────────────────────────────────
  IF (v_cfg->>'reset_coins')::boolean IS TRUE OR (v_cfg->>'reset_wallet_balances')::boolean IS TRUE THEN
    -- Log the reset first
    INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    SELECT user_id, -balance, 'season_reset',
           'Season ' || v_season_number || ' reset — ' || trim(p_name)
      FROM public.wallets
     WHERE balance > 0;

    UPDATE public.wallets
       SET balance    = 0,
           updated_at = now()
     WHERE true;
  END IF;

  -- ── Tournaments ──────────────────────────────────────────────────
  IF (v_cfg->>'archive_active_tournaments')::boolean IS TRUE THEN
    UPDATE public.tournaments
       SET status     = 'completed',
           updated_at = now()
     WHERE status IN ('registration_open', 'live', 'ready', 'results_pending');
  END IF;

  IF (v_cfg->>'delete_draft_tournaments')::boolean IS TRUE THEN
    DELETE FROM public.tournaments WHERE status = 'draft' AND true;
  END IF;

  IF (v_cfg->>'reset_room_assignments')::boolean IS TRUE THEN
    DELETE FROM public.room_members WHERE true;
  END IF;

  IF (v_cfg->>'reset_ready_status')::boolean IS TRUE THEN
    UPDATE public.room_members
       SET is_ready  = false,
           updated_at = now()
     WHERE true;
  END IF;

  -- ── Clans ────────────────────────────────────────────────────────
  IF (v_cfg->>'reset_clan_points')::boolean IS TRUE
     OR (v_cfg->>'reset_clan_rankings')::boolean IS TRUE
     OR (v_cfg->>'reset_clan_wins')::boolean IS TRUE
     OR (v_cfg->>'reset_clan_stats')::boolean IS TRUE
  THEN
    UPDATE public.clans
       SET points     = 0,
           wins       = CASE WHEN (v_cfg->>'reset_clan_wins')::boolean THEN 0 ELSE wins END,
           updated_at = now()
     WHERE true;
  END IF;

  -- ── Social ───────────────────────────────────────────────────────
  IF (v_cfg->>'clear_global_chat')::boolean IS TRUE THEN
    DELETE FROM public.chat_messages WHERE channel = 'global' AND true;
  END IF;

  IF (v_cfg->>'clear_tournament_chats')::boolean IS TRUE THEN
    DELETE FROM public.chat_messages WHERE channel != 'global' AND true;
  END IF;

  IF (v_cfg->>'clear_notifications')::boolean IS TRUE THEN
    DELETE FROM public.notifications WHERE true;
  END IF;

  -- ── Cosmetics ────────────────────────────────────────────────────
  IF (v_cfg->>'unequip_avatars')::boolean IS TRUE
     OR (v_cfg->>'unequip_banners')::boolean IS TRUE
     OR (v_cfg->>'unequip_frames')::boolean IS TRUE
  THEN
    UPDATE public.profiles
       SET avatar_url = NULL,
           updated_at = now()
     WHERE (v_cfg->>'unequip_avatars')::boolean IS TRUE AND true;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════
  -- Create the new season record
  -- ═══════════════════════════════════════════════════════════════════
  INSERT INTO public.seasons (
    number, name, description, status, start_date, reset_config
  ) VALUES (
    v_season_number,
    trim(p_name),
    p_description,
    'active',
    now(),
    v_cfg
  )
  RETURNING id INTO v_new_season_id;

  -- ── Broadcast season_changed notification to all users ───────────
  INSERT INTO public.notifications (user_id, title, body, type, metadata)
  SELECT id,
         '🆕 New Season: ' || trim(p_name),
         'A new competitive season has started. Rankings and stats have been reset. Good luck!',
         'announcement',
         jsonb_build_object('season_number', v_season_number, 'season_id', v_new_season_id)
    FROM public.profiles
   WHERE true;

  RETURN jsonb_build_object(
    'success',        true,
    'season_number',  v_season_number,
    'season_id',      v_new_season_id,
    'season_name',    trim(p_name),
    'resets_applied', (
      SELECT COUNT(*) FROM jsonb_each_text(v_cfg) WHERE value = 'true'
    )
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error',   SQLERRM
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Grant execute to authenticated users (RPC checks role internally)
-- ─────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.start_new_season_v2(text, text, jsonb)
  TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 4. Keep old start_new_season for backwards compat — it now delegates
--    to start_new_season_v2 with a translated config
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.start_new_season(
  p_name              text,
  p_number            integer  DEFAULT NULL,
  p_description       text     DEFAULT NULL,
  p_reset_coins       boolean  DEFAULT true,
  p_reset_xp          boolean  DEFAULT true,
  p_reset_stats       boolean  DEFAULT true,
  p_reset_wins        boolean  DEFAULT true,
  p_reset_avatars     boolean  DEFAULT false,
  p_reset_chat        boolean  DEFAULT true,
  p_reset_tournaments boolean  DEFAULT true,
  p_reset_clans       boolean  DEFAULT false
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
      'reset_wins',                 p_reset_wins,
      'reset_clan_points',          p_reset_clans,
      'clear_global_chat',          p_reset_chat,
      'archive_active_tournaments', p_reset_tournaments,
      'unequip_avatars',            p_reset_avatars
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_new_season(text, integer, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean)
  TO authenticated;
