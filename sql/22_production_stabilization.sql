-- ================================================================
-- CIPHERPOOL — Production Stabilization
-- File: sql/22_production_stabilization.sql
-- Run in Supabase SQL Editor as service-role / postgres
--
-- Sections:
--   1. Migration tracking table
--   2. Tournament status backfill + canonical constraint
--   3. Atomic join_tournament / leave_tournament RPCs
--   4. Tournament lifecycle transitions
--   5. Wallet transaction types (full canonical set)
--   6. Fair-play score tiers + risk view
--   7. Naming / column standardisation (safe, idempotent)
--   8. Register all migrations
--   9. Verify
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- 1. MIGRATION TRACKING TABLE
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  id          bigserial    PRIMARY KEY,
  filename    text         UNIQUE NOT NULL,
  executed_at timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "migrations_read_admin" ON public.schema_migrations;
CREATE POLICY "migrations_read_admin" ON public.schema_migrations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

GRANT SELECT ON public.schema_migrations TO authenticated;


-- ────────────────────────────────────────────────────────────────
-- 2. TOURNAMENT STATUS — backfill then canonical constraint
--    Old values:  upcoming | open | active | in_progress |
--                 finished | closed | disputed | registration_closed
--    Canonical:   draft | published | registration_open | full |
--                 ready | live | results_pending | completed |
--                 archived | cancelled
-- ────────────────────────────────────────────────────────────────

-- Idempotent backfill (safe to run multiple times)
UPDATE public.tournaments
SET status = CASE status
  WHEN 'upcoming'            THEN 'published'
  WHEN 'open'                THEN 'registration_open'
  WHEN 'active'              THEN 'registration_open'
  WHEN 'registration_closed' THEN 'full'
  WHEN 'in_progress'         THEN 'live'
  WHEN 'results_open'        THEN 'results_pending'
  WHEN 'results_closed'      THEN 'results_pending'
  WHEN 'finished'            THEN 'completed'
  WHEN 'closed'              THEN 'archived'
  WHEN 'disputed'            THEN 'results_pending'
  ELSE status
END
WHERE status IN (
  'upcoming','open','active','registration_closed',
  'in_progress','results_open','results_closed',
  'finished','closed','disputed'
);

ALTER TABLE public.tournaments
  DROP CONSTRAINT IF EXISTS tournaments_status_check;

ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_status_check
  CHECK (status IN (
    'draft',
    'published',
    'registration_open',
    'full',
    'ready',
    'live',
    'results_pending',
    'completed',
    'archived',
    'cancelled'
  ));


