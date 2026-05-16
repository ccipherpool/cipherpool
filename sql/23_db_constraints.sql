-- ================================================================
-- CIPHERPOOL — DB Constraints, Hardening & Core RPCs
-- File: sql/23_db_constraints.sql
-- Run AFTER 22_production_stabilization.sql
--
-- Sections:
--   0. Safety backfill (idempotent)
--   1. Tournament status canonical constraint
--   2. Capacity constraint
--   3. Room status canonical constraint
--   4. prize_coins column guarantee
--   5. wallet_transactions type constraint (full set)
--   6. join_tournament RPC (atomic, with notification)
--   7. leave_tournament RPC (atomic, with refund)
--   8. advance_tournament_status RPC
--   9. award_prizes RPC
--  10. Indexes
--  11. player_stats guard constraints
--  12. Register
--  13. Verify
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- 0. SAFETY BACKFILL (idempotent — safe to re-run)
-- ────────────────────────────────────────────────────────────────
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


-- ────────────────────────────────────────────────────────────────
-- 1. TOURNAMENT STATUS — canonical constraint
-- ────────────────────────────────────────────────────────────────
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
-- 2. CAPACITY CONSTRAINT: current_players <= max_players
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.tournaments
  DROP CONSTRAINT IF EXISTS tournaments_capacity_check;

UPDATE public.tournaments
SET current_players = max_players
WHERE current_players > max_players;

ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_capacity_check
  CHECK (current_players <= max_players);


-- ────────────────────────────────────────────────────────────────
-- 3. ROOM STATUS — canonical constraint
--    room_status is a separate column that tracks the room lifecycle
--    independently of the tournament lifecycle.
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.tournaments
  DROP CONSTRAINT IF EXISTS tournaments_room_status_check;

-- Backfill room_status legacy values
UPDATE public.tournaments
SET room_status = CASE room_status
  WHEN 'registration' THEN 'pending'
  WHEN 'waiting'      THEN 'setup'
  ELSE room_status
END
WHERE room_status IN ('registration', 'waiting');

ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_room_status_check
  CHECK (room_status IN (
    'pending',         -- default: no room yet
    'setup',           -- admin setting room credentials
    'open',            -- room ID/password published to players
    'live',            -- match underway
    'results_open',    -- submitting results
    'results_closed',  -- results locked
    'finished'         -- room lifecycle done
  ));


-- ────────────────────────────────────────────────────────────────
-- 4. prize_coins COLUMN GUARANTEE
--    Some prod DBs were created from 06_base_schema.sql which uses
--    prize_pool. Add prize_coins if missing and seed from prize_pool.
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'tournaments'
      AND column_name  = 'prize_coins'
  ) THEN
    ALTER TABLE public.tournaments
      ADD COLUMN prize_coins integer NOT NULL DEFAULT 0 CHECK (prize_coins >= 0);

    -- Seed from prize_pool if available
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'tournaments'
        AND column_name  = 'prize_pool'
    ) THEN
      UPDATE public.tournaments
      SET prize_coins = prize_pool
      WHERE prize_coins = 0 AND COALESCE(prize_pool, 0) > 0;
    END IF;
  END IF;
END;
$$;


