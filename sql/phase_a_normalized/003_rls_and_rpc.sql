-- CipherPool Phase A normalized migration set
-- 003_rls_and_rpc.sql
-- Purpose: RLS and RPC compatibility for current frontend calls.

DO $guarded_is_role$
BEGIN
  IF to_regprocedure('public.is_role(text[])') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.is_role(p_roles text[])
      RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $body$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = ANY(p_roles)
  );
$body$;
    $fn$;
  END IF;
END;
$guarded_is_role$;

DO $guarded_is_admin$
BEGIN
  IF to_regprocedure('public.is_admin()') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.is_admin()
      RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $body$
  SELECT public.is_role(ARRAY['admin','super_admin']);
$body$;
    $fn$;
  END IF;
END;
$guarded_is_admin$;

-- Existing Supabase compatibility preflight.
-- 001 and 002 create normalized tables, but old production tables may already
-- exist with partial schemas. This block checks each table before adding
-- compatibility columns used later by policies, views, and RPCs in this file.
DO $preflight$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT * FROM (VALUES
      ('profiles', 'role', 'text NOT NULL DEFAULT ''user'''),
      ('profiles', 'username', 'text'),
      ('profiles', 'avatar_url', 'text'),
      ('profiles', 'level', 'integer NOT NULL DEFAULT 1'),
      ('profiles', 'fair_play_score', 'integer NOT NULL DEFAULT 100'),
      ('profiles', 'banned_until', 'timestamptz'),
      ('profiles', 'banned_by', 'uuid'),
      ('profiles', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('profiles', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('wallets', 'user_id', 'uuid'),
      ('wallets', 'balance', 'integer NOT NULL DEFAULT 0'),
      ('wallets', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('wallets', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('wallet_transactions', 'user_id', 'uuid'),
      ('wallet_transactions', 'amount', 'integer NOT NULL DEFAULT 0'),
      ('wallet_transactions', 'type', 'text NOT NULL DEFAULT ''credit'''),
      ('wallet_transactions', 'reason', 'text NOT NULL DEFAULT '''''),
      ('wallet_transactions', 'reference', 'text'),
      ('wallet_transactions', 'admin_id', 'uuid'),
      ('wallet_transactions', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('wallet_transactions', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('tournaments', 'status', 'text NOT NULL DEFAULT ''open'''),
      ('tournaments', 'type', 'text NOT NULL DEFAULT ''solo'''),
      ('tournaments', 'current_players', 'integer NOT NULL DEFAULT 0'),
      ('tournaments', 'entry_fee', 'integer NOT NULL DEFAULT 0'),
      ('tournaments', 'room_status', 'text NOT NULL DEFAULT ''closed'''),
      ('tournaments', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('tournaments', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('tournament_participants', 'tournament_id', 'uuid'),
      ('tournament_participants', 'user_id', 'uuid'),
      ('tournament_participants', 'status', 'text NOT NULL DEFAULT ''pending'''),
      ('tournament_participants', 'approved_at', 'timestamptz'),
      ('tournament_participants', 'approved_by', 'uuid'),
      ('tournament_participants', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('tournament_participants', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('match_results', 'tournament_id', 'uuid'),
      ('match_results', 'user_id', 'uuid'),
      ('match_results', 'rank', 'integer'),
      ('match_results', 'placement', 'integer'),
      ('match_results', 'kills', 'integer NOT NULL DEFAULT 0'),
      ('match_results', 'points', 'integer NOT NULL DEFAULT 0'),
      ('match_results', 'score', 'integer NOT NULL DEFAULT 0'),
      ('match_results', 'screenshot_url', 'text'),
      ('match_results', 'status', 'text NOT NULL DEFAULT ''pending'''),
      ('match_results', 'estimated_coins', 'integer NOT NULL DEFAULT 0'),
      ('match_results', 'coins_awarded', 'integer NOT NULL DEFAULT 0'),
      ('match_results', 'is_mvp', 'boolean NOT NULL DEFAULT false'),
      ('match_results', 'submitted_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('match_results', 'verified_at', 'timestamptz'),
      ('match_results', 'verified_by', 'uuid'),
      ('match_results', 'reviewed_by', 'uuid'),
      ('match_results', 'reviewed_at', 'timestamptz'),
      ('match_results', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('match_results', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('reports', 'status', 'text NOT NULL DEFAULT ''pending'''),
      ('reports', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('reports', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('admin_logs', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('system_config', 'type', 'text'),
      ('system_config', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('room_members', 'tournament_id', 'uuid'),
      ('room_members', 'user_id', 'uuid'),
      ('room_members', 'status', 'text NOT NULL DEFAULT ''joined'''),
      ('room_members', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('room_messages', 'tournament_id', 'uuid'),
      ('room_messages', 'user_id', 'uuid'),
      ('room_messages', 'message', 'text NOT NULL DEFAULT '''''),
      ('room_messages', 'type', 'text NOT NULL DEFAULT ''message'''),
      ('room_messages', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('chat_messages', 'user_id', 'uuid'),
      ('chat_messages', 'message', 'text NOT NULL DEFAULT '''''),
      ('chat_messages', 'type', 'text NOT NULL DEFAULT ''message'''),
      ('chat_messages', 'deleted_at', 'timestamptz'),
      ('chat_messages', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('support_tickets', 'user_id', 'uuid'),
      ('support_tickets', 'status', 'text NOT NULL DEFAULT ''open'''),
      ('support_tickets', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('support_tickets', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('support_messages', 'ticket_id', 'uuid'),
      ('support_messages', 'sender_id', 'uuid'),
      ('support_messages', 'message', 'text NOT NULL DEFAULT '''''),
      ('support_messages', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('admin_messages', 'user_id', 'uuid'),
      ('admin_messages', 'title', 'text NOT NULL DEFAULT '''''),
      ('admin_messages', 'message', 'text NOT NULL DEFAULT '''''),
      ('admin_messages', 'type', 'text NOT NULL DEFAULT ''system'''),
      ('admin_messages', 'read', 'boolean NOT NULL DEFAULT false'),
      ('admin_messages', 'is_read', 'boolean NOT NULL DEFAULT false'),
      ('admin_messages', 'data', 'jsonb NOT NULL DEFAULT ''{}''::jsonb'),
      ('admin_messages', 'expires_at', 'timestamptz'),
      ('admin_messages', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('admin_messages', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('announcements', 'is_active', 'boolean NOT NULL DEFAULT true'),
      ('announcements', 'active', 'boolean NOT NULL DEFAULT true'),
      ('announcements', 'target_roles', 'text[] NOT NULL DEFAULT ARRAY[''all'']::text[]'),
      ('announcements', 'expires_at', 'timestamptz'),
      ('announcements', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('announcements', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('announcement_reads', 'user_id', 'uuid'),
      ('announcement_reads', 'announcement_id', 'uuid'),
      ('announcement_reads', 'read', 'boolean NOT NULL DEFAULT true'),
      ('announcement_reads', 'is_read', 'boolean NOT NULL DEFAULT true'),
      ('announcement_reads', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('avatars', 'is_active', 'boolean NOT NULL DEFAULT true'),
      ('avatars', 'active', 'boolean NOT NULL DEFAULT true'),
      ('avatars', 'approved', 'boolean NOT NULL DEFAULT true'),
      ('avatars', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('avatars', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('news', 'published', 'boolean NOT NULL DEFAULT false'),
      ('news', 'author_id', 'uuid'),
      ('news', 'status', 'text NOT NULL DEFAULT ''draft'''),
      ('news', 'active', 'boolean NOT NULL DEFAULT true'),
      ('news', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('news', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('site_schedule', 'is_active', 'boolean NOT NULL DEFAULT true'),
      ('site_schedule', 'active', 'boolean NOT NULL DEFAULT true'),
      ('site_schedule', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('site_schedule', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('store_items', 'active', 'boolean NOT NULL DEFAULT true'),
      ('store_items', 'approved', 'boolean NOT NULL DEFAULT false'),
      ('store_items', 'price', 'integer NOT NULL DEFAULT 0'),
      ('store_items', 'type', 'text NOT NULL DEFAULT ''cosmetic'''),
      ('store_items', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('store_items', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('user_items', 'user_id', 'uuid'),
      ('user_items', 'item_id', 'uuid'),
      ('user_items', 'equipped', 'boolean NOT NULL DEFAULT false'),
      ('user_items', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('user_items', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('daily_store', 'is_active', 'boolean NOT NULL DEFAULT true'),
      ('daily_store', 'active', 'boolean NOT NULL DEFAULT true'),
      ('daily_store', 'expires_at', 'timestamptz'),
      ('daily_store', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('daily_rewards', 'is_active', 'boolean NOT NULL DEFAULT true'),
      ('daily_rewards', 'active', 'boolean NOT NULL DEFAULT true'),
      ('daily_rewards', 'expires_at', 'timestamptz'),
      ('daily_rewards', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('user_daily_claims', 'user_id', 'uuid'),
      ('user_daily_claims', 'reward_id', 'uuid'),
      ('user_daily_claims', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('missions', 'reward_coins', 'integer NOT NULL DEFAULT 0'),
      ('missions', 'is_active', 'boolean NOT NULL DEFAULT true'),
      ('missions', 'active', 'boolean NOT NULL DEFAULT true'),
      ('missions', 'expires_at', 'timestamptz'),
      ('missions', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('missions', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('user_missions', 'user_id', 'uuid'),
      ('user_missions', 'mission_id', 'uuid'),
      ('user_missions', 'claimed', 'boolean NOT NULL DEFAULT false'),
      ('user_missions', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('user_missions', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('achievements', 'is_active', 'boolean NOT NULL DEFAULT true'),
      ('achievements', 'active', 'boolean NOT NULL DEFAULT true'),
      ('achievements', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('user_achievements', 'user_id', 'uuid'),
      ('user_achievements', 'achievement_id', 'uuid'),
      ('user_achievements', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('teams', 'captain_id', 'uuid'),
      ('teams', 'status', 'text NOT NULL DEFAULT ''active'''),
      ('teams', 'active', 'boolean NOT NULL DEFAULT true'),
      ('teams', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('teams', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('team_members', 'team_id', 'uuid'),
      ('team_members', 'user_id', 'uuid'),
      ('team_members', 'role', 'text NOT NULL DEFAULT ''member'''),
      ('team_members', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('team_invites', 'team_id', 'uuid'),
      ('team_invites', 'invited_by', 'uuid'),
      ('team_invites', 'invited_user', 'uuid'),
      ('team_invites', 'status', 'text NOT NULL DEFAULT ''pending'''),
      ('team_invites', 'expires_at', 'timestamptz'),
      ('team_invites', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('team_invites', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('team_tournaments', 'team_id', 'uuid'),
      ('team_tournaments', 'tournament_id', 'uuid'),
      ('team_tournaments', 'status', 'text NOT NULL DEFAULT ''pending'''),
      ('team_tournaments', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('matches', 'tournament_id', 'uuid'),
      ('matches', 'status', 'text NOT NULL DEFAULT ''pending'''),
      ('matches', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('matches', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('match_participants', 'match_id', 'uuid'),
      ('match_participants', 'user_id', 'uuid'),
      ('match_participants', 'status', 'text NOT NULL DEFAULT ''pending'''),
      ('match_participants', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('clans', 'leader_id', 'uuid'),
      ('clans', 'status', 'text NOT NULL DEFAULT ''active'''),
      ('clans', 'active', 'boolean NOT NULL DEFAULT true'),
      ('clans', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('clans', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('clan_members', 'clan_id', 'uuid'),
      ('clan_members', 'user_id', 'uuid'),
      ('clan_members', 'role', 'text NOT NULL DEFAULT ''member'''),
      ('clan_members', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('clan_messages', 'clan_id', 'uuid'),
      ('clan_messages', 'user_id', 'uuid'),
      ('clan_messages', 'message', 'text NOT NULL DEFAULT '''''),
      ('clan_messages', 'type', 'text NOT NULL DEFAULT ''message'''),
      ('clan_messages', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('clan_applications', 'clan_id', 'uuid'),
      ('clan_applications', 'user_id', 'uuid'),
      ('clan_applications', 'status', 'text NOT NULL DEFAULT ''pending'''),
      ('clan_applications', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('clan_applications', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('notifications', 'user_id', 'uuid'),
      ('notifications', 'type', 'text NOT NULL DEFAULT ''system'''),
      ('notifications', 'title', 'text NOT NULL DEFAULT '''''),
      ('notifications', 'message', 'text NOT NULL DEFAULT '''''),
      ('notifications', 'data', 'jsonb NOT NULL DEFAULT ''{}''::jsonb'),
      ('notifications', 'read', 'boolean NOT NULL DEFAULT false'),
      ('notifications', 'is_read', 'boolean NOT NULL DEFAULT false'),
      ('notifications', 'expires_at', 'timestamptz'),
      ('notifications', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('notifications', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('player_stats', 'user_id', 'uuid'),
      ('player_stats', 'kills', 'integer NOT NULL DEFAULT 0'),
      ('player_stats', 'wins', 'integer NOT NULL DEFAULT 0'),
      ('player_stats', 'losses', 'integer NOT NULL DEFAULT 0'),
      ('player_stats', 'total_points', 'integer NOT NULL DEFAULT 0'),
      ('player_stats', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('player_stats', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('match_verifications', 'tournament_id', 'uuid'),
      ('match_verifications', 'status', 'text NOT NULL DEFAULT ''pending'''),
      ('match_verifications', 'dispute_reason', 'text'),
      ('match_verifications', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('match_verifications', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('seasons', 'status', 'text NOT NULL DEFAULT ''active'''),
      ('seasons', 'end_date', 'timestamptz'),
      ('seasons', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('seasons', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('gift_transactions', 'sender_id', 'uuid'),
      ('gift_transactions', 'receiver_id', 'uuid'),
      ('gift_transactions', 'item_id', 'uuid'),
      ('gift_transactions', 'coins', 'integer NOT NULL DEFAULT 0'),
      ('gift_transactions', 'message', 'text'),
      ('gift_transactions', 'status', 'text NOT NULL DEFAULT ''completed'''),
      ('gift_transactions', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('referral_codes', 'user_id', 'uuid'),
      ('referral_codes', 'code', 'text'),
      ('referral_codes', 'is_active', 'boolean NOT NULL DEFAULT true'),
      ('referral_codes', 'active', 'boolean NOT NULL DEFAULT true'),
      ('referral_codes', 'uses_count', 'integer NOT NULL DEFAULT 0'),
      ('referral_codes', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('referral_codes', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('referral_uses', 'referrer_id', 'uuid'),
      ('referral_uses', 'referred_id', 'uuid'),
      ('referral_uses', 'rewarded', 'boolean NOT NULL DEFAULT false'),
      ('referral_uses', 'status', 'text NOT NULL DEFAULT ''pending'''),
      ('referral_uses', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('referral_uses', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('feature_requests', 'user_id', 'uuid'),
      ('feature_requests', 'title', 'text NOT NULL DEFAULT '''''),
      ('feature_requests', 'description', 'text NOT NULL DEFAULT '''''),
      ('feature_requests', 'category', 'text NOT NULL DEFAULT ''general'''),
      ('feature_requests', 'status', 'text NOT NULL DEFAULT ''open'''),
      ('feature_requests', 'admin_note', 'text'),
      ('feature_requests', 'reviewed_by', 'uuid'),
      ('feature_requests', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('feature_requests', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('feature_votes', 'request_id', 'uuid'),
      ('feature_votes', 'user_id', 'uuid'),
      ('feature_votes', 'vote', 'integer NOT NULL DEFAULT 1'),
      ('feature_votes', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('feature_comments', 'request_id', 'uuid'),
      ('feature_comments', 'user_id', 'uuid'),
      ('feature_comments', 'comment', 'text NOT NULL DEFAULT '''''),
      ('feature_comments', 'content', 'text'),
      ('feature_comments', 'is_deleted', 'boolean NOT NULL DEFAULT false'),
      ('feature_comments', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('feature_comments', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('bug_reports', 'user_id', 'uuid'),
      ('bug_reports', 'title', 'text NOT NULL DEFAULT '''''),
      ('bug_reports', 'description', 'text NOT NULL DEFAULT '''''),
      ('bug_reports', 'category', 'text NOT NULL DEFAULT ''general'''),
      ('bug_reports', 'severity', 'text NOT NULL DEFAULT ''medium'''),
      ('bug_reports', 'steps_to_repro', 'text'),
      ('bug_reports', 'screenshot_url', 'text'),
      ('bug_reports', 'evidence_url', 'text'),
      ('bug_reports', 'affected_page', 'text'),
      ('bug_reports', 'device_info', 'text'),
      ('bug_reports', 'browser_info', 'text'),
      ('bug_reports', 'status', 'text NOT NULL DEFAULT ''pending'''),
      ('bug_reports', 'admin_note', 'text'),
      ('bug_reports', 'reviewed_by', 'uuid'),
      ('bug_reports', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('bug_reports', 'updated_at', 'timestamptz NOT NULL DEFAULT now()'),

      ('admin_applications', 'user_id', 'uuid'),
      ('admin_applications', 'motivation', 'text'),
      ('admin_applications', 'q_why_join', 'text'),
      ('admin_applications', 'q_experience', 'text'),
      ('admin_applications', 'q_conflict_scenario', 'text'),
      ('admin_applications', 'q_availability', 'text'),
      ('admin_applications', 'q_languages', 'text'),
      ('admin_applications', 'q_extra', 'text'),
      ('admin_applications', 'status', 'text NOT NULL DEFAULT ''pending'''),
      ('admin_applications', 'admin_note', 'text'),
      ('admin_applications', 'reviewed_by', 'uuid'),
      ('admin_applications', 'created_at', 'timestamptz NOT NULL DEFAULT now()'),
      ('admin_applications', 'updated_at', 'timestamptz NOT NULL DEFAULT now()')
    ) AS cols(table_name, column_name, column_definition)
  LOOP
    IF to_regclass(format('public.%I', c.table_name)) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS %I %s',
        c.table_name,
        c.column_name,
        c.column_definition
      );
    END IF;
  END LOOP;
END;
$preflight$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clan_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clan_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "wallets_read_self" ON public.wallets;
DROP POLICY IF EXISTS "wallets_admin_write" ON public.wallets;
DROP POLICY IF EXISTS "wallet_tx_read_self" ON public.wallet_transactions;
DROP POLICY IF EXISTS "wallet_tx_admin_insert" ON public.wallet_transactions;
CREATE POLICY "wallets_read_self" ON public.wallets FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "wallets_admin_write" ON public.wallets FOR ALL USING (public.is_admin());
CREATE POLICY "wallet_tx_read_self" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "wallet_tx_admin_insert" ON public.wallet_transactions FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "tournaments_read_all" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_manage_staff" ON public.tournaments;
DROP POLICY IF EXISTS "tp_read_all" ON public.tournament_participants;
DROP POLICY IF EXISTS "tp_insert_self" ON public.tournament_participants;
DROP POLICY IF EXISTS "tp_manage_staff" ON public.tournament_participants;
CREATE POLICY "tournaments_read_all" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "tournaments_manage_staff" ON public.tournaments FOR ALL USING (public.is_role(ARRAY['founder','fondateur','admin','super_admin']));
CREATE POLICY "tp_read_all" ON public.tournament_participants FOR SELECT USING (true);
CREATE POLICY "tp_insert_self" ON public.tournament_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tp_manage_staff" ON public.tournament_participants FOR ALL USING (public.is_role(ARRAY['founder','fondateur','admin','super_admin']));

DROP POLICY IF EXISTS "match_results_read_all" ON public.match_results;
DROP POLICY IF EXISTS "match_results_insert_self" ON public.match_results;
DROP POLICY IF EXISTS "match_results_manage_staff" ON public.match_results;
CREATE POLICY "match_results_read_all" ON public.match_results FOR SELECT USING (true);
CREATE POLICY "match_results_insert_self" ON public.match_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "match_results_manage_staff" ON public.match_results FOR ALL USING (public.is_role(ARRAY['founder','fondateur','admin','super_admin']));

DROP POLICY IF EXISTS "reports_insert_self" ON public.reports;
DROP POLICY IF EXISTS "reports_read_self_or_admin" ON public.reports;
DROP POLICY IF EXISTS "reports_admin_update" ON public.reports;
CREATE POLICY "reports_insert_self" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_read_self_or_admin" ON public.reports FOR SELECT USING (auth.uid() = reporter_id OR public.is_admin());
CREATE POLICY "reports_admin_update" ON public.reports FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "admin_logs_insert_staff" ON public.admin_logs;
DROP POLICY IF EXISTS "admin_logs_read_admin" ON public.admin_logs;
CREATE POLICY "admin_logs_insert_staff" ON public.admin_logs FOR INSERT WITH CHECK (public.is_role(ARRAY['founder','fondateur','admin','super_admin']));
CREATE POLICY "admin_logs_read_admin" ON public.admin_logs FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "sysconfig_read_all" ON public.system_config;
DROP POLICY IF EXISTS "sysconfig_super_admin_write" ON public.system_config;
CREATE POLICY "sysconfig_read_all" ON public.system_config FOR SELECT USING (true);
CREATE POLICY "sysconfig_super_admin_write" ON public.system_config FOR ALL USING (public.is_role(ARRAY['super_admin']));

DROP POLICY IF EXISTS "room_members_read_participants" ON public.room_members;
DROP POLICY IF EXISTS "room_members_staff_write" ON public.room_members;
DROP POLICY IF EXISTS "room_messages_read_all" ON public.room_messages;
DROP POLICY IF EXISTS "room_messages_insert_participant" ON public.room_messages;
DROP POLICY IF EXISTS "chat_read_all" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_insert_self" ON public.chat_messages;
CREATE POLICY "room_members_read_participants" ON public.room_members FOR SELECT USING (true);
CREATE POLICY "room_members_staff_write" ON public.room_members FOR ALL USING (public.is_role(ARRAY['founder','fondateur','admin','super_admin']));
CREATE POLICY "room_messages_read_all" ON public.room_messages FOR SELECT USING (true);
CREATE POLICY "room_messages_insert_participant" ON public.room_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chat_read_all" ON public.chat_messages FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "chat_insert_self" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "support_tickets_read_owner_admin" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_insert_self" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_admin_update" ON public.support_tickets;
DROP POLICY IF EXISTS "support_messages_read_ticket" ON public.support_messages;
DROP POLICY IF EXISTS "support_messages_insert_ticket" ON public.support_messages;
CREATE POLICY "support_tickets_read_owner_admin" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "support_tickets_insert_self" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "support_tickets_admin_update" ON public.support_tickets FOR UPDATE USING (public.is_admin());
CREATE POLICY "support_messages_read_ticket" ON public.support_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.is_admin()))
);
CREATE POLICY "support_messages_insert_ticket" ON public.support_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.is_admin()))
);

DROP POLICY IF EXISTS "admin_messages_read_self" ON public.admin_messages;
DROP POLICY IF EXISTS "admin_messages_update_self" ON public.admin_messages;
DROP POLICY IF EXISTS "admin_messages_admin_insert" ON public.admin_messages;
DROP POLICY IF EXISTS "notifications_read_self" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_self" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_staff" ON public.notifications;
DROP POLICY IF EXISTS "announcements_read_active" ON public.announcements;
DROP POLICY IF EXISTS "announcements_admin_all" ON public.announcements;
DROP POLICY IF EXISTS "announcement_reads_self" ON public.announcement_reads;
DROP POLICY IF EXISTS "avatars_read_public" ON public.avatars;
DROP POLICY IF EXISTS "avatars_admin_all" ON public.avatars;
CREATE POLICY "admin_messages_read_self" ON public.admin_messages FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "admin_messages_update_self" ON public.admin_messages FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "admin_messages_admin_insert" ON public.admin_messages FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "notifications_read_self" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_self" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert_staff" ON public.notifications FOR INSERT WITH CHECK (public.is_role(ARRAY['founder','fondateur','admin','super_admin']));
CREATE POLICY "announcements_read_active" ON public.announcements FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "announcements_admin_all" ON public.announcements FOR ALL USING (public.is_admin());
CREATE POLICY "announcement_reads_self" ON public.announcement_reads FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "avatars_read_public" ON public.avatars FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "avatars_admin_all" ON public.avatars FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "public_content_read" ON public.news;
DROP POLICY IF EXISTS "news_admin_write" ON public.news;
DROP POLICY IF EXISTS "site_schedule_admin_all" ON public.site_schedule;
CREATE POLICY "public_content_read" ON public.news FOR SELECT USING (published = true OR public.is_admin());
CREATE POLICY "news_admin_write" ON public.news FOR ALL USING (public.is_admin());
CREATE POLICY "site_schedule_admin_all" ON public.site_schedule FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "store_read_active" ON public.store_items;
DROP POLICY IF EXISTS "store_designer_write" ON public.store_items;
DROP POLICY IF EXISTS "user_items_read_self" ON public.user_items;
DROP POLICY IF EXISTS "user_items_update_self" ON public.user_items;
DROP POLICY IF EXISTS "daily_store_read" ON public.daily_store;
DROP POLICY IF EXISTS "daily_rewards_read" ON public.daily_rewards;
DROP POLICY IF EXISTS "missions_read" ON public.missions;
DROP POLICY IF EXISTS "claims_read_self" ON public.user_daily_claims;
DROP POLICY IF EXISTS "user_missions_self" ON public.user_missions;
DROP POLICY IF EXISTS "achievements_read" ON public.achievements;
DROP POLICY IF EXISTS "user_achievements_read_self" ON public.user_achievements;
CREATE POLICY "store_read_active" ON public.store_items FOR SELECT USING (active = true OR public.is_role(ARRAY['designer','admin','super_admin']));
CREATE POLICY "store_designer_write" ON public.store_items FOR ALL USING (public.is_role(ARRAY['designer','admin','super_admin']));
CREATE POLICY "user_items_read_self" ON public.user_items FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "user_items_update_self" ON public.user_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "daily_store_read" ON public.daily_store FOR SELECT USING (true);
CREATE POLICY "daily_rewards_read" ON public.daily_rewards FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "missions_read" ON public.missions FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "claims_read_self" ON public.user_daily_claims FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "user_missions_self" ON public.user_missions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "achievements_read" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "user_achievements_read_self" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "teams_read_active" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_self" ON public.teams;
DROP POLICY IF EXISTS "teams_update_captain" ON public.teams;
DROP POLICY IF EXISTS "team_members_read" ON public.team_members;
DROP POLICY IF EXISTS "team_members_staff" ON public.team_members;
DROP POLICY IF EXISTS "team_invites_read_self" ON public.team_invites;
DROP POLICY IF EXISTS "team_invites_insert_captain" ON public.team_invites;
DROP POLICY IF EXISTS "team_invites_update_invited" ON public.team_invites;
DROP POLICY IF EXISTS "team_tournaments_read" ON public.team_tournaments;
CREATE POLICY "teams_read_active" ON public.teams FOR SELECT USING (status = 'active' OR public.is_admin());
CREATE POLICY "teams_insert_self" ON public.teams FOR INSERT WITH CHECK (auth.uid() = captain_id);
CREATE POLICY "teams_update_captain" ON public.teams FOR UPDATE USING (auth.uid() = captain_id OR public.is_admin());
CREATE POLICY "team_members_read" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "team_members_staff" ON public.team_members FOR ALL USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.captain_id = auth.uid()));
CREATE POLICY "team_invites_read_self" ON public.team_invites FOR SELECT USING (auth.uid() IN (invited_by, invited_user) OR public.is_admin());
CREATE POLICY "team_invites_insert_captain" ON public.team_invites FOR INSERT WITH CHECK (auth.uid() = invited_by);
CREATE POLICY "team_invites_update_invited" ON public.team_invites FOR UPDATE USING (auth.uid() = invited_user OR public.is_admin());
CREATE POLICY "team_tournaments_read" ON public.team_tournaments FOR SELECT USING (true);

DROP POLICY IF EXISTS "clans_read" ON public.clans;
DROP POLICY IF EXISTS "clans_insert_self" ON public.clans;
DROP POLICY IF EXISTS "clans_update_leader" ON public.clans;
DROP POLICY IF EXISTS "clan_members_read" ON public.clan_members;
DROP POLICY IF EXISTS "clan_members_insert_self" ON public.clan_members;
DROP POLICY IF EXISTS "clan_messages_read_members" ON public.clan_messages;
DROP POLICY IF EXISTS "clan_messages_insert_members" ON public.clan_messages;
DROP POLICY IF EXISTS "clan_applications_self" ON public.clan_applications;
CREATE POLICY "clans_read" ON public.clans FOR SELECT USING (true);
CREATE POLICY "clans_insert_self" ON public.clans FOR INSERT WITH CHECK (auth.uid() = leader_id);
CREATE POLICY "clans_update_leader" ON public.clans FOR UPDATE USING (auth.uid() = leader_id OR public.is_admin());
CREATE POLICY "clan_members_read" ON public.clan_members FOR SELECT USING (true);
CREATE POLICY "clan_members_insert_self" ON public.clan_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clan_messages_read_members" ON public.clan_messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.clan_members cm WHERE cm.clan_id = clan_messages.clan_id AND cm.user_id = auth.uid()) OR public.is_admin());
CREATE POLICY "clan_messages_insert_members" ON public.clan_messages FOR INSERT WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.clan_members cm WHERE cm.clan_id = clan_messages.clan_id AND cm.user_id = auth.uid()));
CREATE POLICY "clan_applications_self" ON public.clan_applications FOR ALL USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "player_stats_read" ON public.player_stats;
DROP POLICY IF EXISTS "player_stats_admin" ON public.player_stats;
DROP POLICY IF EXISTS "match_verifications_read" ON public.match_verifications;
DROP POLICY IF EXISTS "match_verifications_admin" ON public.match_verifications;
CREATE POLICY "player_stats_read" ON public.player_stats FOR SELECT USING (true);
CREATE POLICY "player_stats_admin" ON public.player_stats FOR ALL USING (public.is_admin());
CREATE POLICY "match_verifications_read" ON public.match_verifications FOR SELECT USING (true);
CREATE POLICY "match_verifications_admin" ON public.match_verifications FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "seasons_read_all" ON public.seasons;
DROP POLICY IF EXISTS "seasons_admin_all" ON public.seasons;
DROP POLICY IF EXISTS "gifts_read_self" ON public.gift_transactions;
DROP POLICY IF EXISTS "gifts_insert_self" ON public.gift_transactions;
DROP POLICY IF EXISTS "ref_codes_self" ON public.referral_codes;
DROP POLICY IF EXISTS "ref_uses_self" ON public.referral_uses;
DROP POLICY IF EXISTS "feature_requests_read" ON public.feature_requests;
DROP POLICY IF EXISTS "feature_requests_insert" ON public.feature_requests;
DROP POLICY IF EXISTS "feature_votes_self" ON public.feature_votes;
DROP POLICY IF EXISTS "feature_comments_read" ON public.feature_comments;
DROP POLICY IF EXISTS "feature_comments_insert" ON public.feature_comments;
DROP POLICY IF EXISTS "bug_reports_self" ON public.bug_reports;
DROP POLICY IF EXISTS "admin_apps_self" ON public.admin_applications;
CREATE POLICY "seasons_read_all" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "seasons_admin_all" ON public.seasons FOR ALL USING (public.is_admin());
CREATE POLICY "gifts_read_self" ON public.gift_transactions FOR SELECT USING (auth.uid() IN (sender_id, receiver_id) OR public.is_admin());
CREATE POLICY "gifts_insert_self" ON public.gift_transactions FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "ref_codes_self" ON public.referral_codes FOR ALL USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "ref_uses_self" ON public.referral_uses FOR SELECT USING (auth.uid() IN (referrer_id, referred_id) OR public.is_admin());
CREATE POLICY "feature_requests_read" ON public.feature_requests FOR SELECT USING (true);
CREATE POLICY "feature_requests_insert" ON public.feature_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "feature_votes_self" ON public.feature_votes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "feature_comments_read" ON public.feature_comments FOR SELECT USING (true);
CREATE POLICY "feature_comments_insert" ON public.feature_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bug_reports_self" ON public.bug_reports FOR ALL USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "admin_apps_self" ON public.admin_applications FOR ALL USING (auth.uid() = user_id OR public.is_admin());

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

DO $guarded_check_user_permission$
BEGIN
  IF to_regprocedure('public.check_user_permission(uuid, text, text)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.check_user_permission(p_user_id uuid, required_role text DEFAULT 'user', permission_name text DEFAULT NULL)
      RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $body$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id
      AND CASE COALESCE(required_role, permission_name, 'user')
        WHEN 'super_admin' THEN role = 'super_admin'
        WHEN 'admin' THEN role IN ('admin','super_admin')
        WHEN 'founder' THEN role IN ('founder','fondateur','admin','super_admin')
        WHEN 'designer' THEN role IN ('designer','admin','super_admin')
        ELSE role <> 'banned'
      END
  );
$body$;
    $fn$;
  END IF;
END;
$guarded_check_user_permission$;

DO $guarded_rpc$
BEGIN
  IF to_regprocedure('public.admin_adjust_coins(uuid, integer, text)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.admin_adjust_coins(p_target_user_id uuid, p_amount integer, p_reason text)
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      DECLARE
        v_new_balance integer;
      BEGIN
        IF NOT public.is_admin() THEN
          RETURN jsonb_build_object('success', false, 'error', 'Admin only');
        END IF;
        IF p_amount = 0 THEN
          RETURN jsonb_build_object('success', false, 'error', 'Amount cannot be zero');
        END IF;

        INSERT INTO public.wallets (user_id, balance) VALUES (p_target_user_id, 0)
        ON CONFLICT (user_id) DO NOTHING;

        UPDATE public.wallets
        SET balance = GREATEST(0, balance + p_amount), updated_at = now()
        WHERE user_id = p_target_user_id
        RETURNING balance INTO v_new_balance;

        INSERT INTO public.wallet_transactions (user_id, amount, type, reason, admin_id)
        VALUES (p_target_user_id, p_amount, 'admin_adjustment', p_reason, auth.uid());

        INSERT INTO public.notifications (user_id, type, title, message, data)
        VALUES (p_target_user_id, 'coins_received', 'Wallet Updated', p_reason, jsonb_build_object('amount', p_amount, 'balance', v_new_balance));

        RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
      END;
      $body$;
    $fn$;
  END IF;

  IF to_regprocedure('public.grant_coins(uuid, integer)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.grant_coins(target_user uuid, amount integer)
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      BEGIN
        RETURN public.admin_adjust_coins(target_user, amount, 'Admin grant');
      END;
      $body$;
    $fn$;
  END IF;

  IF to_regprocedure('public.join_tournament(uuid)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.join_tournament(p_tournament_id uuid)
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      DECLARE
        v_user_id uuid := auth.uid();
        v_t public.tournaments%ROWTYPE;
        v_balance integer;
      BEGIN
        SELECT * INTO v_t FROM public.tournaments WHERE id = p_tournament_id FOR UPDATE;
        IF v_t.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Tournament not found'); END IF;
        IF v_t.status NOT IN ('open','upcoming','active') THEN RETURN jsonb_build_object('success', false, 'error', 'Tournament not open'); END IF;
        IF v_t.current_players >= v_t.max_players THEN RETURN jsonb_build_object('success', false, 'error', 'Tournament full'); END IF;

        IF EXISTS (SELECT 1 FROM public.tournament_participants WHERE tournament_id = p_tournament_id AND user_id = v_user_id) THEN
          RETURN jsonb_build_object('success', false, 'error', 'Already joined');
        END IF;

        IF v_t.entry_fee > 0 THEN
          SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_user_id FOR UPDATE;
          IF COALESCE(v_balance, 0) < v_t.entry_fee THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance'); END IF;
          UPDATE public.wallets SET balance = balance - v_t.entry_fee, updated_at = now() WHERE user_id = v_user_id;
          INSERT INTO public.wallet_transactions (user_id, amount, type, reason, reference)
          VALUES (v_user_id, -v_t.entry_fee, 'fee', 'Tournament entry fee', p_tournament_id::text);
        END IF;

        INSERT INTO public.tournament_participants (tournament_id, user_id, status)
        VALUES (p_tournament_id, v_user_id, 'approved');
        UPDATE public.tournaments SET current_players = current_players + 1, updated_at = now() WHERE id = p_tournament_id;
        RETURN jsonb_build_object('success', true);
      END;
      $body$;
    $fn$;
  END IF;

  IF to_regprocedure('public.leave_tournament(uuid, uuid)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.leave_tournament(p_tournament_id uuid, p_user_id uuid DEFAULT NULL)
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      DECLARE
        v_user_id uuid := COALESCE(p_user_id, auth.uid());
        v_t public.tournaments%ROWTYPE;
      BEGIN
        IF v_user_id <> auth.uid() AND NOT public.is_admin() THEN
          RETURN jsonb_build_object('success', false, 'error', 'Not allowed');
        END IF;
        SELECT * INTO v_t FROM public.tournaments WHERE id = p_tournament_id FOR UPDATE;
        DELETE FROM public.tournament_participants WHERE tournament_id = p_tournament_id AND user_id = v_user_id;
        IF FOUND THEN
          UPDATE public.tournaments SET current_players = GREATEST(0, current_players - 1), updated_at = now() WHERE id = p_tournament_id;
          IF v_t.entry_fee > 0 THEN
            UPDATE public.wallets SET balance = balance + v_t.entry_fee, updated_at = now() WHERE user_id = v_user_id;
            INSERT INTO public.wallet_transactions (user_id, amount, type, reason, reference)
            VALUES (v_user_id, v_t.entry_fee, 'refund', 'Tournament leave refund', p_tournament_id::text);
          END IF;
        END IF;
        RETURN jsonb_build_object('success', true);
      END;
      $body$;
    $fn$;
  END IF;
END;
$guarded_rpc$;

DO $guarded_approve_tournament_request$
BEGIN
  IF to_regprocedure('public.approve_tournament_request(uuid, uuid, uuid, uuid, boolean)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.approve_tournament_request(p_request_id uuid,
  p_tournament_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_reviewer_id uuid DEFAULT NULL,
  approved boolean DEFAULT true)
      RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
BEGIN
  IF NOT public.is_role(ARRAY['founder','fondateur','admin','super_admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff only');
  END IF;
  UPDATE public.tournament_participants
  SET status = CASE WHEN approved THEN 'approved' ELSE 'rejected' END,
      approved_at = now(),
      approved_by = auth.uid()
  WHERE id = p_request_id;
  RETURN jsonb_build_object('success', true);
END;
$body$;
    $fn$;
  END IF;
END;
$guarded_approve_tournament_request$;

DO $guarded_setup_room$
BEGIN
  IF to_regprocedure('public.setup_room(uuid)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.setup_room(p_tournament_id uuid)
      RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
BEGIN
  IF NOT public.is_role(ARRAY['founder','fondateur','admin','super_admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff only');
  END IF;
  INSERT INTO public.room_members (tournament_id, user_id)
  SELECT tournament_id, user_id FROM public.tournament_participants
  WHERE tournament_id = p_tournament_id AND status IN ('approved','joined')
  ON CONFLICT (tournament_id, user_id) DO NOTHING;
  UPDATE public.tournaments SET room_status = 'open', updated_at = now() WHERE id = p_tournament_id;
  RETURN jsonb_build_object('success', true);
END;
$body$;
    $fn$;
  END IF;
END;
$guarded_setup_room$;

DO $guarded_start_match$
BEGIN
  IF to_regprocedure('public.start_match(uuid, uuid)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.start_match(p_tournament_id uuid DEFAULT NULL, tournament_id uuid DEFAULT NULL)
      RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
BEGIN
  p_tournament_id := COALESCE(p_tournament_id, tournament_id);
  IF NOT public.is_role(ARRAY['founder','fondateur','admin','super_admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff only');
  END IF;
  UPDATE public.tournaments SET status = 'live', room_status = 'live', updated_at = now() WHERE id = p_tournament_id;
  RETURN jsonb_build_object('success', true);
END;
$body$;
    $fn$;
  END IF;
END;
$guarded_start_match$;

DO $guarded_sync_room_status$
BEGIN
  IF to_regprocedure('public.sync_room_status(uuid)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.sync_room_status(p_tournament_id uuid)
      RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $body$
  SELECT jsonb_build_object('success', true, 'room_status', room_status, 'status', status)
  FROM public.tournaments WHERE id = p_tournament_id;
$body$;
    $fn$;
  END IF;
END;
$guarded_sync_room_status$;

DO $guarded_close_registration$
BEGIN
  IF to_regprocedure('public.close_registration(uuid)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.close_registration(p_tournament_id uuid)
      RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
BEGIN
  IF NOT public.is_role(ARRAY['founder','fondateur','admin','super_admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff only');
  END IF;
  UPDATE public.tournaments SET status = 'registration_closed', updated_at = now() WHERE id = p_tournament_id;
  RETURN jsonb_build_object('success', true);
END;
$body$;
    $fn$;
  END IF;
END;
$guarded_close_registration$;

DO $guarded_submit_match_result$
BEGIN
  IF to_regprocedure('public.submit_match_result(uuid, integer, integer, text, integer, uuid, integer)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.submit_match_result(p_tournament_id uuid,
  p_rank integer DEFAULT NULL,
  p_kills integer DEFAULT 0,
  p_screenshot_url text DEFAULT NULL,
  p_match_number integer DEFAULT NULL,
  p_team_id uuid DEFAULT NULL,
  p_placement integer DEFAULT NULL)
      RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
DECLARE
  v_user_id uuid := auth.uid();
  v_points integer;
BEGIN
  p_rank := COALESCE(p_rank, p_placement);
  IF NOT EXISTS (
    SELECT 1 FROM public.tournament_participants WHERE tournament_id = p_tournament_id AND user_id = v_user_id
    UNION
    SELECT 1 FROM public.room_members WHERE tournament_id = p_tournament_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a participant');
  END IF;
  IF p_rank IS NULL OR p_rank < 1 OR p_kills IS NULL OR p_kills < 0 OR COALESCE(p_screenshot_url, '') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid result');
  END IF;
  v_points := GREATEST(0, 13 - LEAST(p_rank, 13)) + p_kills;
  INSERT INTO public.match_results (tournament_id, user_id, rank, kills, points, score, screenshot_url, estimated_coins, status)
  VALUES (p_tournament_id, v_user_id, p_rank, p_kills, v_points, v_points, p_screenshot_url, v_points * 10, 'pending');
  RETURN jsonb_build_object('success', true, 'points', v_points, 'coins_estimate', v_points * 10);
END;
$body$;
    $fn$;
  END IF;
END;
$guarded_submit_match_result$;

DO $guarded_update_player_stats$
BEGIN
  IF to_regprocedure('public.update_player_stats(uuid, integer, integer, integer, integer)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.update_player_stats(p_user_id uuid, p_kills integer DEFAULT 0, p_wins integer DEFAULT 0, p_losses integer DEFAULT 0, p_points integer DEFAULT 0)
      RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
BEGIN
  IF NOT public.is_role(ARRAY['founder','fondateur','admin','super_admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff only');
  END IF;
  INSERT INTO public.player_stats (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.player_stats SET
    kills = kills + COALESCE(p_kills, 0),
    wins = wins + COALESCE(p_wins, 0),
    losses = losses + COALESCE(p_losses, 0),
    total_points = total_points + COALESCE(p_points, 0),
    tournaments_played = tournaments_played + 1,
    updated_at = now()
  WHERE user_id = p_user_id;
  RETURN jsonb_build_object('success', true);
END;
$body$;
    $fn$;
  END IF;
END;
$guarded_update_player_stats$;

DO $guarded_purchase_item$
BEGIN
  IF to_regprocedure('public.purchase_item(uuid)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.purchase_item(p_item_id uuid)
      RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
DECLARE
  v_user_id uuid := auth.uid();
  v_item public.store_items%ROWTYPE;
  v_balance integer;
BEGIN
  SELECT * INTO v_item FROM public.store_items WHERE id = p_item_id AND active = true AND approved = true;
  IF v_item.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Item unavailable'); END IF;
  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_user_id FOR UPDATE;
  IF COALESCE(v_balance, 0) < v_item.price THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance'); END IF;
  UPDATE public.wallets SET balance = balance - v_item.price, updated_at = now() WHERE user_id = v_user_id;
  INSERT INTO public.wallet_transactions (user_id, amount, type, reason, reference)
  VALUES (v_user_id, -v_item.price, 'purchase', 'Store purchase', p_item_id::text);
  INSERT INTO public.user_items (user_id, item_id) VALUES (v_user_id, p_item_id) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('success', true);
END;
$body$;
    $fn$;
  END IF;
END;
$guarded_purchase_item$;

DO $guarded_equip_item$
BEGIN
  IF to_regprocedure('public.equip_item(uuid)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.equip_item(p_item_id uuid)
      RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_items WHERE user_id = v_user_id AND item_id = p_item_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not owned');
  END IF;
  UPDATE public.user_items SET equipped = false WHERE user_id = v_user_id;
  UPDATE public.user_items SET equipped = true WHERE user_id = v_user_id AND item_id = p_item_id;
  RETURN jsonb_build_object('success', true);
END;
$body$;
    $fn$;
  END IF;
END;
$guarded_equip_item$;

DO $guarded_admin_grant_item$
BEGIN
  IF to_regprocedure('public.admin_grant_item(uuid, uuid, text)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.admin_grant_item(p_target_user_id uuid, p_item_id uuid, p_reason text DEFAULT NULL)
      RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('success', false, 'error', 'Admin only'); END IF;
  INSERT INTO public.user_items (user_id, item_id) VALUES (p_target_user_id, p_item_id) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('success', true);
END;
$body$;
    $fn$;
  END IF;
END;
$guarded_admin_grant_item$;

DO $guarded_admin_remove_item$
BEGIN
  IF to_regprocedure('public.admin_remove_item(uuid, uuid)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.admin_remove_item(p_target_user_id uuid, p_item_id uuid)
      RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('success', false, 'error', 'Admin only'); END IF;
  DELETE FROM public.user_items WHERE user_id = p_target_user_id AND item_id = p_item_id;
  RETURN jsonb_build_object('success', true);
END;
$body$;
    $fn$;
  END IF;
END;
$guarded_admin_remove_item$;

DO $guarded_claim_daily_reward$
BEGIN
  IF to_regprocedure('public.claim_daily_reward(uuid)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.claim_daily_reward(p_user_id uuid DEFAULT NULL)
      RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
DECLARE
  v_user_id uuid := COALESCE(p_user_id, auth.uid());
BEGIN
  IF v_user_id <> auth.uid() THEN RETURN jsonb_build_object('success', false, 'error', 'Not allowed'); END IF;
  INSERT INTO public.user_daily_claims (user_id) VALUES (v_user_id);
  UPDATE public.wallets SET balance = balance + 10, updated_at = now() WHERE user_id = v_user_id;
  INSERT INTO public.wallet_transactions (user_id, amount, type, reason) VALUES (v_user_id, 10, 'daily_reward', 'Daily reward');
  RETURN jsonb_build_object('success', true, 'coins', 10);
END;
$body$;
    $fn$;
  END IF;
END;
$guarded_claim_daily_reward$;

DO $guarded_claim_mission_reward$
BEGIN
  IF to_regprocedure('public.claim_mission_reward(uuid, uuid)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.claim_mission_reward(p_user_id uuid DEFAULT NULL, p_mission_id uuid DEFAULT NULL)
      RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
DECLARE
  v_user_id uuid := COALESCE(p_user_id, auth.uid());
  v_reward integer;
BEGIN
  IF v_user_id <> auth.uid() THEN RETURN jsonb_build_object('success', false, 'error', 'Not allowed'); END IF;
  SELECT reward_coins INTO v_reward FROM public.missions WHERE id = p_mission_id AND is_active = true;
  IF v_reward IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Mission unavailable'); END IF;
  UPDATE public.wallets SET balance = balance + v_reward, updated_at = now() WHERE user_id = v_user_id;
  INSERT INTO public.wallet_transactions (user_id, amount, type, reason, reference) VALUES (v_user_id, v_reward, 'mission_reward', 'Mission reward', p_mission_id::text);
  RETURN jsonb_build_object('success', true, 'coins', v_reward);
END;
$body$;
    $fn$;
  END IF;
END;
$guarded_claim_mission_reward$;

DO $guarded_create_team$
BEGIN
  IF to_regprocedure('public.create_team(text, text, text, text, boolean, uuid)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.create_team(p_name text,
  p_tag text,
  p_description text DEFAULT NULL,
  p_accent_color text DEFAULT NULL,
  p_is_open boolean DEFAULT true,
  p_captain_id uuid DEFAULT NULL)
      RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
DECLARE
  v_captain_id uuid := COALESCE(p_captain_id, auth.uid());
  v_team_id uuid;
BEGIN
  IF v_captain_id <> auth.uid() AND NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not allowed');
  END IF;
  INSERT INTO public.teams (name, tag, description, accent_color, is_open, captain_id)
  VALUES (p_name, upper(p_tag), p_description, p_accent_color, COALESCE(p_is_open, true), v_captain_id)
  RETURNING id INTO v_team_id;
  INSERT INTO public.team_members (team_id, user_id, role) VALUES (v_team_id, v_captain_id, 'captain');
  UPDATE public.profiles SET team_id = v_team_id WHERE id = v_captain_id;
  RETURN jsonb_build_object('success', true, 'team_id', v_team_id);
END;
$body$;
    $fn$;
  END IF;
END;
$guarded_create_team$;

DO $guarded_accept_team_invite$
BEGIN
  IF to_regprocedure('public.accept_team_invite(uuid)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.accept_team_invite(p_invite_id uuid)
      RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
DECLARE
  v_team_id uuid;
BEGIN
  SELECT team_id INTO v_team_id FROM public.team_invites WHERE id = p_invite_id AND invited_user = auth.uid() AND status = 'pending';
  IF v_team_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Invite not found'); END IF;
  UPDATE public.team_invites SET status = 'accepted' WHERE id = p_invite_id;
  INSERT INTO public.team_members (team_id, user_id) VALUES (v_team_id, auth.uid()) ON CONFLICT DO NOTHING;
  UPDATE public.profiles SET team_id = v_team_id WHERE id = auth.uid();
  RETURN jsonb_build_object('success', true);
END;
$body$;
    $fn$;
  END IF;
END;
$guarded_accept_team_invite$;

DO $guarded_leave_team$
BEGIN
  IF to_regprocedure('public.leave_team(uuid, uuid)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.leave_team(p_team_id uuid, p_user_id uuid DEFAULT NULL)
      RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
DECLARE
  v_user_id uuid := COALESCE(p_user_id, auth.uid());
BEGIN
  IF v_user_id <> auth.uid() AND NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not allowed');
  END IF;
  DELETE FROM public.team_members WHERE team_id = p_team_id AND user_id = v_user_id;
  UPDATE public.profiles SET team_id = NULL WHERE id = v_user_id AND team_id = p_team_id;
  RETURN jsonb_build_object('success', true);
END;
$body$;
    $fn$;
  END IF;
END;
$guarded_leave_team$;

DO $guarded_rpc$
BEGIN
  IF to_regprocedure('public.delete_tournament_complete(uuid)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.delete_tournament_complete(tournament_id uuid)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      BEGIN
        IF NOT public.is_role(ARRAY['founder','fondateur','admin','super_admin']) THEN
          RAISE EXCEPTION 'Staff only';
        END IF;
        DELETE FROM public.tournaments WHERE id = tournament_id;
      END;
      $body$;
    $fn$;
  END IF;
END;
$guarded_rpc$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'set_user_role'
      AND pg_get_function_identity_arguments(p.oid) = 'target_user uuid, new_role text'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION public.set_user_role(target_user uuid, new_role text)
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      BEGIN
        IF NOT public.is_role(ARRAY['super_admin']) THEN RETURN jsonb_build_object('success', false, 'error', 'Super admin only'); END IF;
        IF new_role NOT IN ('super_admin','admin','founder','fondateur','designer','user','banned') THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid role'); END IF;
        UPDATE public.profiles SET role = new_role, updated_at = now() WHERE id = target_user;
        RETURN jsonb_build_object('success', true);
      END;
      $body$;
    $fn$;
  END IF;
END;
$$;

DO $guarded_rpc$
BEGIN
  IF to_regprocedure('public.ban_user(uuid, timestamp with time zone, uuid)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.ban_user(target_user uuid, banned_until timestamptz DEFAULT NULL, banned_by uuid DEFAULT NULL)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      BEGIN
        IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
        UPDATE public.profiles SET role = 'banned', banned_until = ban_user.banned_until, banned_by = COALESCE(ban_user.banned_by, auth.uid()) WHERE id = target_user;
      END;
      $body$;
    $fn$;
  END IF;

  IF to_regprocedure('public.unban_user(uuid)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.unban_user(target_user uuid)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      BEGIN
        IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
        UPDATE public.profiles SET role = 'user', banned_until = NULL, banned_by = NULL WHERE id = target_user AND role = 'banned';
      END;
      $body$;
    $fn$;
  END IF;

  IF to_regprocedure('public.delete_user_complete(uuid)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.delete_user_complete(target_user uuid)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, auth
      AS $body$
      BEGIN
        IF NOT public.is_role(ARRAY['super_admin']) THEN RAISE EXCEPTION 'Super admin only'; END IF;
        DELETE FROM public.profiles WHERE id = target_user;
        DELETE FROM auth.users WHERE id = target_user;
      END;
      $body$;
    $fn$;
  END IF;
END;
$guarded_rpc$;

DO $guarded_get_disputed_tournaments$
BEGIN
  IF to_regprocedure('public.get_disputed_tournaments()') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.get_disputed_tournaments()
      RETURNS TABLE (tournament_id uuid, tournament_name text, submissions bigint, dispute_reason text, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $body$
  SELECT t.id, t.name, COUNT(mr.id), mv.dispute_reason, mv.created_at
  FROM public.tournaments t
  JOIN public.match_verifications mv ON mv.tournament_id = t.id
  LEFT JOIN public.match_results mr ON mr.tournament_id = t.id
  WHERE public.is_admin() AND (mv.status = 'disputed' OR t.status = 'disputed')
  GROUP BY t.id, t.name, mv.dispute_reason, mv.created_at
  ORDER BY mv.created_at DESC;
$body$;
    $fn$;
  END IF;
END;
$guarded_get_disputed_tournaments$;

DO $guarded_get_tournament_submissions$
BEGIN
  IF to_regprocedure('public.get_tournament_submissions(uuid)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.get_tournament_submissions(p_tournament_id uuid)
      RETURNS TABLE (
  result_id uuid, user_id uuid, username text, avatar_url text, rank integer,
  kills integer, points integer, coins_awarded integer, status text,
  is_mvp boolean, screenshot_url text, submitted_at timestamptz,
  verified_at timestamptz, fair_play_score integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $body$
  SELECT mr.id, mr.user_id, p.username, p.avatar_url, mr.rank, mr.kills, mr.points,
         mr.coins_awarded, mr.status, mr.is_mvp, mr.screenshot_url,
         mr.submitted_at, mr.verified_at, p.fair_play_score
  FROM public.match_results mr
  JOIN public.profiles p ON p.id = mr.user_id
  WHERE public.is_admin() AND mr.tournament_id = p_tournament_id
  ORDER BY mr.rank ASC NULLS LAST, mr.kills DESC;
$body$;
    $fn$;
  END IF;
END;
$guarded_get_tournament_submissions$;

DO $guarded_admin_verify_result$
BEGIN
  IF to_regprocedure('public.admin_verify_result(uuid, text)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.admin_verify_result(p_result_id uuid, p_action text)
      RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
BEGIN
  IF NOT public.is_role(ARRAY['founder','fondateur','admin','super_admin']) THEN RETURN jsonb_build_object('success', false, 'error', 'Staff only'); END IF;
  IF p_action NOT IN ('approve','reject') THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid action'); END IF;
  UPDATE public.match_results
  SET status = CASE WHEN p_action = 'approve' THEN 'verified' ELSE 'rejected' END,
      verified_at = now(),
      verified_by = auth.uid(),
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = p_result_id;
  RETURN jsonb_build_object('success', true, 'action', p_action);
END;
$body$;
    $fn$;
  END IF;
END;
$guarded_admin_verify_result$;

DO $guarded_force_resolve_dispute$
BEGIN
  IF to_regprocedure('public.force_resolve_dispute(uuid, uuid[])') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.force_resolve_dispute(p_tournament_id uuid, p_result_ids uuid[])
      RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('success', false, 'error', 'Admin only'); END IF;
  UPDATE public.match_results SET status = 'verified', verified_at = now(), verified_by = auth.uid()
  WHERE tournament_id = p_tournament_id AND id = ANY(p_result_ids);
  UPDATE public.match_results SET status = 'rejected', verified_at = now(), verified_by = auth.uid()
  WHERE tournament_id = p_tournament_id AND NOT (id = ANY(p_result_ids));
  UPDATE public.tournaments SET status = 'completed', updated_at = now() WHERE id = p_tournament_id;
  RETURN jsonb_build_object('success', true);
END;
$body$;
    $fn$;
  END IF;
END;
$guarded_force_resolve_dispute$;

DO $guarded_rpc$
BEGIN
  IF to_regprocedure('public.send_gift(uuid, uuid, integer, text)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.send_gift(p_receiver_id uuid, p_item_id uuid DEFAULT NULL, p_amount integer DEFAULT 0, p_message text DEFAULT NULL)
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      DECLARE
        v_sender uuid := auth.uid();
        v_balance integer;
        v_gift_id uuid;
      BEGIN
        IF p_amount > 0 THEN
          SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_sender FOR UPDATE;
          IF COALESCE(v_balance, 0) < p_amount THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance'); END IF;
          UPDATE public.wallets SET balance = balance - p_amount, updated_at = now() WHERE user_id = v_sender;
          INSERT INTO public.wallet_transactions (user_id, amount, type, reason) VALUES (v_sender, -p_amount, 'gift_sent', 'Gift sent');
        END IF;
        INSERT INTO public.gift_transactions (sender_id, receiver_id, item_id, coins, message)
        VALUES (v_sender, p_receiver_id, p_item_id, COALESCE(p_amount,0), p_message)
        RETURNING id INTO v_gift_id;
        RETURN jsonb_build_object('success', true, 'gift_id', v_gift_id);
      END;
      $body$;
    $fn$;
  END IF;

  IF to_regprocedure('public.start_new_season(text, integer, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.start_new_season(
        p_name text,
        p_number integer DEFAULT NULL,
        p_description text DEFAULT NULL,
        p_reset_coins boolean DEFAULT false,
        p_reset_xp boolean DEFAULT false,
        p_reset_stats boolean DEFAULT true,
        p_reset_wins boolean DEFAULT true,
        p_reset_avatars boolean DEFAULT false,
        p_reset_chat boolean DEFAULT true,
        p_reset_tournaments boolean DEFAULT true,
        p_reset_clans boolean DEFAULT false
      )
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      DECLARE
        v_id uuid;
      BEGIN
        IF NOT public.is_role(ARRAY['super_admin']) THEN RETURN jsonb_build_object('success', false, 'error', 'Super admin only'); END IF;
        UPDATE public.seasons SET status = 'completed', end_date = now() WHERE status = 'active';
        IF p_number IS NULL THEN
          SELECT COALESCE(MAX(number), 0) + 1 INTO p_number FROM public.seasons;
        END IF;
        INSERT INTO public.seasons (name, number) VALUES (p_name, p_number) RETURNING id INTO v_id;
        RETURN jsonb_build_object('success', true, 'new_season_id', v_id);
      END;
      $body$;
    $fn$;
  END IF;
END;
$guarded_rpc$;

DO $guarded_analytics_platform_summary$
BEGIN
  IF to_regprocedure('public.analytics_platform_summary()') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.analytics_platform_summary()
      RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $body$
  SELECT CASE WHEN public.is_admin() THEN jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM public.profiles),
    'total_tournaments', (SELECT COUNT(*) FROM public.tournaments),
    'total_coins', (SELECT COALESCE(SUM(balance),0) FROM public.wallets),
    'total_matches', (SELECT COUNT(*) FROM public.match_results)
  ) ELSE jsonb_build_object('error','Admin only') END;
$body$;
    $fn$;
  END IF;
END;
$guarded_analytics_platform_summary$;

DO $guarded_analytics_registrations_daily$
BEGIN
  IF to_regprocedure('public.analytics_registrations_daily(integer)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.analytics_registrations_daily(p_days integer DEFAULT 30)
      RETURNS TABLE(day date, count bigint) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $body$
  SELECT DATE(created_at), COUNT(*) FROM public.profiles
  WHERE public.is_admin() AND created_at >= now() - (p_days || ' days')::interval
  GROUP BY DATE(created_at) ORDER BY 1;
$body$;
    $fn$;
  END IF;
END;
$guarded_analytics_registrations_daily$;

DO $guarded_analytics_tournaments_weekly$
BEGIN
  IF to_regprocedure('public.analytics_tournaments_weekly(integer)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.analytics_tournaments_weekly(p_weeks integer DEFAULT 12)
      RETURNS TABLE(week_start date, created bigint, completed bigint) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $body$
  SELECT date_trunc('week', created_at)::date, COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
  FROM public.tournaments WHERE public.is_admin() AND created_at >= now() - (p_weeks || ' weeks')::interval
  GROUP BY 1 ORDER BY 1;
$body$;
    $fn$;
  END IF;
END;
$guarded_analytics_tournaments_weekly$;

DO $guarded_analytics_coin_flow_daily$
BEGIN
  IF to_regprocedure('public.analytics_coin_flow_daily(integer)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.analytics_coin_flow_daily(p_days integer DEFAULT 30)
      RETURNS TABLE(day date, credits bigint, debits bigint, net bigint) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $body$
  SELECT DATE(created_at),
         COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END),0)::bigint,
         COALESCE(ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)),0)::bigint,
         COALESCE(SUM(amount),0)::bigint
  FROM public.wallet_transactions WHERE public.is_admin() AND created_at >= now() - (p_days || ' days')::interval
  GROUP BY DATE(created_at) ORDER BY 1;
$body$;
    $fn$;
  END IF;
END;
$guarded_analytics_coin_flow_daily$;

DO $guarded_analytics_top_earners$
BEGIN
  IF to_regprocedure('public.analytics_top_earners(integer)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.analytics_top_earners(p_limit integer DEFAULT 10)
      RETURNS TABLE(username text, avatar_url text, balance bigint, fair_play_score integer, is_verified boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $body$
  SELECT p.username, p.avatar_url, w.balance::bigint, p.fair_play_score, p.is_verified
  FROM public.wallets w JOIN public.profiles p ON p.id = w.user_id
  WHERE public.is_admin() ORDER BY w.balance DESC LIMIT p_limit;
$body$;
    $fn$;
  END IF;
END;
$guarded_analytics_top_earners$;

DO $guarded_analytics_tournament_breakdown$
BEGIN
  IF to_regprocedure('public.analytics_tournament_breakdown()') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.analytics_tournament_breakdown()
      RETURNS TABLE(status text, count bigint) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $body$
  SELECT status, COUNT(*) FROM public.tournaments WHERE public.is_admin() GROUP BY status ORDER BY 2 DESC;
$body$;
    $fn$;
  END IF;
END;
$guarded_analytics_tournament_breakdown$;

DO $guarded_analytics_referral_summary$
BEGIN
  IF to_regprocedure('public.analytics_referral_summary()') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.analytics_referral_summary()
      RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $body$
  SELECT CASE WHEN public.is_admin() THEN jsonb_build_object(
    'active_codes', (SELECT COUNT(*) FROM public.referral_codes WHERE is_active),
    'total_referrals', (SELECT COUNT(*) FROM public.referral_uses),
    'rewarded', (SELECT COUNT(*) FROM public.referral_uses WHERE rewarded)
  ) ELSE jsonb_build_object('error','Admin only') END;
$body$;
    $fn$;
  END IF;
END;
$guarded_analytics_referral_summary$;

DO $guarded_vote_feature$
BEGIN
  IF to_regprocedure('public.vote_feature(uuid, integer)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.vote_feature(p_request_id uuid, p_vote integer)
      RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
BEGIN
  INSERT INTO public.feature_votes (request_id, user_id, vote)
  VALUES (p_request_id, auth.uid(), CASE WHEN p_vote >= 0 THEN 1 ELSE -1 END)
  ON CONFLICT (request_id, user_id) DO UPDATE SET vote = EXCLUDED.vote;
  RETURN jsonb_build_object('success', true);
END;
$body$;
    $fn$;
  END IF;
END;
$guarded_vote_feature$;

DO $guarded_submit_feature_request$
BEGIN
  IF to_regprocedure('public.submit_feature_request(text, text, text)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.submit_feature_request(p_title text, p_description text, p_category text DEFAULT 'feature')
      RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.feature_requests (user_id, title, description, category)
  VALUES (auth.uid(), p_title, p_description, p_category) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$body$;
    $fn$;
  END IF;
END;
$guarded_submit_feature_request$;

DO $guarded_comment_feature$
BEGIN
  IF to_regprocedure('public.comment_feature(uuid, text)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.comment_feature(p_request_id uuid, p_content text)
      RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
BEGIN
  INSERT INTO public.feature_comments (request_id, user_id, comment, content) VALUES (p_request_id, auth.uid(), p_content, p_content);
  RETURN jsonb_build_object('success', true);
END;
$body$;
    $fn$;
  END IF;
END;
$guarded_comment_feature$;

DO $guarded_submit_bug_report$
BEGIN
  IF to_regprocedure('public.submit_bug_report(text, text, text, text, text, text, text, text, text)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.submit_bug_report(p_title text,
  p_description text,
  p_category text DEFAULT 'general',
  p_severity text DEFAULT 'medium',
  p_steps text DEFAULT NULL,
  p_screenshot_url text DEFAULT NULL,
  p_affected_page text DEFAULT NULL,
  p_device_info text DEFAULT NULL,
  p_browser_info text DEFAULT NULL)
      RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.bug_reports (user_id, title, description, category, severity, steps_to_repro, screenshot_url, evidence_url, affected_page, device_info, browser_info)
  VALUES (auth.uid(), p_title, p_description, p_category, COALESCE(p_severity,'medium'), p_steps, p_screenshot_url, p_screenshot_url, p_affected_page, p_device_info, p_browser_info)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$body$;
    $fn$;
  END IF;
END;
$guarded_submit_bug_report$;

DO $guarded_get_my_readiness$
BEGIN
  IF to_regprocedure('public.get_my_readiness()') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.get_my_readiness()
      RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $body$
  SELECT jsonb_build_object('success', true, 'score', LEAST(100, COALESCE(level,1) * 10), 'level', level)
  FROM public.profiles WHERE id = auth.uid();
$body$;
    $fn$;
  END IF;
END;
$guarded_get_my_readiness$;

DO $guarded_submit_admin_application$
BEGIN
  IF to_regprocedure('public.submit_admin_application(text, text, text, text, text, text)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.submit_admin_application(p_why_join text DEFAULT NULL,
  p_experience text DEFAULT NULL,
  p_conflict_scenario text DEFAULT NULL,
  p_availability text DEFAULT NULL,
  p_languages text DEFAULT NULL,
  p_extra text DEFAULT NULL)
      RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.admin_applications (user_id, motivation, q_why_join, q_experience, q_conflict_scenario, q_availability, q_languages, q_extra)
  VALUES (auth.uid(), p_why_join, p_why_join, p_experience, p_conflict_scenario, p_availability, p_languages, p_extra)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$body$;
    $fn$;
  END IF;
END;
$guarded_submit_admin_application$;

DO $guarded_admin_review_idea$
BEGIN
  IF to_regprocedure('public.admin_review_idea(uuid, text, text)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.admin_review_idea(p_request_id uuid, p_status text, p_note text DEFAULT NULL)
      RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('success', false, 'error', 'Admin only'); END IF;
  UPDATE public.feature_requests SET status = p_status, admin_note = p_note, reviewed_by = auth.uid(), updated_at = now() WHERE id = p_request_id;
  RETURN jsonb_build_object('success', true);
END;
$body$;
    $fn$;
  END IF;
END;
$guarded_admin_review_idea$;

DO $guarded_admin_review_bug$
BEGIN
  IF to_regprocedure('public.admin_review_bug(uuid, text, text)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.admin_review_bug(p_report_id uuid, p_status text, p_note text DEFAULT NULL)
      RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('success', false, 'error', 'Admin only'); END IF;
  UPDATE public.bug_reports SET status = p_status, admin_note = p_note, reviewed_by = auth.uid() WHERE id = p_report_id;
  RETURN jsonb_build_object('success', true);
END;
$body$;
    $fn$;
  END IF;
END;
$guarded_admin_review_bug$;

DO $guarded_admin_review_application$
BEGIN
  IF to_regprocedure('public.admin_review_application(uuid, text, text)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.admin_review_application(p_app_id uuid, p_status text, p_note text DEFAULT NULL)
      RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('success', false, 'error', 'Admin only'); END IF;
  UPDATE public.admin_applications SET status = p_status, admin_note = p_note, reviewed_by = auth.uid() WHERE id = p_app_id;
  RETURN jsonb_build_object('success', true);
END;
$body$;
    $fn$;
  END IF;
END;
$guarded_admin_review_application$;

DO $guarded_privileges$
DECLARE
  restricted_sig text;
  grant_sig text;
BEGIN
  FOREACH restricted_sig IN ARRAY ARRAY[
    'public.admin_adjust_coins(uuid, integer, text)',
    'public.set_user_role(uuid, text)',
    'public.delete_user_complete(uuid)',
    'public.delete_tournament_complete(uuid)',
    'public.ban_user(uuid, timestamp with time zone, uuid)',
    'public.unban_user(uuid)'
  ]
  LOOP
    IF to_regprocedure(restricted_sig) IS NOT NULL THEN
      EXECUTE 'REVOKE ' || 'EXECUTE ON FUNCTION ' || restricted_sig || ' FROM PUBLIC';
      EXECUTE 'REVOKE ' || 'EXECUTE ON FUNCTION ' || restricted_sig || ' FROM anon';
      EXECUTE 'REVOKE ' || 'EXECUTE ON FUNCTION ' || restricted_sig || ' FROM authenticated';
    END IF;
  END LOOP;

  FOREACH grant_sig IN ARRAY ARRAY[
    'public.check_user_permission(uuid, text, text)',
    'public.join_tournament(uuid)',
    'public.leave_tournament(uuid, uuid)',
    'public.approve_tournament_request(uuid, uuid, uuid, uuid, boolean)',
    'public.setup_room(uuid)',
    'public.start_match(uuid, uuid)',
    'public.sync_room_status(uuid)',
    'public.close_registration(uuid)',
    'public.submit_match_result(uuid, integer, integer, text, integer, uuid, integer)',
    'public.update_player_stats(uuid, integer, integer, integer, integer)',
    'public.purchase_item(uuid)',
    'public.equip_item(uuid)',
    'public.admin_grant_item(uuid, uuid, text)',
    'public.admin_remove_item(uuid, uuid)',
    'public.claim_daily_reward(uuid)',
    'public.claim_mission_reward(uuid, uuid)',
    'public.create_team(text, text, text, text, boolean, uuid)',
    'public.accept_team_invite(uuid)',
    'public.leave_team(uuid, uuid)',
    'public.get_disputed_tournaments()',
    'public.get_tournament_submissions(uuid)',
    'public.admin_verify_result(uuid, text)',
    'public.force_resolve_dispute(uuid, uuid[])',
    'public.send_gift(uuid, uuid, integer, text)',
    'public.start_new_season(text, integer, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean)',
    'public.analytics_platform_summary()',
    'public.analytics_registrations_daily(integer)',
    'public.analytics_tournaments_weekly(integer)',
    'public.analytics_coin_flow_daily(integer)',
    'public.analytics_top_earners(integer)',
    'public.analytics_tournament_breakdown()',
    'public.analytics_referral_summary()',
    'public.vote_feature(uuid, integer)',
    'public.submit_feature_request(text, text, text)',
    'public.comment_feature(uuid, text)',
    'public.submit_bug_report(text, text, text, text, text, text, text, text, text)',
    'public.get_my_readiness()',
    'public.submit_admin_application(text, text, text, text, text, text)',
    'public.admin_review_idea(uuid, text, text)',
    'public.admin_review_bug(uuid, text, text)',
    'public.admin_review_application(uuid, text, text)'
  ]
  LOOP
    IF to_regprocedure(grant_sig) IS NOT NULL THEN
      EXECUTE 'GRANT ' || 'EXECUTE ON FUNCTION ' || grant_sig || ' TO authenticated';
    END IF;
  END LOOP;
END;
$guarded_privileges$;
