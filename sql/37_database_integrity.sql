-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/37 Database Integrity
-- Fixes: missing indexes, admin_logs column mismatch, tournament
--        current_players drift trigger, tournament_players view,
--        notifications schema gaps, and wallet_transactions type
--        constraint to include 'tournament' used by some frontend code.
-- Safe to run multiple times (fully idempotent).
-- Depends on: sql/36_wallet_hardening.sql already applied.
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. FIX admin_logs COLUMN INCONSISTENCY
--    sql/06 defines the table with `user_id uuid NOT NULL`
--    sql/34+ RPCs insert using `admin_id` and `target_user_id` columns
--    These inserts all fail silently (wrapped in EXCEPTION WHEN OTHERS).
--    Fix: rename user_id → admin_id, add target_user_id column.
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_has_user_id      boolean;
  v_has_admin_id     boolean;
  v_has_target       boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_logs'
      AND column_name = 'user_id'
  ) INTO v_has_user_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_logs'
      AND column_name = 'admin_id'
  ) INTO v_has_admin_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_logs'
      AND column_name = 'target_user_id'
  ) INTO v_has_target;

  IF v_has_user_id AND NOT v_has_admin_id THEN
    ALTER TABLE public.admin_logs RENAME COLUMN user_id TO admin_id;
  END IF;

  IF NOT v_has_target THEN
    ALTER TABLE public.admin_logs
      ADD COLUMN target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS admin_logs_admin_idx  ON public.admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS admin_logs_target_idx ON public.admin_logs(target_user_id);
CREATE INDEX IF NOT EXISTS admin_logs_date_idx   ON public.admin_logs(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────
-- 2. ENSURE tournament_players VIEW EXISTS
--    phase_a_normalized/001_core_schema.sql creates tournament_participants
--    as the canonical table, then creates tournament_players as a view
--    only if it doesn't exist as a table. If sql/06 created it as a table,
--    the view was never created. This block ensures the view exists as a
--    compatibility alias pointing to tournament_participants.
--    IMPORTANT: only creates the view if tournament_participants exists.
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Only proceed if tournament_participants is the canonical table
  IF to_regclass('public.tournament_participants') IS NOT NULL
     AND to_regclass('public.tournament_players') IS NULL THEN
    EXECUTE '
      CREATE VIEW public.tournament_players
      WITH (security_invoker = true) AS
      SELECT * FROM public.tournament_participants
    ';
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 3. TRIGGER: sync tournaments.current_players on participant changes
--    current_players drifts when participants are added/removed outside
--    of the join/leave_tournament RPCs (e.g. admin direct inserts,
--    legacy code). This trigger keeps the counter accurate.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_tournament_player_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tournaments
    SET current_players = (
      SELECT COUNT(*) FROM public.tournament_participants
      WHERE tournament_id = NEW.tournament_id
        AND status IN ('approved', 'joined')
    ),
    updated_at = now()
    WHERE id = NEW.tournament_id;

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tournaments
    SET current_players = (
      SELECT COUNT(*) FROM public.tournament_participants
      WHERE tournament_id = OLD.tournament_id
        AND status IN ('approved', 'joined')
    ),
    updated_at = now()
    WHERE id = OLD.tournament_id;

    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Status change may affect the count (e.g. approved → kicked)
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      UPDATE public.tournaments
      SET current_players = (
        SELECT COUNT(*) FROM public.tournament_participants
        WHERE tournament_id = NEW.tournament_id
          AND status IN ('approved', 'joined')
      ),
      updated_at = now()
      WHERE id = NEW.tournament_id;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sync_player_count_trg ON public.tournament_participants;
CREATE TRIGGER sync_player_count_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.tournament_participants
  FOR EACH ROW EXECUTE FUNCTION public.sync_tournament_player_count();

-- ─────────────────────────────────────────────────────────────────────
-- 4. FIX MISSING INDEXES
--    These were identified as missing during the audit.
-- ─────────────────────────────────────────────────────────────────────

-- Wallet transaction history (most common query: my transactions, newest first)
CREATE INDEX IF NOT EXISTS wallet_tx_user_date_idx
  ON public.wallet_transactions(user_id, created_at DESC);

-- Leaderboard / ranking queries
CREATE INDEX IF NOT EXISTS profiles_xp_idx
  ON public.profiles(xp DESC);

CREATE INDEX IF NOT EXISTS profiles_level_idx
  ON public.profiles(level DESC);

-- Referral system: look up by code string
CREATE INDEX IF NOT EXISTS referral_uses_code_idx
  ON public.referral_uses(referral_code);

-- Clan war contribution lookups
DO $$
BEGIN
  IF to_regclass('public.clan_war_contributions') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS cwc_war_user_idx
               ON public.clan_war_contributions(war_id, user_id)';
  END IF;
END;
$$;

-- Match results — common admin query: pending results per tournament
CREATE INDEX IF NOT EXISTS mr_tournament_status_idx
  ON public.match_results(tournament_id, status);

-- Tournament participants by status (admin approval queue)
CREATE INDEX IF NOT EXISTS tp_status_date_idx
  ON public.tournament_participants(status, joined_at DESC);

-- ─────────────────────────────────────────────────────────────────────
-- 5. EXPAND wallet_transactions.type CONSTRAINT
--    Add 'tournament' which several frontend files use as a tx type,
--    and 'gift_received' for claim_gift which credits the receiver.
--    This is additive and idempotent.
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ALTER TABLE public.wallet_transactions
    DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type IN (
    'credit', 'debit', 'refund', 'prize', 'fee',
    'purchase', 'gift_sent', 'gift_received',
    'admin_adjustment', 'admin_grant', 'season_reset',
    'referral', 'daily_reward', 'mission_reward',
    'reward', 'tournament'
  ));