-- ────────────────────────────────────────────────────────────────
-- 5. WALLET TRANSACTION TYPES — full canonical set
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
-- 6. join_tournament RPC — atomic, canonical, with notification
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.join_tournament(p_tournament_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_t          record;
  v_wallet_bal integer;
  v_already_in boolean;
  v_name       text;
BEGIN
  SELECT id, name, status, entry_fee, max_players, current_players
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

  -- Entry fee
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

  -- Register participant
  INSERT INTO public.tournament_participants
    (tournament_id, user_id, status, approved_at, approved_by)
  VALUES
    (p_tournament_id, auth.uid(), 'approved', now(), auth.uid());

  -- Increment counter
  UPDATE public.tournaments
  SET
    current_players = current_players + 1,
    status = CASE
      WHEN current_players + 1 >= max_players THEN 'full'
      ELSE status
    END,
    updated_at = now()
  WHERE id = p_tournament_id;

  -- In-app notification
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    auth.uid(),
    'tournament',
    'Inscription confirmée',
    format('Vous avez rejoint le tournoi "%s".', v_t.name),
    jsonb_build_object('tournament_id', p_tournament_id, 'entry_fee', v_t.entry_fee)
  )
  ON CONFLICT DO NOTHING;

  -- Track stat: tournaments_played
  INSERT INTO public.player_stats (user_id, tournaments_played)
  VALUES (auth.uid(), 1)
  ON CONFLICT (user_id) DO UPDATE
    SET tournaments_played = public.player_stats.tournaments_played + 1,
        updated_at = now();

  RETURN jsonb_build_object('success', true, 'tournament_id', p_tournament_id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_tournament(uuid) TO authenticated;


-- ────────────────────────────────────────────────────────────────
-- 7. leave_tournament RPC — atomic, with refund
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.leave_tournament(p_tournament_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_t       record;
  v_deleted integer;
BEGIN
  SELECT id, name, status, entry_fee, current_players
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

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not registered in this tournament');
  END IF;

  -- Refund entry fee
  IF v_t.entry_fee > 0 THEN
    UPDATE public.wallets
    SET balance = balance + v_t.entry_fee, updated_at = now()
    WHERE user_id = auth.uid();

    INSERT INTO public.wallet_transactions
      (user_id, amount, type, reason, reference)
    VALUES
      (auth.uid(), v_t.entry_fee, 'refund', 'Tournament leave refund', p_tournament_id::text);
  END IF;

  -- Decrement and re-open if was full
  UPDATE public.tournaments
  SET
    current_players = GREATEST(0, current_players - 1),
    status = CASE
      WHEN status = 'full' THEN 'registration_open'
      ELSE status
    END,
    updated_at = now()
  WHERE id = p_tournament_id;

  -- Undo the tournaments_played stat increment
  UPDATE public.player_stats
  SET tournaments_played = GREATEST(0, tournaments_played - 1),
      updated_at = now()
  WHERE user_id = auth.uid();

  RETURN jsonb_build_object('success', true);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_tournament(uuid) TO authenticated;


-- ────────────────────────────────────────────────────────────────
-- 8. advance_tournament_status + valid_tournament_transition
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
    ('full',              'registration_open'),
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
  v_name    text;
BEGIN
  IF NOT public.is_role(ARRAY['admin','super_admin','founder','fondateur']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;

  SELECT status, name INTO v_current, v_name
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

  -- Notify all registered participants on key transitions
  IF p_to_status IN ('live', 'results_pending', 'cancelled') THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    SELECT
      tp.user_id,
      'tournament',
      CASE p_to_status
        WHEN 'live'            THEN 'Tournoi en cours !'
        WHEN 'results_pending' THEN 'Soumettez vos résultats'
        WHEN 'cancelled'       THEN 'Tournoi annulé'
      END,
      CASE p_to_status
        WHEN 'live'            THEN format('Le tournoi "%s" a commencé.', v_name)
        WHEN 'results_pending' THEN format('Soumettez vos résultats pour "%s".', v_name)
        WHEN 'cancelled'       THEN format('Le tournoi "%s" a été annulé.', v_name)
      END,
      jsonb_build_object('tournament_id', p_tournament_id, 'status', p_to_status)
    FROM public.tournament_participants tp
    WHERE tp.tournament_id = p_tournament_id
      AND tp.status = 'approved'
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'from', v_current, 'to', p_to_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.advance_tournament_status(uuid, text) TO authenticated;


-- ────────────────────────────────────────────────────────────────
-- 9. award_prizes RPC
--    Distributes prize_coins to placed players.
--    Admin/founder only. Idempotent via wallet_transactions ref.
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.award_prizes(
  p_tournament_id uuid,
  p_prizes        jsonb   -- [{"user_id":"...", "amount":500, "placement":1}, ...]
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament record;
  v_prize      jsonb;
  v_ref        text;
  v_awarded    integer := 0;
BEGIN
  IF NOT public.is_role(ARRAY['admin','super_admin','founder','fondateur']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;

  SELECT id, name, status, prize_coins INTO v_tournament
  FROM public.tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  IF v_tournament.status NOT IN ('results_pending', 'completed') THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Can only award prizes for results_pending or completed tournaments');
  END IF;

  FOR v_prize IN SELECT * FROM jsonb_array_elements(p_prizes)
  LOOP
    v_ref := format('%s:placement:%s', p_tournament_id, v_prize->>'placement');

    -- Idempotent: skip if already awarded for this placement
    IF EXISTS (
      SELECT 1 FROM public.wallet_transactions
      WHERE reference = v_ref AND type = 'prize'
    ) THEN
      CONTINUE;
    END IF;

    -- Credit wallet
    UPDATE public.wallets
    SET balance = balance + (v_prize->>'amount')::integer, updated_at = now()
    WHERE user_id = (v_prize->>'user_id')::uuid;

    INSERT INTO public.wallet_transactions
      (user_id, amount, type, reason, reference)
    VALUES (
      (v_prize->>'user_id')::uuid,
      (v_prize->>'amount')::integer,
      'prize',
      format('Prix tournoi "%s" — place %s', v_tournament.name, v_prize->>'placement'),
      v_ref
    );

    -- Update player stats: wins for 1st place
    IF (v_prize->>'placement')::integer = 1 THEN
      INSERT INTO public.player_stats (user_id, wins)
      VALUES ((v_prize->>'user_id')::uuid, 1)
      ON CONFLICT (user_id) DO UPDATE
        SET wins = public.player_stats.wins + 1, updated_at = now();
    END IF;

    -- Notify winner
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      (v_prize->>'user_id')::uuid,
      'prize',
      format('🏆 Prix reçu — %s coins', v_prize->>'amount'),
      format('Félicitations ! Vous avez terminé %sème dans "%s".', v_prize->>'placement', v_tournament.name),
      jsonb_build_object(
        'tournament_id', p_tournament_id,
        'amount',        (v_prize->>'amount')::integer,
        'placement',     (v_prize->>'placement')::integer
      )
    ) ON CONFLICT DO NOTHING;

    -- Fair-play bonus for top 3
    IF (v_prize->>'placement')::integer <= 3 THEN
      PERFORM public.apply_fair_play_event(
        (v_prize->>'user_id')::uuid,
        'tournament_won',
        10,
        format('Top 3 dans "%s"', v_tournament.name),
        p_tournament_id
      );
    END IF;

    v_awarded := v_awarded + 1;
  END LOOP;

  -- Mark tournament completed if still in results_pending
  UPDATE public.tournaments
  SET status = 'completed', updated_at = now()
  WHERE id = p_tournament_id AND status = 'results_pending';

  RETURN jsonb_build_object(
    'success',  true,
    'awarded',  v_awarded,
    'skipped',  jsonb_array_length(p_prizes) - v_awarded
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_prizes(uuid, jsonb) TO authenticated;


-- ────────────────────────────────────────────────────────────────
-- 10. INDEXES
-- ────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS tournaments_open_idx;

CREATE INDEX IF NOT EXISTS profiles_fp_tier_idx
  ON public.profiles (fair_play_score DESC);

CREATE INDEX IF NOT EXISTS tournaments_registration_open_idx
  ON public.tournaments (status, created_at DESC)
  WHERE status = 'registration_open';

CREATE INDEX IF NOT EXISTS tournaments_live_idx
  ON public.tournaments (status, start_time DESC)
  WHERE status = 'live';

CREATE INDEX IF NOT EXISTS tp_user_approved_idx
  ON public.tournament_participants (user_id, status)
  WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS wallet_tx_ref_idx
  ON public.wallet_transactions (reference)
  WHERE reference IS NOT NULL;


-- ────────────────────────────────────────────────────────────────
-- 11. player_stats GUARD CONSTRAINTS
--    Kills, wins, losses etc. can never be negative.
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'player_stats'
  ) THEN
    ALTER TABLE public.player_stats
      DROP CONSTRAINT IF EXISTS player_stats_kills_check,
      DROP CONSTRAINT IF EXISTS player_stats_wins_check,
      DROP CONSTRAINT IF EXISTS player_stats_losses_check,
      DROP CONSTRAINT IF EXISTS player_stats_tournaments_check;

    ALTER TABLE public.player_stats
      ADD CONSTRAINT player_stats_kills_check       CHECK (kills >= 0),
      ADD CONSTRAINT player_stats_wins_check        CHECK (wins >= 0),
      ADD CONSTRAINT player_stats_losses_check      CHECK (losses >= 0),
      ADD CONSTRAINT player_stats_tournaments_check CHECK (tournaments_played >= 0);
  END IF;
END;
$$;


-- ────────────────────────────────────────────────────────────────
-- 12. REGISTER
-- ────────────────────────────────────────────────────────────────
INSERT INTO public.schema_migrations (filename)
VALUES ('23_db_constraints.sql')
ON CONFLICT (filename) DO NOTHING;


-- ────────────────────────────────────────────────────────────────
-- 13. VERIFY
-- ────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v        integer;
  bad_stat text;
BEGIN
  -- No legacy status values remain
  SELECT status INTO bad_stat FROM public.tournaments
  WHERE status NOT IN (
    'draft','published','registration_open','full','ready',
    'live','results_pending','completed','archived','cancelled'
  ) LIMIT 1;
  IF bad_stat IS NOT NULL THEN
    RAISE EXCEPTION 'Legacy tournament status still exists: %', bad_stat;
  END IF;

  -- Capacity constraint
  SELECT COUNT(*) INTO v FROM pg_constraint WHERE conname = 'tournaments_capacity_check';
  IF v = 0 THEN RAISE EXCEPTION 'tournaments_capacity_check missing'; END IF;

  -- No over-capacity rows
  SELECT COUNT(*) INTO v FROM public.tournaments WHERE current_players > max_players;
  IF v > 0 THEN RAISE EXCEPTION '% over-capacity rows remain', v; END IF;

  -- prize_coins column exists
  SELECT COUNT(*) INTO v FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'tournaments' AND column_name = 'prize_coins';
  IF v = 0 THEN RAISE EXCEPTION 'prize_coins column missing from tournaments'; END IF;

  -- RPCs present
  SELECT COUNT(*) INTO v FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('join_tournament','leave_tournament','award_prizes','advance_tournament_status');
  IF v < 4 THEN RAISE EXCEPTION 'One or more core RPCs missing (found %)', v; END IF;

  -- wallet constraint present
  SELECT COUNT(*) INTO v FROM pg_constraint WHERE conname = 'wallet_transactions_type_check';
  IF v = 0 THEN RAISE EXCEPTION 'wallet_transactions_type_check missing'; END IF;

  RAISE NOTICE '23_db_constraints: ALL CHECKS PASSED ✓';
END;
$$;
