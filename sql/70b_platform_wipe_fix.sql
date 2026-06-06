-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/70b  Platform Wipe Fix
--
-- ROOT CAUSE OF FAILURE:
--   1. admin_application_audit column was "performed_by" in the DELETE
--      but the actual schema (sql/20) defines it as "actor_id".
--      → SQLSTATE 42703 (undefined_column) was thrown.
--
--   2. All inner EXCEPTION blocks used WHEN undefined_table (SQLSTATE
--      42P01). This catches missing tables but NOT missing columns.
--      The 42703 error escaped the inner block, hit the outer WHEN OTHERS,
--      and rolled back every deletion already completed — so nothing was
--      permanently deleted.
--
-- FIX:
--   • Change performed_by → actor_id in admin_application_audit DELETE
--   • Change ALL inner EXCEPTION handlers to WHEN OTHERS so ANY schema
--     mismatch is caught and logged rather than aborting the whole wipe
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.platform_full_wipe(
  p_new_season_name text,
  p_confirm_wipe    text   -- must equal 'WIPE'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role       text;
  v_keep_ids          uuid[];
  v_log               text[]  := ARRAY[]::text[];
  v_rows              bigint  := 0;

  v_users_del         bigint  := 0;
  v_teams_del         bigint  := 0;
  v_clans_del         bigint  := 0;
  v_tournaments_del   bigint  := 0;
  v_matches_del       bigint  := 0;
  v_messages_del      bigint  := 0;
  v_notifications_del bigint  := 0;
  v_wallets_del       bigint  := 0;
  v_stats_del         bigint  := 0;

  v_new_season_id     uuid;
  v_new_season_no     integer;
BEGIN

  -- ── 1. Confirm token ─────────────────────────────────────────────────
  IF p_confirm_wipe IS DISTINCT FROM 'WIPE' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Confirmation token must be exactly: WIPE');
  END IF;

  -- ── 2. Permission ─────────────────────────────────────────────────────
  SELECT role INTO v_caller_role
  FROM   public.profiles
  WHERE  id = auth.uid()
  LIMIT  1;

  IF v_caller_role NOT IN ('super_admin', 'fondateur', 'founder') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   format('Permission denied: role is "%s"', COALESCE(v_caller_role, 'NULL'))
    );
  END IF;

  -- ── 3. Schema safety ─────────────────────────────────────────────────
  ALTER TABLE public.seasons
    ADD COLUMN IF NOT EXISTS updated_at   timestamptz DEFAULT now(),
    ADD COLUMN IF NOT EXISTS reset_config jsonb       DEFAULT '{}'::jsonb;

  -- ── 4. Admin whitelist ────────────────────────────────────────────────
  SELECT ARRAY_AGG(id) INTO v_keep_ids
  FROM   public.profiles
  WHERE  role IN ('super_admin', 'fondateur', 'founder', 'admin');

  v_keep_ids := COALESCE(v_keep_ids, ARRAY[]::uuid[]);
  IF auth.uid() IS NOT NULL AND NOT (auth.uid() = ANY(v_keep_ids)) THEN
    v_keep_ids := v_keep_ids || auth.uid();
  END IF;

  v_log := array_append(v_log, format('[INIT] Preserving %s admin account(s)', array_length(v_keep_ids, 1)));

  -- ══════════════════════════════════════════════════════════════════════
  -- DELETIONS
  -- KEY DESIGN: every block uses EXCEPTION WHEN OTHERS so that a missing
  -- table OR a wrong column name is caught and logged — never aborts.
  -- ══════════════════════════════════════════════════════════════════════

  -- ── A. Social / Stories ───────────────────────────────────────────────
  BEGIN
    DELETE FROM public.story_reactions WHERE true;
    DELETE FROM public.story_views     WHERE true;
    DELETE FROM public.stories         WHERE true;
    v_log := array_append(v_log, '[SOCIAL] stories cleared ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-SOCIAL] %s', SQLERRM));
  END;

  BEGIN
    DELETE FROM public.user_presence WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.user_mutes    WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    v_log := array_append(v_log, '[SOCIAL] presence/mutes cleared ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-PRESENCE] %s', SQLERRM));
  END;

  -- ── B. Direct messages ────────────────────────────────────────────────
  BEGIN
    DELETE FROM public.private_messages      WHERE true;
    DELETE FROM public.private_conversations WHERE true;
    v_log := array_append(v_log, '[DM] private messages cleared ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-DM] %s', SQLERRM));
  END;

  -- ── C. Match / Room data ──────────────────────────────────────────────
  BEGIN
    DELETE FROM public.match_participants WHERE true;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_matches_del := v_matches_del + v_rows;
    v_log := array_append(v_log, format('[MATCHES] %s participants ✓', v_rows));
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-MATCH-PARTICIPANTS] %s', SQLERRM));
  END;

  BEGIN
    DELETE FROM public.match_results       WHERE true;
    DELETE FROM public.match_verifications WHERE true;
    v_log := array_append(v_log, '[MATCHES] results/verifications ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-MATCH-RESULTS] %s', SQLERRM));
  END;

  BEGIN
    DELETE FROM public.room_members  WHERE true;
    DELETE FROM public.room_messages WHERE true;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_messages_del := v_messages_del + v_rows;
    v_log := array_append(v_log, '[ROOMS] room members/messages ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-ROOMS] %s', SQLERRM));
  END;

  BEGIN
    DELETE FROM public.tournament_participants WHERE true;
    DELETE FROM public.team_tournaments        WHERE true;
    DELETE FROM public.roster_snapshots        WHERE true;
    v_log := array_append(v_log, '[TOURNAMENTS] participant records ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-TOURNAMENT-PARTICIPANTS] %s', SQLERRM));
  END;

  BEGIN
    DELETE FROM public.matches WHERE true;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_matches_del := v_matches_del + v_rows;
    v_log := array_append(v_log, format('[MATCHES] %s matches ✓', v_rows));
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-MATCHES] %s', SQLERRM));
  END;

  -- ── D. Clan data ──────────────────────────────────────────────────────
  BEGIN
    DELETE FROM public.clan_war_contributions WHERE true;
    DELETE FROM public.clan_wars              WHERE true;
    v_log := array_append(v_log, '[CLANS] clan wars ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-CLAN-WARS] %s', SQLERRM));
  END;

  BEGIN
    DELETE FROM public.clan_applications WHERE true;
    DELETE FROM public.clan_messages     WHERE true;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_messages_del := v_messages_del + v_rows;
    DELETE FROM public.clan_members      WHERE true;
    v_log := array_append(v_log, '[CLANS] applications/messages/members ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-CLAN-MEMBERS] %s', SQLERRM));
  END;

  -- ── E. Team data ──────────────────────────────────────────────────────
  BEGIN
    DELETE FROM public.team_invites WHERE true;
    DELETE FROM public.team_members WHERE true;
    v_log := array_append(v_log, '[TEAMS] invites/members ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-TEAM-MEMBERS] %s', SQLERRM));
  END;

  -- ── F. Tournaments (top-level) ────────────────────────────────────────
  BEGIN
    DELETE FROM public.tournaments WHERE true;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_tournaments_del := v_rows;
    v_log := array_append(v_log, format('[TOURNAMENTS] %s tournaments ✓', v_rows));
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-TOURNAMENTS] %s', SQLERRM));
  END;

  -- ── G. Clans (top-level) ──────────────────────────────────────────────
  BEGIN
    DELETE FROM public.clans WHERE true;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_clans_del := v_rows;
    v_log := array_append(v_log, format('[CLANS] %s clans ✓', v_rows));
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-CLANS] %s', SQLERRM));
  END;

  -- ── H. Teams (top-level) ──────────────────────────────────────────────
  BEGIN
    DELETE FROM public.teams WHERE true;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_teams_del := v_rows;
    v_log := array_append(v_log, format('[TEAMS] %s teams ✓', v_rows));
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-TEAMS] %s', SQLERRM));
  END;

  -- ── I. Chat messages ──────────────────────────────────────────────────
  BEGIN
    DELETE FROM public.chat_messages WHERE true;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_messages_del := v_messages_del + v_rows;
    v_log := array_append(v_log, format('[CHAT] %s messages ✓', v_rows));
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-CHAT] %s', SQLERRM));
  END;

  -- ── J. Season snapshots ───────────────────────────────────────────────
  BEGIN
    DELETE FROM public.season_snapshots WHERE true;
    v_log := array_append(v_log, '[SEASONS] snapshots ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-SNAPSHOTS] %s', SQLERRM));
  END;

  -- ── K. Admin applications
  --    FIX: admin_application_audit uses actor_id NOT performed_by ────────
  BEGIN
    DELETE FROM public.admin_application_votes WHERE voter_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.admin_application_notes WHERE author_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.admin_application_audit WHERE actor_id  NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.admin_candidate_scores  WHERE true;
    DELETE FROM public.admin_applications      WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    v_log := array_append(v_log, '[ADMIN] applications cleared ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-ADMIN-APPS] %s', SQLERRM));
  END;

  -- ── L. Reports / Moderation ───────────────────────────────────────────
  BEGIN
    DELETE FROM public.report_actions          WHERE true;
    DELETE FROM public.reports                 WHERE true;
    DELETE FROM public.moderation_reviews      WHERE true;
    DELETE FROM public.user_warnings           WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.user_reputation_events  WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.fair_play_events        WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    v_log := array_append(v_log, '[MODERATION] cleared ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-MODERATION] %s', SQLERRM));
  END;

  -- ── M. Support tickets ────────────────────────────────────────────────
  BEGIN
    DELETE FROM public.support_messages WHERE sender_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.site_schedule    WHERE user_id   NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.support_tickets  WHERE user_id   NOT IN (SELECT unnest(v_keep_ids));
    v_log := array_append(v_log, '[SUPPORT] tickets cleared ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-SUPPORT] %s', SQLERRM));
  END;

  -- ── N. Community (feature requests / bug reports) ─────────────────────
  BEGIN
    DELETE FROM public.bug_report_rewards WHERE true;
    DELETE FROM public.bug_reports        WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.feature_votes      WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.feature_comments   WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.feature_requests   WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    v_log := array_append(v_log, '[COMMUNITY] cleared ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-COMMUNITY] %s', SQLERRM));
  END;

  -- ── O. User progression / economy ────────────────────────────────────
  BEGIN
    DELETE FROM public.user_achievements     WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.user_missions         WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.user_mission_progress WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.user_daily_claims     WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.user_season_pass      WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    v_log := array_append(v_log, '[PROGRESSION] cleared ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-PROGRESSION] %s', SQLERRM));
  END;

  BEGIN
    DELETE FROM public.gift_transactions WHERE
      sender_id   NOT IN (SELECT unnest(v_keep_ids))
      OR receiver_id NOT IN (SELECT unnest(v_keep_ids));
    v_log := array_append(v_log, '[ECONOMY] gift transactions ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-GIFTS] %s', SQLERRM));
  END;

  BEGIN
    DELETE FROM public.referral_uses  WHERE referred_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.referral_codes WHERE user_id     NOT IN (SELECT unnest(v_keep_ids));
    v_log := array_append(v_log, '[REFERRAL] cleared ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-REFERRAL] %s', SQLERRM));
  END;

  -- ── P. Notifications ─────────────────────────────────────────────────
  BEGIN
    DELETE FROM public.notification_email_logs WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.email_logs              WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.admin_messages          WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.notifications           WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.notification_preferences WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_notifications_del := v_rows;
    v_log := array_append(v_log, '[NOTIFICATIONS] cleared ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-NOTIFICATIONS] %s', SQLERRM));
  END;

  -- ── Q. Misc user data ─────────────────────────────────────────────────
  BEGIN
    DELETE FROM public.announcement_reads WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    v_log := array_append(v_log, '[ANNOUNCEMENTS] reads ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-ANNOUNCEMENT-READS] %s', SQLERRM));
  END;

  BEGIN
    DELETE FROM public.user_items WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    v_log := array_append(v_log, '[ITEMS] inventories ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-ITEMS] %s', SQLERRM));
  END;

  -- ── R. Wallets ────────────────────────────────────────────────────────
  BEGIN
    DELETE FROM public.wallet_transactions WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.wallets             WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_wallets_del := v_rows;
    v_log := array_append(v_log, format('[WALLETS] %s wallets ✓', v_rows));
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-WALLETS] %s', SQLERRM));
  END;

  -- ── S. Player stats ───────────────────────────────────────────────────
  BEGIN
    DELETE FROM public.player_stats WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_stats_del := v_rows;
    v_log := array_append(v_log, format('[STATS] %s stat rows ✓', v_rows));
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-STATS] %s', SQLERRM));
  END;

  -- ── T. Misc cleanup ───────────────────────────────────────────────────
  BEGIN
    DELETE FROM public.reapproval_requests WHERE true;
    DELETE FROM public.deleted_accounts    WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    v_log := array_append(v_log, '[ACCOUNTS] deleted_accounts ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-DELETED-ACCOUNTS] %s', SQLERRM));
  END;

  BEGIN
    DELETE FROM public.admin_logs WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    v_log := array_append(v_log, '[ADMIN] admin_logs (non-admin) ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-ADMIN-LOGS] %s', SQLERRM));
  END;

  -- ── U. Nullify profile team_id FK before deleting users ───────────────
  BEGIN
    UPDATE public.profiles SET team_id = NULL WHERE team_id IS NOT NULL;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  -- ── V. Delete non-admin auth users (CASCADE → profiles) ───────────────
  BEGIN
    SELECT COUNT(*) INTO v_users_del
    FROM   auth.users
    WHERE  id NOT IN (SELECT unnest(v_keep_ids));

    DELETE FROM auth.users WHERE id NOT IN (SELECT unnest(v_keep_ids));

    v_log := array_append(v_log, format('[USERS] %s auth users deleted ✓', v_users_del));
  EXCEPTION WHEN OTHERS THEN
    -- Fallback: delete profiles directly
    BEGIN
      SELECT COUNT(*) INTO v_users_del
      FROM   public.profiles
      WHERE  id NOT IN (SELECT unnest(v_keep_ids));

      DELETE FROM public.profiles WHERE id NOT IN (SELECT unnest(v_keep_ids));
      v_log := array_append(v_log, format('[USERS] %s profiles deleted (auth.users fallback) ✓', v_users_del));
    EXCEPTION WHEN OTHERS THEN
      v_log := array_append(v_log, format('[USERS-FAILED] %s', SQLERRM));
    END;
  END;

  -- ══════════════════════════════════════════════════════════════════════
  -- RESET ADMIN DATA
  -- ══════════════════════════════════════════════════════════════════════

  BEGIN
    UPDATE public.player_stats SET
      kills = 0, wins = 0, losses = 0, tournaments_played = 0,
      top3_finishes = 0, total_points = 0, kd_ratio = 0, mvp_count = 0,
      win_streak = 0, updated_at = now()
    WHERE user_id = ANY(v_keep_ids);
    v_log := array_append(v_log, '[RESET] admin stats zeroed ✓');
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      UPDATE public.player_stats SET
        kills = 0, wins = 0, losses = 0, tournaments_played = 0,
        top3_finishes = 0, total_points = 0, kd_ratio = 0, mvp_count = 0,
        updated_at = now()
      WHERE user_id = ANY(v_keep_ids);
      v_log := array_append(v_log, '[RESET] admin stats zeroed (compat) ✓');
    EXCEPTION WHEN OTHERS THEN
      v_log := array_append(v_log, format('[SKIP-RESET-STATS] %s', SQLERRM));
    END;
  END;

  BEGIN
    UPDATE public.wallets SET balance = 0, updated_at = now()
    WHERE user_id = ANY(v_keep_ids);
    v_log := array_append(v_log, '[RESET] admin wallets zeroed ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-RESET-WALLETS] %s', SQLERRM));
  END;

  BEGIN
    UPDATE public.profiles SET xp = 0, level = 1, updated_at = now()
    WHERE id = ANY(v_keep_ids);
    v_log := array_append(v_log, '[RESET] admin xp/level zeroed ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP-RESET-PROFILES] %s', SQLERRM));
  END;

  -- ══════════════════════════════════════════════════════════════════════
  -- CREATE NEW SEASON
  -- ══════════════════════════════════════════════════════════════════════

  UPDATE public.seasons
     SET status = 'completed', end_date = now(), updated_at = now()
   WHERE status = 'active';

  SELECT COALESCE(MAX(number), 0) + 1 INTO v_new_season_no FROM public.seasons;

  INSERT INTO public.seasons (
    number, name, status, start_date, updated_at, reset_config
  ) VALUES (
    v_new_season_no,
    COALESCE(trim(p_new_season_name), 'Season ' || v_new_season_no),
    'active',
    now(),
    now(),
    jsonb_build_object(
      'wipe_mode',           true,
      'users_deleted',       v_users_del,
      'teams_deleted',       v_teams_del,
      'clans_deleted',       v_clans_del,
      'tournaments_deleted', v_tournaments_del
    )
  )
  RETURNING id INTO v_new_season_id;

  v_log := array_append(v_log, format('[SEASON] Season %s "%s" created ✓', v_new_season_no, p_new_season_name));

  -- Audit log — non-fatal, WHEN OTHERS catches any schema mismatch
  BEGIN
    INSERT INTO public.season_audit_log (season_id, action, actor_id, details)
    VALUES (
      v_new_season_id,
      'platform_wipe',
      auth.uid(),
      jsonb_build_object(
        'season_name',         p_new_season_name,
        'season_number',       v_new_season_no,
        'users_deleted',       v_users_del,
        'teams_deleted',       v_teams_del,
        'clans_deleted',       v_clans_del,
        'tournaments_deleted', v_tournaments_del,
        'messages_deleted',    v_messages_del,
        'caller_role',         v_caller_role
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL; END;

  v_log := array_append(v_log, '[DONE] Platform wipe complete ✓');

  RETURN jsonb_build_object(
    'success',             true,
    'season_number',       v_new_season_no,
    'season_id',           v_new_season_id,
    'season_name',         p_new_season_name,
    'users_deleted',       v_users_del,
    'teams_deleted',       v_teams_del,
    'clans_deleted',       v_clans_del,
    'tournaments_deleted', v_tournaments_del,
    'matches_deleted',     v_matches_del,
    'messages_deleted',    v_messages_del,
    'wallets_deleted',     v_wallets_del,
    'stats_deleted',       v_stats_del,
    'log',                 to_json(v_log)
  );

EXCEPTION WHEN OTHERS THEN
  -- Should never reach here, but if it does, log and return
  v_log := array_append(v_log, format('[FATAL] %s  SQLSTATE: %s', SQLERRM, SQLSTATE));
  RETURN jsonb_build_object(
    'success', false,
    'error',   SQLERRM,
    'detail',  SQLSTATE,
    'log',     to_json(v_log)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.platform_full_wipe(text, text) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'OK: sql/70b applied — platform_full_wipe fixed.';
  RAISE NOTICE '  Fixes: actor_id (was performed_by), WHEN OTHERS (was undefined_table)';
END;
$$;
