-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/70  Full Platform Wipe
--
-- PURPOSE:
--   Nuclear reset for launch day: deletes all test users, fake data,
--   tournaments, clans, teams, chat, rankings — keeps only admin accounts
--   and platform configuration, then opens a fresh new season.
--
-- PRESERVED:
--   • auth.users / profiles where role IN (super_admin, fondateur, founder, admin)
--   • store_items, missions, achievements, daily_rewards  (catalog)
--   • site_settings, theme_settings, feature_flags, navigation_items  (config)
--   • announcements, news  (editorial content)
--   • seasons history records  (season meta)
--   • schema_migrations  (system)
--
-- DELETED (in FK-safe order):
--   All test users → all their data via cascade
--   All tournaments, matches, clans, teams, rankings, chat, wallets, XP…
--
-- USAGE:
--   SELECT platform_full_wipe('Season 1 — Launch', 'WIPE');
--
-- RETURNS: { success, users_deleted, teams_deleted, clans_deleted,
--            tournaments_deleted, messages_deleted, log[] }
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
  v_caller_role     text;
  v_keep_ids        uuid[];
  v_log             text[]  := ARRAY[]::text[];
  v_rows            bigint  := 0;

  -- Counts returned to frontend
  v_users_del       bigint  := 0;
  v_teams_del       bigint  := 0;
  v_clans_del       bigint  := 0;
  v_tournaments_del bigint  := 0;
  v_matches_del     bigint  := 0;
  v_messages_del    bigint  := 0;
  v_notifications_del bigint := 0;
  v_wallets_del     bigint  := 0;
  v_stats_del       bigint  := 0;

  v_new_season_id   uuid;
  v_new_season_no   integer;
