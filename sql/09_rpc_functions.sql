-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — Core RPC Functions
-- All functions used by the frontend admin panels.
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. set_user_role
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_user_role(
  target_user uuid,
  new_role    text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;

  IF new_role NOT IN ('super_admin','admin','founder','fondateur','designer','user','banned') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  UPDATE public.profiles SET role = new_role, updated_at = now() WHERE id = target_user;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 2. ban_user
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ban_user(
  target_user  uuid,
  banned_until timestamptz,
  banned_by    uuid
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  UPDATE public.profiles
  SET role = 'banned', banned_until = ban_user.banned_until, banned_by = ban_user.banned_by, updated_at = now()
  WHERE id = target_user;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 3. unban_user
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.unban_user(target_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  UPDATE public.profiles
  SET role = 'user', banned_until = NULL, banned_by = NULL, updated_at = now()
  WHERE id = target_user AND role = 'banned';
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 4. delete_user_complete
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_user_complete(target_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Only super_admin can delete users';
  END IF;

  -- Delete profile (cascades to wallets, notifications, etc.)
  DELETE FROM public.profiles WHERE id = target_user;

  -- Delete auth user
  DELETE FROM auth.users WHERE id = target_user;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 5. admin_adjust_coins — credit or debit a user's wallet
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_adjust_coins(
  p_target_user_id uuid,
  p_amount         integer,
  p_reason         text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_role  text;
  v_new_balance  integer;
  v_tx_type      text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;

  IF p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount cannot be zero');
  END IF;

  -- Upsert wallet
  INSERT INTO public.wallets (user_id, balance)
  VALUES (p_target_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Apply adjustment (prevent negative balance)
  UPDATE public.wallets
  SET balance = GREATEST(0, balance + p_amount), updated_at = now()
  WHERE user_id = p_target_user_id
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  -- Log transaction
  v_tx_type := CASE WHEN p_amount > 0 THEN 'credit' ELSE 'debit' END;
  INSERT INTO public.wallet_transactions (user_id, amount, type, reason, admin_id)
  VALUES (p_target_user_id, ABS(p_amount), v_tx_type, p_reason, auth.uid());

  -- Send notification to user
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    p_target_user_id,
    'coins_received',
    CASE WHEN p_amount > 0 THEN 'CP Received!' ELSE 'CP Deducted' END,
    CASE WHEN p_amount > 0
      THEN format('You received %s CP. Reason: %s', p_amount, p_reason)
      ELSE format('%s CP were deducted. Reason: %s', ABS(p_amount), p_reason)
    END,
    jsonb_build_object('amount', p_amount, 'new_balance', v_new_balance)
  );

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 6. grant_coins — simpler coin grant (used by AdminGrant page)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.grant_coins(
  target_user uuid,
  amount      integer
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN public.admin_adjust_coins(target_user, amount, 'Admin grant');
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 7. delete_tournament_complete
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_tournament_complete(tournament_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin','founder','fondateur') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  DELETE FROM public.tournaments WHERE id = tournament_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 8. check_user_permission
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_user_permission(
  p_user_id     uuid,
  required_role text
)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id
      AND CASE required_role
        WHEN 'super_admin' THEN role = 'super_admin'
        WHEN 'admin'       THEN role IN ('admin','super_admin')
        WHEN 'founder'     THEN role IN ('founder','fondateur','admin','super_admin')
        WHEN 'designer'    THEN role IN ('designer','admin','super_admin')
        ELSE role NOT IN ('banned')
      END
  );
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 9. join_tournament — player joins a tournament
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.join_tournament(p_tournament_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_tournament record;
  v_balance    integer;
BEGIN
  SELECT * INTO v_tournament FROM public.tournaments WHERE id = p_tournament_id;

  IF v_tournament IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  IF v_tournament.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament is not open');
  END IF;

  IF v_tournament.current_players >= v_tournament.max_players THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament is full');
  END IF;

  -- Check if already joined
  IF EXISTS (SELECT 1 FROM public.tournament_players WHERE tournament_id = p_tournament_id AND user_id = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already joined');
  END IF;

  -- Deduct entry fee
  IF v_tournament.entry_fee > 0 THEN
    SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_user_id;
    IF COALESCE(v_balance, 0) < v_tournament.entry_fee THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient CP balance');
    END IF;

    UPDATE public.wallets SET balance = balance - v_tournament.entry_fee, updated_at = now()
    WHERE user_id = v_user_id;

    INSERT INTO public.wallet_transactions (user_id, amount, type, reason, reference)
    VALUES (v_user_id, v_tournament.entry_fee, 'fee', 'Tournament entry fee', v_tournament.id::text);
  END IF;

  -- Join tournament
  INSERT INTO public.tournament_players (tournament_id, user_id) VALUES (p_tournament_id, v_user_id);

  -- Increment player count
  UPDATE public.tournaments SET current_players = current_players + 1, updated_at = now()
  WHERE id = p_tournament_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 10. leave_tournament — player leaves before start
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.leave_tournament(p_tournament_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_tournament record;
BEGIN
  SELECT * INTO v_tournament FROM public.tournaments WHERE id = p_tournament_id;

  IF v_tournament.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot leave after tournament starts');
  END IF;

  DELETE FROM public.tournament_players WHERE tournament_id = p_tournament_id AND user_id = v_user_id;

  IF FOUND THEN
    UPDATE public.tournaments SET current_players = GREATEST(0, current_players - 1), updated_at = now()
    WHERE id = p_tournament_id;

    -- Refund entry fee
    IF v_tournament.entry_fee > 0 THEN
      UPDATE public.wallets SET balance = balance + v_tournament.entry_fee, updated_at = now()
      WHERE user_id = v_user_id;

      INSERT INTO public.wallet_transactions (user_id, amount, type, reason, reference)
      VALUES (v_user_id, v_tournament.entry_fee, 'refund', 'Tournament leave refund', v_tournament.id::text);
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
