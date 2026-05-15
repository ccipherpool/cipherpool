-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — Notification Upgrades + Gift System
-- Birthday rewards, level-up messages, user-to-user gifts
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. ADD BIRTHDAY TO PROFILES
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birthday            date,
  ADD COLUMN IF NOT EXISTS birthday_reward_year integer;  -- year the last birthday reward was given

-- ─────────────────────────────────────────────────────────────────────
-- 2. NOTIFICATION PREFERENCES (per-user settings)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id                uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  tournament_updates     boolean NOT NULL DEFAULT true,
  match_results          boolean NOT NULL DEFAULT true,
  wallet_changes         boolean NOT NULL DEFAULT true,
  gifts_received         boolean NOT NULL DEFAULT true,
  birthday_messages      boolean NOT NULL DEFAULT true,
  announcements          boolean NOT NULL DEFAULT true,
  clan_events            boolean NOT NULL DEFAULT true,
  email_notifications    boolean NOT NULL DEFAULT false,
  updated_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "np_self" ON public.notification_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE ON TABLE public.notification_preferences TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 3. RPC: check_birthday_reward — call on user login
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_birthday_reward()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id   uuid := auth.uid();
  v_profile   record;
  v_today     date := CURRENT_DATE;
  v_coins     integer := 200;
  v_curr_year integer := EXTRACT(YEAR FROM NOW())::integer;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  IF v_profile IS NULL THEN RETURN jsonb_build_object('is_birthday', false); END IF;

  -- Check if birthday is set and today matches (ignore year)
  IF v_profile.birthday IS NULL THEN RETURN jsonb_build_object('is_birthday', false); END IF;
  IF EXTRACT(MONTH FROM v_profile.birthday) != EXTRACT(MONTH FROM v_today) THEN
    RETURN jsonb_build_object('is_birthday', false);
  END IF;
  IF EXTRACT(DAY FROM v_profile.birthday) != EXTRACT(DAY FROM v_today) THEN
    RETURN jsonb_build_object('is_birthday', false);
  END IF;

  -- Already rewarded this year?
  IF v_profile.birthday_reward_year = v_curr_year THEN
    RETURN jsonb_build_object('is_birthday', true, 'already_rewarded', true);
  END IF;

  -- Give birthday reward
  PERFORM public.admin_adjust_coins(v_user_id, v_coins, '🎂 Birthday reward from CipherPool!');

  -- Mark rewarded
  UPDATE public.profiles SET birthday_reward_year = v_curr_year, updated_at = NOW() WHERE id = v_user_id;

  -- Birthday notification
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_user_id, 'achievement',
    '🎂 Happy Birthday!',
    format('Happy Birthday from CipherPool! We gifted you %s CP as a birthday present! 🎁', v_coins),
    jsonb_build_object('coins', v_coins, 'type', 'birthday')
  );

  RETURN jsonb_build_object('is_birthday', true, 'already_rewarded', false, 'coins', v_coins);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 4. GIFT TRANSACTIONS TABLE
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gift_transactions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type          text        NOT NULL DEFAULT 'coins' CHECK (type IN ('coins')),
  amount        integer     NOT NULL DEFAULT 0 CHECK (amount > 0),
  message       text,
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'claimed', 'rejected', 'expired', 'cancelled')),
  expires_at    timestamptz NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  claimed_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  CHECK (sender_id != receiver_id),
  CHECK (amount >= 10),
  CHECK (amount <= 10000)
);

CREATE INDEX IF NOT EXISTS gt_sender_idx   ON public.gift_transactions(sender_id);
CREATE INDEX IF NOT EXISTS gt_receiver_idx ON public.gift_transactions(receiver_id);
CREATE INDEX IF NOT EXISTS gt_status_idx   ON public.gift_transactions(status);