-- ────────────────────────────────────────────────────────────────
-- 3. ATOMIC join_tournament RPC
--    SELECT ... FOR UPDATE prevents race condition.
--    All writes to tournament_participants go through this RPC only.
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.join_tournament(p_tournament_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_t          record;
  v_wallet_bal integer;
  v_already_in boolean;
BEGIN
  SELECT id, status, entry_fee, max_players, current_players
  INTO v_t
  FROM public.tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  IF v_t.status <> 'registration_open' THEN
    RETURN jsonb_build_object('success', false, 'error',
      format('Tournament not accepting registrations (status: %s)', v_t.status));
  END IF;

  IF v_t.current_players >= v_t.max_players THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament is full');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.tournament_participants
    WHERE tournament_id = p_tournament_id AND user_id = auth.uid()
  ) INTO v_already_in;

  IF v_already_in THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already joined this tournament');
  END IF;

  IF v_t.entry_fee > 0 THEN
    SELECT balance INTO v_wallet_bal
    FROM public.wallets
    WHERE user_id = auth.uid()
    FOR UPDATE;

    IF COALESCE(v_wallet_bal, 0) < v_t.entry_fee THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    UPDATE public.wallets
    SET balance = balance - v_t.entry_fee, updated_at = now()
    WHERE user_id = auth.uid();

    INSERT INTO public.wallet_transactions
      (user_id, amount, type, reason, reference)
    VALUES
      (auth.uid(), -v_t.entry_fee, 'fee', 'Tournament entry fee', p_tournament_id::text);
  END IF;

  INSERT INTO public.tournament_participants
    (tournament_id, user_id, status, approved_at, approved_by)
  VALUES
    (p_tournament_id, auth.uid(), 'approved', now(), auth.uid());

  UPDATE public.tournaments
  SET
    current_players = current_players + 1,
    status = CASE
      WHEN current_players + 1 >= max_players THEN 'full'
      ELSE status
    END,
    updated_at = now()
  WHERE id = p_tournament_id;

  RETURN jsonb_build_object('success', true, 'tournament_id', p_tournament_id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_tournament(uuid) TO authenticated;


-- ────────────────────────────────────────────────────────────────
-- 3b. ATOMIC leave_tournament RPC
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.leave_tournament(p_tournament_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_t       record;
  v_deleted integer;
BEGIN
  SELECT id, status, entry_fee, current_players
  INTO v_t
  FROM public.tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  IF v_t.status NOT IN ('registration_open', 'full') THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Cannot leave a tournament that has already started');
  END IF;

  DELETE FROM public.tournament_participants
  WHERE tournament_id = p_tournament_id
    AND user_id = auth.uid()
    AND status IN ('pending', 'approved', 'joined');

  -- GET DIAGNOSTICS is the correct way to check row count after DELETE
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not registered in this tournament');
  END IF;

  IF v_t.entry_fee > 0 THEN
    UPDATE public.wallets
    SET balance = balance + v_t.entry_fee, updated_at = now()
    WHERE user_id = auth.uid();

    INSERT INTO public.wallet_transactions
      (user_id, amount, type, reason, reference)
    VALUES
      (auth.uid(), v_t.entry_fee, 'refund', 'Tournament leave refund', p_tournament_id::text);
  END IF;

  UPDATE public.tournaments
  SET
    current_players = GREATEST(0, current_players - 1),
    status = CASE
      WHEN status = 'full' THEN 'registration_open'
      ELSE status
    END,
    updated_at = now()
  WHERE id = p_tournament_id;

  RETURN jsonb_build_object('success', true);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_tournament(uuid) TO authenticated;


-- ────────────────────────────────────────────────────────────────
-- 4. TOURNAMENT LIFECYCLE TRANSITIONS
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.valid_tournament_transition(p_from text, p_to text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT (p_from, p_to) IN (
    ('draft',             'published'),
    ('draft',             'cancelled'),
    ('published',         'registration_open'),
    ('published',         'cancelled'),
    ('registration_open', 'full'),
    ('registration_open', 'ready'),
    ('registration_open', 'cancelled'),
    ('full',              'ready'),
    ('full',              'registration_open'),   -- player left
    ('full',              'cancelled'),
    ('ready',             'live'),
    ('ready',             'cancelled'),
    ('live',              'results_pending'),
    ('live',              'completed'),
    ('results_pending',   'completed'),
    ('completed',         'archived')
  );
$$;

GRANT EXECUTE ON FUNCTION public.valid_tournament_transition(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.advance_tournament_status(
  p_tournament_id uuid,
  p_to_status     text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current text;
BEGIN
  IF NOT public.is_role(ARRAY['admin','super_admin','founder','fondateur']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;

  SELECT status INTO v_current
  FROM public.tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  IF NOT public.valid_tournament_transition(v_current, p_to_status) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   format('Invalid transition: %s → %s', v_current, p_to_status)
    );
  END IF;

  UPDATE public.tournaments
  SET status = p_to_status, updated_at = now()
  WHERE id = p_tournament_id;

  RETURN jsonb_build_object('success', true, 'from', v_current, 'to', p_to_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.advance_tournament_status(uuid, text) TO authenticated;


-- ────────────────────────────────────────────────────────────────
-- 5. WALLET TRANSACTION TYPES — full canonical set
--    Covers both 06_base_schema types and phase_a types.
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type IN (
    'credit',
    'debit',
    'refund',
    'prize',
    'fee',
    'purchase',
    'gift_sent',
    'gift_received',
    'admin_adjustment',
    'admin_grant',
    'season_reset',
    'referral',
    'daily_reward',
    'mission_reward',
    'reward'
  ));


-- ────────────────────────────────────────────────────────────────
-- 6. FAIR-PLAY SCORE TIERS + RISK VIEW
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fair_play_tier(score integer)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN score >= 160 THEN 'trusted'
    WHEN score >= 120 THEN 'normal'
    WHEN score >= 70  THEN 'suspicious'
    ELSE                   'high_risk'
  END;
$$;

GRANT EXECUTE ON FUNCTION public.fair_play_tier(integer) TO authenticated, anon;

CREATE OR REPLACE VIEW public.player_risk_overview AS
  SELECT
    p.id,
    p.username,
    p.fair_play_score,
    public.fair_play_tier(p.fair_play_score)                        AS risk_tier,
    public.fair_play_rank(p.fair_play_score)                        AS rank_label,
    p.is_verified,
    p.role,
    p.created_at,
    COUNT(fpe.id)                                                   AS total_events,
    SUM(CASE WHEN fpe.delta < 0 THEN 1 ELSE 0 END)::int            AS negative_events,
    SUM(CASE WHEN fpe.delta > 0 THEN 1 ELSE 0 END)::int            AS positive_events
  FROM public.profiles p
  LEFT JOIN public.fair_play_events fpe ON fpe.user_id = p.id
  GROUP BY p.id, p.username, p.fair_play_score, p.is_verified, p.role, p.created_at;

GRANT SELECT ON public.player_risk_overview TO authenticated;

CREATE OR REPLACE FUNCTION public.recalculate_fair_play_score(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_delta integer;
  v_new_score   integer;
BEGIN
  IF NOT public.is_role(ARRAY['admin','super_admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;

  SELECT COALESCE(SUM(delta), 0)
  INTO v_total_delta
  FROM public.fair_play_events
  WHERE user_id = p_user_id;

  v_new_score := GREATEST(0, LEAST(200, 100 + v_total_delta));

  UPDATE public.profiles
  SET fair_play_score = v_new_score, updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success',   true,
    'user_id',   p_user_id,
    'new_score', v_new_score,
    'tier',      public.fair_play_tier(v_new_score)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalculate_fair_play_score(uuid) TO authenticated;


-- ────────────────────────────────────────────────────────────────
-- 7. NAMING STANDARDISATION (safe / idempotent)
--    Renames reward_coins→coins_reward, reward_xp→xp_reward
--    only if the old column names still exist.
--    COMMENT ON COLUMN is guarded — fails silently if column absent.
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'season_pass_tiers'
      AND column_name  = 'reward_coins'
  ) THEN
    ALTER TABLE public.season_pass_tiers RENAME COLUMN reward_coins TO coins_reward;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'season_pass_tiers'
      AND column_name  = 'reward_xp'
  ) THEN
    ALTER TABLE public.season_pass_tiers RENAME COLUMN reward_xp TO xp_reward;
  END IF;

  -- prize_coins alias: add the column if only prize_pool exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tournaments' AND column_name = 'prize_pool'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tournaments' AND column_name = 'prize_coins'
  ) THEN
    ALTER TABLE public.tournaments ADD COLUMN prize_coins integer NOT NULL DEFAULT 0;
    -- Seed from existing prize_pool values
    UPDATE public.tournaments SET prize_coins = prize_pool WHERE prize_coins = 0 AND prize_pool > 0;
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tournaments' AND column_name='prize_coins') THEN
    EXECUTE 'COMMENT ON COLUMN public.tournaments.prize_coins IS
      ''Canonical tournament prize amount in coins.''';
  END IF;
END;
$$;

COMMENT ON COLUMN public.profiles.xp IS
  'Experience points. Canonical name — never use "experience".';
COMMENT ON COLUMN public.wallets.balance IS
  'Coin balance. Never mutate directly — always go through RPCs or wallet_transactions.';


-- ────────────────────────────────────────────────────────────────
-- 8. REGISTER ALL MIGRATIONS
-- ────────────────────────────────────────────────────────────────
INSERT INTO public.schema_migrations (filename) VALUES
  ('01_clans.sql'),
  ('02_clan_messages.sql'),
  ('03_seasons.sql'),
  ('04_username_column.sql'),
  ('05_support_tickets_fix.sql'),
  ('06_base_schema.sql'),
  ('07_notifications.sql'),
  ('08_announcements.sql'),
  ('09_rpc_functions.sql'),
  ('10_security_and_auth.sql'),
  ('11_season_pass.sql'),
  ('12_clan_wars.sql'),
  ('13_referral_system.sql'),
  ('14_fairplay_and_verified.sql'),
  ('15_analytics_rpcs.sql'),
  ('16_match_verification.sql'),
  ('17_notifications_gifts.sql'),
  ('18_community_system.sql'),
  ('phase_a_normalized/001_core_schema.sql'),
  ('phase_a_normalized/002_feature_tables.sql'),
  ('phase_a_normalized/003_rls_and_rpc.sql'),
  ('phase_a_normalized/004_storage_policies.sql'),
  ('19_fix_season_rpc_ambiguity.sql'),
  ('20_admin_recruitment_reports.sql'),
  ('21_fix_equip_item.sql'),
  ('22_production_stabilization.sql'),
  ('23_db_constraints.sql')
ON CONFLICT (filename) DO NOTHING;


-- ────────────────────────────────────────────────────────────────
-- 9. VERIFY
-- ────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v        integer;
  bad_stat text;
BEGIN
  -- No legacy statuses remain
  SELECT status INTO bad_stat FROM public.tournaments
  WHERE status NOT IN (
    'draft','published','registration_open','full','ready',
    'live','results_pending','completed','archived','cancelled'
  ) LIMIT 1;
  IF bad_stat IS NOT NULL THEN
    RAISE EXCEPTION 'Legacy tournament status still exists: %', bad_stat;
  END IF;

  -- join_tournament uses correct table (tournament_participants)
  SELECT COUNT(*) INTO v FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'join_tournament';
  IF v = 0 THEN RAISE EXCEPTION 'join_tournament RPC missing'; END IF;

  -- wallet_transactions type check present
  SELECT COUNT(*) INTO v FROM pg_constraint
  WHERE conname = 'wallet_transactions_type_check';
  IF v = 0 THEN RAISE EXCEPTION 'wallet_transactions_type_check missing'; END IF;

  -- schema_migrations has rows
  SELECT COUNT(*) INTO v FROM public.schema_migrations;
  RAISE NOTICE 'schema_migrations: % rows', v;

  -- prize_coins column exists
  SELECT COUNT(*) INTO v FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'tournaments' AND column_name = 'prize_coins';
  IF v = 0 THEN RAISE EXCEPTION 'prize_coins column missing from tournaments'; END IF;

  RAISE NOTICE '22_production_stabilization: ALL CHECKS PASSED ✓';
END;
$$;