BEGIN

  -- ── 1. Confirm token ─────────────────────────────────────────────────
  IF p_confirm_wipe IS DISTINCT FROM 'WIPE' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'Confirmation token must be exactly: WIPE'
    );
  END IF;

  -- ── 2. Permission: super_admin / fondateur / founder only ─────────────
  SELECT role INTO v_caller_role
  FROM   public.profiles
  WHERE  id = auth.uid()
  LIMIT  1;

  IF v_caller_role NOT IN ('super_admin', 'fondateur', 'founder') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   format('Permission denied: role is "%s". Requires super_admin, fondateur, or founder.',
                        COALESCE(v_caller_role, 'NULL'))
    );
  END IF;

  -- ── 2b. Schema safety (idempotent) ───────────────────────────────────
  ALTER TABLE public.seasons
    ADD COLUMN IF NOT EXISTS updated_at  timestamptz DEFAULT now(),
    ADD COLUMN IF NOT EXISTS reset_config jsonb       DEFAULT '{}'::jsonb;

  -- ── 3. Build admin whitelist ──────────────────────────────────────────
  SELECT ARRAY_AGG(id) INTO v_keep_ids
  FROM   public.profiles
  WHERE  role IN ('super_admin', 'fondateur', 'founder', 'admin');

  -- Always keep the caller even if their role is unexpected
  v_keep_ids := COALESCE(v_keep_ids, ARRAY[]::uuid[]);
  IF auth.uid() IS NOT NULL AND NOT (auth.uid() = ANY(v_keep_ids)) THEN
    v_keep_ids := v_keep_ids || auth.uid();
  END IF;

  v_log := array_append(v_log, format('[INIT] Preserving %s admin account(s)', array_length(v_keep_ids, 1)));

  -- ══════════════════════════════════════════════════════════════════════
  -- DELETIONS — each block in its own EXCEPTION so a missing table
  -- never aborts the entire wipe.  Order: deepest dependencies first.
  -- ══════════════════════════════════════════════════════════════════════

  -- ── A. Story / Social leaf data ───────────────────────────────────────
  BEGIN
    DELETE FROM public.story_reactions WHERE true;
    DELETE FROM public.story_views     WHERE true;
    DELETE FROM public.stories         WHERE true;
    v_log := array_append(v_log, '[SOCIAL] stories cleared ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SOCIAL] stories skipped: %s', SQLERRM));
  END;

  BEGIN
    DELETE FROM public.user_presence WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.user_mutes    WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    v_log := array_append(v_log, '[SOCIAL] presence/mutes cleared ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  -- ── B. Direct messages ────────────────────────────────────────────────
  BEGIN
    DELETE FROM public.private_messages      WHERE true;
    DELETE FROM public.private_conversations WHERE true;
    v_log := array_append(v_log, '[DM] private messages cleared ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  -- ── C. Tournament match data (children of matches/tournaments) ─────────
  BEGIN
    DELETE FROM public.match_participants WHERE true;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_matches_del := v_matches_del + v_rows;
    v_log := array_append(v_log, format('[MATCHES] %s match_participants deleted ✓', v_rows));
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  BEGIN
    DELETE FROM public.match_results      WHERE true;
    DELETE FROM public.match_verifications WHERE true;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_matches_del := v_matches_del + v_rows;
    v_log := array_append(v_log, '[MATCHES] match_results / match_verifications deleted ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  BEGIN
    DELETE FROM public.room_members  WHERE true;
    DELETE FROM public.room_messages WHERE true;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_messages_del := v_messages_del + v_rows;
    v_log := array_append(v_log, '[ROOMS] room members and messages deleted ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  BEGIN
    DELETE FROM public.tournament_participants WHERE true;
    DELETE FROM public.team_tournaments        WHERE true;
    DELETE FROM public.roster_snapshots        WHERE true;
    v_log := array_append(v_log, '[TOURNAMENTS] participant records deleted ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  BEGIN
    DELETE FROM public.matches WHERE true;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_matches_del := v_matches_del + v_rows;
    v_log := array_append(v_log, format('[MATCHES] %s matches deleted ✓', v_rows));
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  -- ── D. Clan war data ──────────────────────────────────────────────────
  BEGIN
    DELETE FROM public.clan_war_contributions WHERE true;
    DELETE FROM public.clan_wars              WHERE true;
    v_log := array_append(v_log, '[CLANS] clan wars deleted ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  -- ── E. Clan member data ───────────────────────────────────────────────
  BEGIN
    DELETE FROM public.clan_applications WHERE true;
    DELETE FROM public.clan_messages     WHERE true;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_messages_del := v_messages_del + v_rows;
    DELETE FROM public.clan_members      WHERE true;
    v_log := array_append(v_log, '[CLANS] clan applications/messages/members deleted ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  -- ── F. Team member data ───────────────────────────────────────────────
  BEGIN
    DELETE FROM public.team_invites WHERE true;
    DELETE FROM public.team_members WHERE true;
    v_log := array_append(v_log, '[TEAMS] team invites/members deleted ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  -- ── G. Tournament-level records ───────────────────────────────────────
  BEGIN
    DELETE FROM public.tournaments WHERE true;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_tournaments_del := v_rows;
    v_log := array_append(v_log, format('[TOURNAMENTS] %s tournaments deleted ✓', v_rows));
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  -- ── H. Clans (top-level) ──────────────────────────────────────────────
  BEGIN
    DELETE FROM public.clans WHERE true;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_clans_del := v_rows;
    v_log := array_append(v_log, format('[CLANS] %s clans deleted ✓', v_rows));
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  -- ── I. Teams (top-level) ──────────────────────────────────────────────
  BEGIN
    DELETE FROM public.teams WHERE true;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_teams_del := v_rows;
    v_log := array_append(v_log, format('[TEAMS] %s teams deleted ✓', v_rows));
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  -- ── J. Chat messages ──────────────────────────────────────────────────
  BEGIN
    DELETE FROM public.chat_messages WHERE true;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_messages_del := v_messages_del + v_rows;
    v_log := array_append(v_log, format('[CHAT] %s chat messages deleted ✓', v_rows));
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  -- ── K. Season snapshots (test data) ───────────────────────────────────
  BEGIN
    DELETE FROM public.season_snapshots WHERE true;
    v_log := array_append(v_log, '[SEASONS] season snapshots cleared ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  -- ── L. Admin applications & votes (test applications) ─────────────────
  BEGIN
    DELETE FROM public.admin_application_votes  WHERE voter_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.admin_application_notes  WHERE author_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.admin_application_audit  WHERE actor_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.admin_candidate_scores   WHERE true;
    DELETE FROM public.admin_applications       WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    v_log := array_append(v_log, '[ADMIN] admin applications cleared ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  -- ── M. Reports / Moderation ───────────────────────────────────────────
  BEGIN
    DELETE FROM public.report_actions   WHERE true;
    DELETE FROM public.reports          WHERE true;
    DELETE FROM public.moderation_reviews WHERE true;
    DELETE FROM public.user_warnings    WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.user_reputation_events WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.fair_play_events WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    v_log := array_append(v_log, '[MODERATION] reports and moderation data cleared ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  -- ── N. Support tickets ────────────────────────────────────────────────
  BEGIN
    DELETE FROM public.support_messages WHERE sender_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.site_schedule    WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.support_tickets  WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    v_log := array_append(v_log, '[SUPPORT] support tickets cleared ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  -- ── O. Community data ────────────────────────────────────────────────
  BEGIN
    DELETE FROM public.bug_report_rewards WHERE true;
    DELETE FROM public.bug_reports        WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.feature_votes      WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.feature_comments   WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.feature_requests   WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    v_log := array_append(v_log, '[COMMUNITY] feature requests / bug reports cleared ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  -- ── P. User progression & economy ────────────────────────────────────
  BEGIN
    DELETE FROM public.user_achievements WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.user_missions     WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.user_mission_progress WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.user_daily_claims WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.user_season_pass  WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    v_log := array_append(v_log, '[PROGRESSION] user missions/achievements/pass cleared ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  BEGIN
    DELETE FROM public.gift_transactions WHERE
      sender_id   NOT IN (SELECT unnest(v_keep_ids))
      OR receiver_id NOT IN (SELECT unnest(v_keep_ids));
    v_log := array_append(v_log, '[ECONOMY] gift transactions cleared ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  BEGIN
    DELETE FROM public.referral_uses WHERE referred_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.referral_codes WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    v_log := array_append(v_log, '[REFERRAL] referral data cleared ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  -- ── Q. Notifications ─────────────────────────────────────────────────
  BEGIN
    DELETE FROM public.notification_email_logs WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.email_logs              WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.admin_messages          WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.notifications           WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.notification_preferences WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_notifications_del := v_rows;
    v_log := array_append(v_log, format('[NOTIFICATIONS] cleared ✓'));
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  -- ── R. Announcement reads ─────────────────────────────────────────────
  BEGIN
    DELETE FROM public.announcement_reads WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    v_log := array_append(v_log, '[ANNOUNCEMENTS] reads cleared ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  -- ── S. User items (inventory) ─────────────────────────────────────────
  BEGIN
    DELETE FROM public.user_items WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    v_log := array_append(v_log, '[ITEMS] user inventories cleared ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  -- ── T. Wallets & transactions ─────────────────────────────────────────
  BEGIN
    DELETE FROM public.wallet_transactions WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    DELETE FROM public.wallets             WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_wallets_del := v_rows;
    v_log := array_append(v_log, format('[WALLETS] %s non-admin wallets deleted ✓', v_rows));
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  -- ── U. Player stats ───────────────────────────────────────────────────
  BEGIN
    DELETE FROM public.player_stats WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_stats_del := v_rows;
    v_log := array_append(v_log, format('[STATS] %s non-admin stat rows deleted ✓', v_rows));
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  -- ── V. Deleted accounts table ─────────────────────────────────────────
  BEGIN
    DELETE FROM public.reapproval_requests WHERE true;
    DELETE FROM public.deleted_accounts    WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    v_log := array_append(v_log, '[ACCOUNTS] deleted_accounts cleared ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  -- ── W. Admin logs for non-admins ──────────────────────────────────────
  BEGIN
    DELETE FROM public.admin_logs WHERE user_id NOT IN (SELECT unnest(v_keep_ids));
    v_log := array_append(v_log, '[ADMIN] admin_logs for non-admins cleared ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[SKIP] %s (SQLSTATE %s)', SQLERRM, SQLSTATE));
  END;

  -- ── X. Profiles — nullify team/clan FKs to avoid constraint issues ─────
  BEGIN
    UPDATE public.profiles SET team_id = NULL WHERE team_id IS NOT NULL;
  EXCEPTION WHEN undefined_column THEN NULL; END;

  -- ── Y. Auth users (non-admins) — CASCADE deletes their profiles ────────
  BEGIN
    SELECT COUNT(*) INTO v_users_del
    FROM   auth.users
    WHERE  id NOT IN (SELECT unnest(v_keep_ids));

    DELETE FROM auth.users WHERE id NOT IN (SELECT unnest(v_keep_ids));

    v_log := array_append(v_log, format('[USERS] %s users deleted from auth.users ✓', v_users_del));
  EXCEPTION WHEN OTHERS THEN
    -- Fallback: delete profiles directly if auth.users is not accessible
    BEGIN
      SELECT COUNT(*) INTO v_users_del
      FROM   public.profiles
      WHERE  id NOT IN (SELECT unnest(v_keep_ids));

      DELETE FROM public.profiles WHERE id NOT IN (SELECT unnest(v_keep_ids));
      v_log := array_append(v_log, format('[USERS] %s profiles deleted (auth.users inaccessible: %s) ✓', v_users_del, SQLERRM));
    EXCEPTION WHEN OTHERS THEN
      v_log := array_append(v_log, format('[USERS] FAILED: %s', SQLERRM));
    END;
  END;

  -- ══════════════════════════════════════════════════════════════════════
  -- RESET ADMIN DATA
  -- ══════════════════════════════════════════════════════════════════════

  -- Reset admin player stats
  BEGIN
    UPDATE public.player_stats SET
      kills = 0, wins = 0, losses = 0, tournaments_played = 0,
      top3_finishes = 0, total_points = 0, kd_ratio = 0, mvp_count = 0,
      win_streak = 0, updated_at = now()
    WHERE user_id = ANY(v_keep_ids);
    v_log := array_append(v_log, '[RESET] admin player_stats zeroed ✓');
  EXCEPTION WHEN OTHERS THEN
    -- Try without win_streak if column missing
    BEGIN
      UPDATE public.player_stats SET
        kills = 0, wins = 0, losses = 0, tournaments_played = 0,
        top3_finishes = 0, total_points = 0, kd_ratio = 0, mvp_count = 0,
        updated_at = now()
      WHERE user_id = ANY(v_keep_ids);
      v_log := array_append(v_log, '[RESET] admin player_stats zeroed (compat) ✓');
    EXCEPTION WHEN OTHERS THEN
      v_log := array_append(v_log, format('[RESET] player_stats reset skipped: %s', SQLERRM));
    END;
  END;

  -- Reset admin wallets
  BEGIN
    UPDATE public.wallets SET balance = 0, updated_at = now()
    WHERE user_id = ANY(v_keep_ids);
    v_log := array_append(v_log, '[RESET] admin wallets zeroed ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[RESET] wallet reset skipped: %s', SQLERRM));
  END;

  -- Reset admin XP/level
  BEGIN
    UPDATE public.profiles SET xp = 0, level = 1, updated_at = now()
    WHERE id = ANY(v_keep_ids);
    v_log := array_append(v_log, '[RESET] admin xp/level zeroed ✓');
  EXCEPTION WHEN OTHERS THEN
    v_log := array_append(v_log, format('[RESET] profile xp reset skipped: %s', SQLERRM));
  END;

  -- ══════════════════════════════════════════════════════════════════════
  -- CREATE NEW SEASON
  -- ══════════════════════════════════════════════════════════════════════

  UPDATE public.seasons
     SET status = 'completed', end_date = now(), updated_at = now()
   WHERE status = 'active';

  SELECT COALESCE(MAX(number), 0) + 1 INTO v_new_season_no FROM public.seasons;

  INSERT INTO public.seasons (
    number, name, status, start_date, updated_at,
    reset_config
  ) VALUES (
    v_new_season_no,
    COALESCE(trim(p_new_season_name), 'Season ' || v_new_season_no),
    'active',
    now(),
    now(),
    jsonb_build_object(
      'wipe_mode',         true,
      'users_deleted',     v_users_del,
      'teams_deleted',     v_teams_del,
      'clans_deleted',     v_clans_del,
      'tournaments_deleted', v_tournaments_del
    )
  )
  RETURNING id INTO v_new_season_id;

  v_log := array_append(v_log, format('[SEASON] Season %s "%s" created ✓', v_new_season_no, p_new_season_name));

  -- Audit log (non-fatal)
  BEGIN
    INSERT INTO public.season_audit_log (season_id, action, actor_id, details)
    VALUES (v_new_season_id, 'platform_wipe', auth.uid(),
      jsonb_build_object(
        'season_name',     p_new_season_name,
        'season_number',   v_new_season_no,
        'users_deleted',   v_users_del,
        'teams_deleted',   v_teams_del,
        'clans_deleted',   v_clans_del,
        'tournaments_deleted', v_tournaments_del,
        'messages_deleted', v_messages_del,
        'performed_by',    v_caller_role
      ));
  EXCEPTION WHEN OTHERS THEN NULL; END;

  v_log := array_append(v_log, '[DONE] Platform wipe complete ✓ Platform is clean for launch.');

  RETURN jsonb_build_object(
    'success',            true,
    'season_number',      v_new_season_no,
    'season_id',          v_new_season_id,
    'season_name',        p_new_season_name,
    'users_deleted',      v_users_del,
    'teams_deleted',      v_teams_del,
    'clans_deleted',      v_clans_del,
    'tournaments_deleted', v_tournaments_del,
    'matches_deleted',    v_matches_del,
    'messages_deleted',   v_messages_del,
    'wallets_deleted',    v_wallets_del,
    'stats_deleted',      v_stats_del,
    'log',                to_json(v_log)
  );

EXCEPTION WHEN OTHERS THEN
  v_log := array_append(v_log, format('[FATAL] %s  SQLSTATE: %s', SQLERRM, SQLSTATE));
  RETURN jsonb_build_object(
    'success', false,
    'error',   SQLERRM,
    'detail',  SQLSTATE,
    'log',     to_json(v_log)
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- Grant: authenticated role (permission guard is inside the function)
-- ─────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.platform_full_wipe(text, text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- Verify
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'public' AND p.proname = 'platform_full_wipe'
  ) THEN
    RAISE EXCEPTION 'platform_full_wipe was not created!';
  END IF;
  RAISE NOTICE 'OK: sql/70 applied — platform_full_wipe is ready.';
  RAISE NOTICE '    Call: SELECT platform_full_wipe(''Season 1 — Launch'', ''WIPE'');';
END;
$$;
