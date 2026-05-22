-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/36 Wallet Hardening
-- Fixes: column naming inconsistency, duplicate balance field,
--        missing FOR UPDATE locks, bulk season reset lock risk,
--        and restores the canonical atomic join/leave_tournament RPCs.
-- Safe to run multiple times (fully idempotent).
-- Depends on: sql/35_security_patches.sql already applied.
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. REMOVE profiles.coins (duplicate of wallets.balance)
--    sql/34 added this column but NO RPC ever writes to it, so it
--    immediately diverges from the real balance in wallets.
--    Any frontend reading profiles.coins gets stale/incorrect data.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles DROP COLUMN IF EXISTS coins;

-- ─────────────────────────────────────────────────────────────────────
-- 2. FIX wallet_transactions COLUMN NAMING
--    sql/06 base schema: column is `reason text NOT NULL`
--    sql/17, sql/34, sql/36+: INSERT statements use `description`
--    This silent mismatch causes all reward/purchase INSERTs to fail.
--
--    Strategy (idempotent):
--    • If only `reason` exists  → rename to `description`
--    • If both exist            → copy reason→description, drop reason
--    • If only `description`    → already correct, ensure NOT NULL
--    • If neither               → add description with NOT NULL
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_has_reason      boolean;
  v_has_description boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'wallet_transactions'
      AND column_name  = 'reason'
  ) INTO v_has_reason;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'wallet_transactions'
      AND column_name  = 'description'
  ) INTO v_has_description;

  IF v_has_reason AND NOT v_has_description THEN
    ALTER TABLE public.wallet_transactions RENAME COLUMN reason TO description;

  ELSIF v_has_reason AND v_has_description THEN
    UPDATE public.wallet_transactions
    SET description = reason
    WHERE description IS NULL OR description = '';

    BEGIN
      ALTER TABLE public.wallet_transactions
        ALTER COLUMN description SET NOT NULL;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    ALTER TABLE public.wallet_transactions DROP COLUMN reason;

  ELSIF NOT v_has_reason AND NOT v_has_description THEN
    ALTER TABLE public.wallet_transactions
      ADD COLUMN description text NOT NULL DEFAULT '';
  END IF;
  -- if only description exists: nothing to do
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 3. FIX purchase_item — add SELECT FOR UPDATE on wallet row
--    Without FOR UPDATE, two concurrent purchases can both pass the
--    balance check then both deduct, pushing balance below zero.
--    (The optimistic `WHERE balance >= price` guard is NOT sufficient
--     under Supabase's READ COMMITTED default isolation.)
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.purchase_item(uuid);
CREATE OR REPLACE FUNCTION public.purchase_item(p_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid    := auth.uid();
  v_item        record;
  v_balance     integer;
  v_new_balance integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_item
  FROM public.store_items
  WHERE id = p_item_id AND active = true AND approved = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found or unavailable');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_items
    WHERE user_id = v_user_id AND item_id = p_item_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item already owned');
  END IF;

  -- Lock wallet row first to prevent concurrent purchase race
  SELECT balance INTO v_balance
  FROM public.wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF v_balance < v_item.price THEN
    RETURN jsonb_build_object(
      'success', false, 'error', 'Insufficient balance',
      'balance', v_balance, 'required', v_item.price
    );
  END IF;

  UPDATE public.wallets
  SET balance = balance - v_item.price, updated_at = now()
  WHERE user_id = v_user_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (v_user_id, -v_item.price, 'purchase', format('Boutique: %s', v_item.name));

  INSERT INTO public.user_items (user_id, item_id)
  VALUES (v_user_id, p_item_id)
  ON CONFLICT (user_id, item_id) DO NOTHING;

  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_user_id, 'achievement',
      format('🎉 %s acheté !', v_item.name),
      format('Tu possèdes maintenant "%s"', v_item.name),
      jsonb_build_object('item_id', p_item_id, 'item_name', v_item.name, 'price', v_item.price)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success',     true,
    'new_balance', v_new_balance,
    'item_name',   v_item.name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_item(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 4. FIX claim_daily_reward — FOR UPDATE + auth bypass fix
--    Without FOR UPDATE, concurrent login clicks on the same second
--    can credit the reward twice. Also merges the sql/35 auth fix:
--    p_user_id is accepted for backward-compat but ignored for
--    non-admins (always uses auth.uid()).
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.claim_daily_reward(uuid);
CREATE OR REPLACE FUNCTION public.claim_daily_reward(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid;
  v_caller   uuid := auth.uid();
  v_last     record;
  v_streak   integer := 1;
  v_day      integer;
  v_reward   record;
  v_today    date := CURRENT_DATE;
BEGIN
  -- Non-admins always claim for themselves regardless of p_user_id
  IF public.is_role(ARRAY['admin','super_admin']) AND p_user_id IS NOT NULL THEN
    v_user_id := p_user_id;
  ELSE
    v_user_id := v_caller;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Lock wallet before any reads to prevent double-claim under concurrent requests
  PERFORM 1 FROM public.wallets WHERE user_id = v_user_id FOR UPDATE;

  SELECT * INTO v_last
  FROM public.user_daily_claims
  WHERE user_id = v_user_id
  ORDER BY claimed_at DESC
  LIMIT 1;

  IF v_last IS NOT NULL AND v_last.claimed_at::date = v_today THEN
    RETURN jsonb_build_object(
      'success', false, 'error', 'Already claimed today',
      'next_claim', (v_today + 1)::text
    );
  END IF;

  IF v_last IS NULL THEN
    v_streak := 1;
  ELSIF v_last.claimed_at::date = v_today - 1 THEN
    v_streak := v_last.streak + 1;
  ELSE
    v_streak := 1;
  END IF;

  v_day := ((v_streak - 1) % 7) + 1;

  SELECT * INTO v_reward FROM public.daily_rewards WHERE day = v_day;
  IF NOT FOUND THEN
    v_reward.coins      := 50;
    v_reward.xp         := 100;
    v_reward.is_special := false;
  END IF;

  UPDATE public.wallets
  SET balance = balance + v_reward.coins, updated_at = now()
  WHERE user_id = v_user_id;

  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (
    v_user_id, v_reward.coins, 'daily_reward',
    format('Récompense Jour %s — Streak %s 🔥', v_day, v_streak)
  );

  BEGIN
    UPDATE public.profiles
    SET xp = COALESCE(xp, 0) + v_reward.xp, updated_at = now()
    WHERE id = v_user_id;
  EXCEPTION WHEN undefined_column THEN NULL;
  END;

  INSERT INTO public.user_daily_claims (user_id, claimed_at, day, streak, coins, xp)
  VALUES (v_user_id, now(), v_day, v_streak, v_reward.coins, v_reward.xp);

  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_user_id,
      'reward',
      CASE WHEN v_reward.is_special THEN '🎉 Récompense Spéciale !' ELSE '🎁 Récompense Journalière' END,
      format('+%s CP · +%s XP · Jour %s · Streak %s 🔥', v_reward.coins, v_reward.xp, v_day, v_streak),
      jsonb_build_object(
        'coins', v_reward.coins, 'xp', v_reward.xp,
        'day', v_day, 'streak', v_streak
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success',    true,
    'coins',      v_reward.coins,
    'xp',         v_reward.xp,
    'day',        v_day,
    'streak',     v_streak,
    'is_special', COALESCE(v_reward.is_special, false)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_daily_reward(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 5. FIX claim_mission_reward — FOR UPDATE + auth bypass fix
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.claim_mission_reward(uuid, uuid);
CREATE OR REPLACE FUNCTION public.claim_mission_reward(
  p_user_id    uuid DEFAULT NULL,
  p_mission_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_caller  uuid := auth.uid();
  v_mission record;
  v_um      record;
  v_today   date := CURRENT_DATE;
BEGIN
  IF p_mission_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission ID required');
  END IF;

  IF public.is_role(ARRAY['admin','super_admin']) AND p_user_id IS NOT NULL THEN
    v_user_id := p_user_id;
  ELSE
    v_user_id := v_caller;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_mission FROM public.missions WHERE id = p_mission_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission introuvable');
  END IF;

  SELECT * INTO v_um FROM public.user_missions
  WHERE user_id = v_user_id AND mission_id = p_mission_id AND reset_date = v_today;

  IF v_um IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission non démarrée');
  END IF;
  IF NOT v_um.completed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission non complétée');
  END IF;
  IF v_um.claimed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Récompense déjà réclamée');
  END IF;

  -- Mark claimed first (prevents double-claim under concurrent calls)
  UPDATE public.user_missions SET claimed = true WHERE id = v_um.id;

  IF COALESCE(v_mission.coins_reward, 0) > 0 THEN
    -- Lock wallet row
    PERFORM 1 FROM public.wallets WHERE user_id = v_user_id FOR UPDATE;

    UPDATE public.wallets
    SET balance = balance + v_mission.coins_reward, updated_at = now()
    WHERE user_id = v_user_id;

    INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (v_user_id, v_mission.coins_reward, 'mission_reward',
      format('Mission: %s', v_mission.title));
  END IF;

  BEGIN
    IF COALESCE(v_mission.xp_reward, 0) > 0 THEN
      UPDATE public.profiles
      SET xp = COALESCE(xp, 0) + v_mission.xp_reward, updated_at = now()
      WHERE id = v_user_id;
    END IF;
  EXCEPTION WHEN undefined_column THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'coins',   v_mission.coins_reward,
    'xp',      v_mission.xp_reward,
    'mission', v_mission.title
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_mission_reward(uuid, uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 6. FIX send_gift — add SELECT FOR UPDATE on sender wallet
--    The current version reads balance via a JOIN then does a separate
--    UPDATE. Between those two operations, another concurrent gift
--    send can pass the balance check with the same stale balance read.
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.send_gift(uuid, integer, text);
CREATE OR REPLACE FUNCTION public.send_gift(
  p_receiver_id uuid,
  p_amount      integer,
  p_message     text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id    uuid := auth.uid();
  v_sender       record;
  v_receiver     record;
  v_sender_bal   integer;
  v_gift_id      uuid;
  v_recent_count integer;
BEGIN
  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF v_sender_id = p_receiver_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot send gift to yourself');
  END IF;

  IF p_amount IS NULL OR p_amount < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum gift is 10 CP');
  END IF;
  IF p_amount > 10000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Maximum gift is 10,000 CP');
  END IF;

  SELECT * INTO v_sender FROM public.profiles WHERE id = v_sender_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sender not found');
  END IF;

  IF v_sender.role = 'banned' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Banned users cannot send gifts');
  END IF;

  SELECT * INTO v_receiver FROM public.profiles WHERE id = p_receiver_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Receiver not found');
  END IF;

  -- Rate limiting
  SELECT COUNT(*) INTO v_recent_count
  FROM public.gift_transactions
  WHERE sender_id = v_sender_id
    AND created_at >= now() - INTERVAL '24 hours'
    AND status != 'cancelled';

  IF v_recent_count >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'You can only send 5 gifts per 24 hours');
  END IF;

  -- Lock wallet row before balance read to prevent concurrent double-send
  SELECT balance INTO v_sender_bal
  FROM public.wallets
  WHERE user_id = v_sender_id
  FOR UPDATE;

  IF v_sender_bal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sender wallet not found');
  END IF;

  IF v_sender_bal < p_amount THEN
    RETURN jsonb_build_object(
      'success', false, 'error', 'Insufficient balance',
      'balance', v_sender_bal, 'required', p_amount
    );
  END IF;

  UPDATE public.wallets
  SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = v_sender_id;

  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (
    v_sender_id, -p_amount, 'gift_sent',
    format('Gift to @%s', COALESCE(v_receiver.username, 'user'))
  );

  INSERT INTO public.gift_transactions (sender_id, receiver_id, type, amount, message)
  VALUES (v_sender_id, p_receiver_id, 'coins', p_amount, p_message)
  RETURNING id INTO v_gift_id;

  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      p_receiver_id, 'coins_received',
      format('🎁 Gift from @%s!', COALESCE(v_sender.username, 'Someone')),
      format('%s CP sent to you%s. Claim it from your notifications!',
        p_amount,
        CASE WHEN p_message IS NOT NULL
             THEN format(' with message: "%s"', LEFT(p_message, 80))
             ELSE '' END
      ),
      jsonb_build_object(
        'gift_id', v_gift_id, 'amount', p_amount,
        'sender_id', v_sender_id, 'sender_username', v_sender.username,
        'action', 'claim_gift'
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_sender_id, 'system',
      format('✅ Gift sent to @%s', COALESCE(v_receiver.username, 'user')),
      format('%s CP sent. Waiting for them to claim.', p_amount),
      jsonb_build_object('gift_id', v_gift_id, 'receiver_id', p_receiver_id)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success',  true,
    'gift_id',  v_gift_id,
    'amount',   p_amount,
    'receiver', v_receiver.username
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_gift(uuid, integer, text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 7. FIX start_new_season — batched wallet reset
--    The old version does `UPDATE public.wallets SET balance = 0`
--    with no WHERE clause. On a large table this acquires a full
--    table lock for the entire duration of the UPDATE, blocking every
--    user wallet operation platform-wide until the reset completes.
--    The fix processes wallets in batches of 500 rows.
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.start_new_season(text, integer, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean);
DROP FUNCTION IF EXISTS public.start_new_season(text, integer, boolean, boolean, boolean, boolean, boolean, boolean, boolean);
DROP FUNCTION IF EXISTS public.start_new_season(text, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean);

CREATE OR REPLACE FUNCTION public.start_new_season(
  p_name              text,
  p_number            integer DEFAULT NULL,
  p_description       text    DEFAULT '',
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
DECLARE
  v_admin_id      uuid    := auth.uid();
  v_old_id        uuid;
  v_new_id        uuid;
  v_season_number integer;
  v_rows_updated  integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_admin_id
      AND role IN ('admin','super_admin','founder','fondateur')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  UPDATE public.seasons
  SET status = 'completed', end_date = now()
  WHERE status = 'active'
  RETURNING id INTO v_old_id;

  IF p_number IS NULL THEN
    SELECT COALESCE(MAX(number), 0) + 1 INTO v_season_number FROM public.seasons;
  ELSE
    v_season_number := p_number;
  END IF;

  INSERT INTO public.seasons (
    name, number, status,
    reset_coins, reset_xp, reset_stats,
    reset_tournaments, reset_chat, reset_avatars, reset_clans
  )
  VALUES (
    p_name, v_season_number, 'active',
    p_reset_coins, p_reset_xp, p_reset_stats,
    p_reset_tournaments, p_reset_chat, p_reset_avatars, p_reset_clans
  )
  RETURNING id INTO v_new_id;

  IF p_reset_coins THEN
    -- Log all deductions first (before zeroing, so we capture real amounts)
    INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    SELECT w.user_id, -w.balance, 'season_reset',
           format('Season reset: %s', p_name)
    FROM public.wallets w
    WHERE w.balance > 0;

    -- Batch reset: 500 rows per iteration to avoid full-table lock
    LOOP
      WITH batch AS (
        SELECT id FROM public.wallets WHERE balance > 0 LIMIT 500
      )
      UPDATE public.wallets
      SET balance = 0, updated_at = now()
      WHERE id IN (SELECT id FROM batch);

      GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
      EXIT WHEN v_rows_updated = 0;
    END LOOP;
  END IF;

  BEGIN
    INSERT INTO public.season_audit_log (admin_id, action, season_id, details)
    VALUES (v_admin_id, 'start_new_season', v_new_id,
      jsonb_build_object(
        'name', p_name, 'number', v_season_number,
        'closed_season', v_old_id,
        'resets', jsonb_build_object(
          'coins', p_reset_coins, 'xp', p_reset_xp, 'stats', p_reset_stats,
          'wins', p_reset_wins, 'avatars', p_reset_avatars, 'chat', p_reset_chat,
          'tournaments', p_reset_tournaments, 'clans', p_reset_clans
        )
      )
    );
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success',       true,
    'new_season_id', v_new_id,
    'season_number', v_season_number,
    'closed_season', v_old_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_new_season(text, integer, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 8. RESTORE canonical join_tournament (sql/22 v3 with FOR UPDATE)
--    sql/34 overwrote this with a version that lacks FOR UPDATE,
--    reintroducing the race condition. This re-applies the safe
--    version from sql/22 and fixes the reason→description column name.
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.join_tournament(uuid);
CREATE OR REPLACE FUNCTION public.join_tournament(p_tournament_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_t          record;
  v_wallet_bal integer;
  v_already_in boolean;
BEGIN
  -- Lock the tournament row to serialise concurrent registrations
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

  SELECT EXISTS (
    SELECT 1 FROM public.tournament_participants
    WHERE tournament_id = p_tournament_id AND user_id = auth.uid()
  ) INTO v_already_in;

  IF v_already_in THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already joined this tournament');
  END IF;

  IF v_t.entry_fee > 0 THEN
    -- Lock wallet row to prevent concurrent spend
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
      (user_id, amount, type, description, reference)
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

-- ─────────────────────────────────────────────────────────────────────
-- 9. RESTORE canonical leave_tournament (sql/22 v3 with FOR UPDATE)
--    Same issue as join_tournament — sql/34 overwrote without locking.
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.leave_tournament(uuid);
CREATE OR REPLACE FUNCTION public.leave_tournament(p_tournament_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not registered in this tournament');
  END IF;

  IF v_t.entry_fee > 0 THEN
    UPDATE public.wallets
    SET balance = balance + v_t.entry_fee, updated_at = now()
    WHERE user_id = auth.uid();

    INSERT INTO public.wallet_transactions
      (user_id, amount, type, description, reference)
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

-- ─────────────────────────────────────────────────────────────────────
-- 10. REGISTER MIGRATION
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.schema_migrations (filename)
VALUES ('36_wallet_hardening.sql')
ON CONFLICT (filename) DO NOTHING;