ALTER TABLE public.gift_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gt_read_self" ON public.gift_transactions FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "gt_insert_self" ON public.gift_transactions FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "gt_admin" ON public.gift_transactions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
);
GRANT SELECT, INSERT ON TABLE public.gift_transactions TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 5. RPC: send_gift — user sends coins to another user (SERVER AUTH)
--    Atomically deducts from sender, creates pending gift, notifies receiver
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.send_gift(
  p_receiver_id  uuid,
  p_amount       integer,
  p_message      text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sender_id    uuid := auth.uid();
  v_sender       record;
  v_receiver     record;
  v_sender_bal   integer;
  v_gift_id      uuid;
  v_recent_count integer;
BEGIN
  -- Cannot send to yourself
  IF v_sender_id = p_receiver_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot send gift to yourself');
  END IF;

  -- Validate amount
  IF p_amount IS NULL OR p_amount < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum gift is 10 CP');
  END IF;
  IF p_amount > 10000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Maximum gift is 10,000 CP');
  END IF;

  -- Get sender profile + wallet
  SELECT p.*, w.balance INTO v_sender
  FROM public.profiles p
  JOIN public.wallets w ON w.user_id = p.id
  WHERE p.id = v_sender_id;

  IF v_sender IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sender not found');
  END IF;

  -- Check sender is not banned
  IF v_sender.role = 'banned' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Banned users cannot send gifts');
  END IF;

  -- Check balance
  v_sender_bal := v_sender.balance;
  IF v_sender_bal < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance',
      'balance', v_sender_bal, 'required', p_amount);
  END IF;

  -- Get receiver
  SELECT * INTO v_receiver FROM public.profiles WHERE id = p_receiver_id;
  IF v_receiver IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Receiver not found');
  END IF;

  -- Rate limiting: max 5 gifts per sender per day
  SELECT COUNT(*) INTO v_recent_count
  FROM public.gift_transactions
  WHERE sender_id = v_sender_id
    AND created_at >= NOW() - INTERVAL '24 hours'
    AND status != 'cancelled';

  IF v_recent_count >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'You can only send 5 gifts per 24 hours');
  END IF;

  -- Deduct coins from sender immediately (hold in escrow → gift pending)
  UPDATE public.wallets
  SET balance = balance - p_amount, updated_at = NOW()
  WHERE user_id = v_sender_id AND balance >= p_amount;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Balance changed — insufficient funds');
  END IF;

  -- Record deduction as transaction
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (v_sender_id, -p_amount, 'fee', format('Gift to @%s (held)', COALESCE(v_receiver.username, 'user')))
  ON CONFLICT DO NOTHING;

  -- Create gift record
  INSERT INTO public.gift_transactions (sender_id, receiver_id, type, amount, message)
  VALUES (v_sender_id, p_receiver_id, 'coins', p_amount, p_message)
  RETURNING id INTO v_gift_id;

  -- Notify receiver
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    p_receiver_id, 'coins_received',
    format('🎁 Gift from @%s!', COALESCE(v_sender.username, 'Someone')),
    format('%s CP sent to you%s. Claim it from your notifications!',
      p_amount,
      CASE WHEN p_message IS NOT NULL THEN format(' with message: "%s"', LEFT(p_message, 80)) ELSE '' END
    ),
    jsonb_build_object(
      'gift_id', v_gift_id,
      'amount', p_amount,
      'sender_id', v_sender_id,
      'sender_username', v_sender.username,
      'action', 'claim_gift'
    )
  );

  -- Notify sender
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_sender_id, 'system',
    format('✅ Gift sent to @%s', COALESCE(v_receiver.username, 'user')),
    format('%s CP sent. Waiting for them to claim.', p_amount),
    jsonb_build_object('gift_id', v_gift_id, 'receiver_id', p_receiver_id)
  );

  RETURN jsonb_build_object(
    'success',   true,
    'gift_id',   v_gift_id,
    'amount',    p_amount,
    'receiver',  v_receiver.username
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 6. RPC: claim_gift — receiver claims the gift (credits their wallet)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.claim_gift(p_gift_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_gift    record;
  v_sender  record;
BEGIN
  SELECT * INTO v_gift FROM public.gift_transactions WHERE id = p_gift_id;

  IF v_gift IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift not found');
  END IF;
  IF v_gift.receiver_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'This gift is not for you');
  END IF;
  IF v_gift.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', format('Gift already %s', v_gift.status));
  END IF;
  IF v_gift.expires_at < NOW() THEN
    UPDATE public.gift_transactions SET status = 'expired' WHERE id = p_gift_id;
    -- Refund sender
    UPDATE public.wallets SET balance = balance + v_gift.amount WHERE user_id = v_gift.sender_id;
    RETURN jsonb_build_object('success', false, 'error', 'Gift has expired — sender refunded');
  END IF;

  -- Mark as claimed
  UPDATE public.gift_transactions SET status = 'claimed', claimed_at = NOW() WHERE id = p_gift_id;

  -- Credit receiver
  UPDATE public.wallets SET balance = balance + v_gift.amount, updated_at = NOW() WHERE user_id = v_user_id;
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (v_user_id, v_gift.amount, 'credit', format('Gift received from another player'));

  -- Notify sender that gift was claimed
  SELECT username INTO v_sender FROM public.profiles WHERE id = v_gift.sender_id;
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_gift.sender_id, 'system',
    '✅ Gift Claimed!',
    format('Your gift of %s CP was accepted!', v_gift.amount),
    jsonb_build_object('gift_id', p_gift_id, 'amount', v_gift.amount)
  );

  RETURN jsonb_build_object('success', true, 'amount', v_gift.amount);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 7. RPC: reject_gift — receiver rejects, coins go back to sender
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reject_gift(p_gift_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_gift    record;
BEGIN
  SELECT * INTO v_gift FROM public.gift_transactions WHERE id = p_gift_id;
  IF v_gift IS NULL OR v_gift.receiver_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift not found or not for you');
  END IF;
  IF v_gift.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift already processed');
  END IF;

  UPDATE public.gift_transactions SET status = 'rejected', claimed_at = NOW() WHERE id = p_gift_id;

  -- Refund sender
  UPDATE public.wallets SET balance = balance + v_gift.amount, updated_at = NOW()
  WHERE user_id = v_gift.sender_id;
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (v_gift.sender_id, v_gift.amount, 'refund', 'Gift rejected by receiver — refunded');

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_gift.sender_id, 'system',
    '↩️ Gift Returned',
    format('Your gift of %s CP was declined. Coins returned to your wallet.', v_gift.amount),
    jsonb_build_object('gift_id', p_gift_id, 'amount', v_gift.amount)
  );

  RETURN jsonb_build_object('success', true, 'refunded', v_gift.amount);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 8. RPC: cancel_gift — sender cancels before receiver claims
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_gift(p_gift_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_gift    record;
BEGIN
  SELECT * INTO v_gift FROM public.gift_transactions WHERE id = p_gift_id;
  IF v_gift IS NULL OR v_gift.sender_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift not found or not yours');
  END IF;
  IF v_gift.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift already processed');
  END IF;

  UPDATE public.gift_transactions SET status = 'cancelled' WHERE id = p_gift_id;

  -- Refund sender
  UPDATE public.wallets SET balance = balance + v_gift.amount, updated_at = NOW()
  WHERE user_id = v_user_id;
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (v_user_id, v_gift.amount, 'refund', 'Gift cancelled by sender — refunded');

  RETURN jsonb_build_object('success', true, 'refunded', v_gift.amount);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 9. RPC: get_my_gifts — pending gifts for current user
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_gifts()
RETURNS TABLE (
  id          uuid,
  sender_id   uuid,
  sender_name text,
  sender_avatar text,
  amount      integer,
  message     text,
  status      text,
  expires_at  timestamptz,
  created_at  timestamptz
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    gt.id,
    gt.sender_id,
    p.username,
    p.avatar_url,
    gt.amount,
    gt.message,
    gt.status,
    gt.expires_at,
    gt.created_at
  FROM public.gift_transactions gt
  JOIN public.profiles p ON p.id = gt.sender_id
  WHERE gt.receiver_id = auth.uid()
    AND gt.status = 'pending'
    AND gt.expires_at > NOW()
  ORDER BY gt.created_at DESC;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 10. AUTO-EXPIRE STALE GIFTS (call periodically or on login)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.expire_old_gifts()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count integer;
  r       record;
BEGIN
  v_count := 0;
  FOR r IN
    SELECT * FROM public.gift_transactions
    WHERE status = 'pending' AND expires_at < NOW()
  LOOP
    UPDATE public.gift_transactions SET status = 'expired' WHERE id = r.id;
    UPDATE public.wallets SET balance = balance + r.amount WHERE user_id = r.sender_id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 11. UNIFY NOTIFICATIONS: read from both admin_messages + notifications
--    View that merges both tables for the NotificationBell
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.all_notifications AS
  -- From notifications table (new system)
  SELECT
    id,
    user_id,
    type,
    title,
    message AS content,
    (data->>'action_url') AS action_url,
    is_read AS read,
    false AS is_global,
    created_at,
    expires_at,
    'notifications' AS source_table
  FROM public.notifications
  WHERE expires_at IS NULL OR expires_at > NOW()

  UNION ALL

  -- From admin_messages (legacy)
  SELECT
    id,
    user_id,
    type,
    title,
    content,
    NULL AS action_url,
    read,
    is_global,
    created_at,
    NULL AS expires_at,
    'admin_messages' AS source_table
  FROM public.admin_messages;

GRANT SELECT ON public.all_notifications TO authenticated;