-- ─────────────────────────────────────────────────────────────────────
-- 6. FIX NOTIFICATIONS TABLE SCHEMA GAPS
--    sql/17 all_notifications view references is_read and expires_at
--    columns that may not exist on the notifications table (sql/07).
--    Add them safely if missing.
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.notifications') IS NOT NULL THEN

    -- sql/07 may use `read` boolean; sql/17 view queries `is_read`
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notifications'
        AND column_name = 'is_read'
    ) THEN
      -- Add is_read as alias; if `read` exists, seed from it
      ALTER TABLE public.notifications
        ADD COLUMN is_read boolean NOT NULL DEFAULT false;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'notifications'
          AND column_name = 'read'
      ) THEN
        UPDATE public.notifications SET is_read = read;
      END IF;
    END IF;

    -- Add expires_at if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notifications'
        AND column_name = 'expires_at'
    ) THEN
      ALTER TABLE public.notifications
        ADD COLUMN expires_at timestamptz;
    END IF;

  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 7. FIX claim_gift — uses 'gift_received' tx type + FOR UPDATE
--    The version in sql/17 uses type='fee' for receiver credit which
--    is incorrect semantics. Also adds FOR UPDATE on receiver wallet.
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.claim_gift(uuid);
CREATE OR REPLACE FUNCTION public.claim_gift(p_gift_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_gift    record;
  v_sender  record;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_gift
  FROM public.gift_transactions
  WHERE id = p_gift_id AND receiver_id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift not found');
  END IF;
  IF v_gift.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error',
      format('Gift already %s', v_gift.status));
  END IF;
  IF v_gift.expires_at < now() THEN
    UPDATE public.gift_transactions SET status = 'expired' WHERE id = p_gift_id;
    RETURN jsonb_build_object('success', false, 'error', 'Gift has expired');
  END IF;

  SELECT username INTO v_sender FROM public.profiles WHERE id = v_gift.sender_id;

  -- Lock receiver wallet before crediting
  PERFORM 1 FROM public.wallets WHERE user_id = v_user_id FOR UPDATE;

  UPDATE public.gift_transactions
  SET status = 'claimed', claimed_at = now()
  WHERE id = p_gift_id;

  UPDATE public.wallets
  SET balance = balance + v_gift.amount, updated_at = now()
  WHERE user_id = v_user_id;

  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (
    v_user_id, v_gift.amount, 'gift_received',
    format('Gift from @%s', COALESCE(v_sender.username, 'user'))
  );

  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_user_id, 'coins_received',
      format('✅ %s CP reçus !', v_gift.amount),
      format('Cadeau de @%s réclamé.', COALESCE(v_sender.username, 'user')),
      jsonb_build_object('gift_id', p_gift_id, 'amount', v_gift.amount)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'amount',  v_gift.amount,
    'sender',  v_sender.username
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_gift(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 8. REGISTER MIGRATION
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.schema_migrations (filename)
VALUES ('37_database_integrity.sql')
ON CONFLICT (filename) DO NOTHING;
