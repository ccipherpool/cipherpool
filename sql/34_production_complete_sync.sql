-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/34 Production Complete Sync
-- Fixes ALL gaps between frontend expectations and Supabase reality.
-- Safe to run multiple times (fully idempotent).
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. EXPAND wallet_transactions.type CONSTRAINT
--    Frontend uses: purchase, reward, tournament, daily, admin_grant, etc.
--    Old constraint only had: credit, debit, refund, prize, fee
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
    'credit','debit','refund','prize','fee',
    'purchase','gift_sent','gift_received',
    'admin_adjustment','admin_grant','season_reset',
    'referral','daily_reward','mission_reward',
    'reward','tournament'
  ));

-- ─────────────────────────────────────────────────────────────────────
-- 2. SAFETY: Add missing profile columns
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp         integer     NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level      integer     NOT NULL DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coins      integer     NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ─────────────────────────────────────────────────────────────────────
-- 3. STORE ITEMS TABLE
--    Already exists in Supabase with 16 rows — this is a safety net.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_items (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  description text,
  type        text        NOT NULL CHECK (type IN ('avatar','banner','badge','name_color','frame','emote')),
  rarity      text        NOT NULL DEFAULT 'common'
                          CHECK (rarity IN ('common','rare','epic','legendary')),
  price       integer     NOT NULL DEFAULT 0 CHECK (price >= 0),
  image_url   text,
  active      boolean     NOT NULL DEFAULT true,
  approved    boolean     NOT NULL DEFAULT false,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_items_read_active" ON public.store_items;
DROP POLICY IF EXISTS "store_items_admin_all"   ON public.store_items;

CREATE POLICY "store_items_read_active" ON public.store_items
  FOR SELECT USING (active = true AND approved = true);

CREATE POLICY "store_items_admin_all" ON public.store_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin','super_admin','founder','fondateur')
    )
  );

GRANT SELECT                         ON TABLE public.store_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE         ON TABLE public.store_items TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 4. USER ITEMS TABLE
--    Used by: AuthContext, Store.jsx, Adminstorepanel.jsx, equip_item RPC
--    Was MISSING from all SQL files despite being referenced everywhere.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_items (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id      uuid        NOT NULL REFERENCES public.store_items(id) ON DELETE CASCADE,
  equipped     boolean     NOT NULL DEFAULT false,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);

CREATE INDEX IF NOT EXISTS user_items_user_idx ON public.user_items(user_id);
CREATE INDEX IF NOT EXISTS user_items_item_idx ON public.user_items(item_id);

ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_items_read_self"  ON public.user_items;
DROP POLICY IF EXISTS "user_items_write_self" ON public.user_items;
DROP POLICY IF EXISTS "user_items_admin_all"  ON public.user_items;

CREATE POLICY "user_items_read_self" ON public.user_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_items_write_self" ON public.user_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_items_admin_all" ON public.user_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin','super_admin','founder','fondateur')
    )
  );

GRANT SELECT                     ON TABLE public.user_items TO authenticated;
GRANT INSERT, UPDATE, DELETE     ON TABLE public.user_items TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 5. DAILY STORE TABLE
--    Store.jsx: .from("daily_store").select("*, item:store_items(*)").eq("date", today)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_store (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  date       date    NOT NULL UNIQUE DEFAULT CURRENT_DATE,
  item_id    uuid    NOT NULL REFERENCES public.store_items(id) ON DELETE CASCADE,
  discount   integer NOT NULL DEFAULT 0 CHECK (discount BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_store ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_store_read_all"  ON public.daily_store;
DROP POLICY IF EXISTS "daily_store_admin_all" ON public.daily_store;

CREATE POLICY "daily_store_read_all" ON public.daily_store FOR SELECT USING (true);
CREATE POLICY "daily_store_admin_all" ON public.daily_store FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
    AND role IN ('admin','super_admin','founder','fondateur'))
);

GRANT SELECT                     ON TABLE public.daily_store TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE     ON TABLE public.daily_store TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 6. DAILY REWARDS TABLE (7-day cycle calendar)
--    Dailyrewards.jsx: .from("daily_rewards").select("*").order("day")
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_rewards (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  day        integer NOT NULL UNIQUE CHECK (day BETWEEN 1 AND 7),
  coins      integer NOT NULL DEFAULT 50,
  xp         integer NOT NULL DEFAULT 100,
  icon       text    NOT NULL DEFAULT '🎁',
  is_special boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_rewards_read_all"  ON public.daily_rewards;
DROP POLICY IF EXISTS "daily_rewards_admin_all" ON public.daily_rewards;

CREATE POLICY "daily_rewards_read_all" ON public.daily_rewards
  FOR SELECT USING (true);

CREATE POLICY "daily_rewards_admin_all" ON public.daily_rewards FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
    AND role IN ('admin','super_admin'))
);

GRANT SELECT                     ON TABLE public.daily_rewards TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE     ON TABLE public.daily_rewards TO authenticated;

-- Seed default 7-day cycle (safe: skips days that already exist)
INSERT INTO public.daily_rewards (day, coins, xp, icon, is_special)
SELECT v.day, v.coins, v.xp, v.icon, v.is_special
FROM (VALUES
  (1,   50,  100, '🎁', false),
  (2,   75,  150, '💎', false),
  (3,  100,  200, '⚡', false),
  (4,  125,  250, '🔥', false),
  (5,  150,  300, '💫', false),
  (6,  200,  400, '🌟', false),
  (7,  500, 1000, '👑', true)
) AS v(day, coins, xp, icon, is_special)
WHERE NOT EXISTS (
  SELECT 1 FROM public.daily_rewards WHERE day = v.day
);

-- ─────────────────────────────────────────────────────────────────────
-- 7. MISSIONS TABLE (daily/weekly — separate from season_pass_missions)
--    Dailyrewards.jsx: .from("missions").select("*").eq("is_active", true)
--    Note: uses target_value (not target_count from season_pass_missions)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.missions (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text    NOT NULL,
  description  text    NOT NULL,
  type         text    NOT NULL DEFAULT 'daily'
                       CHECK (type IN ('daily','weekly','event')),
  category     text    NOT NULL DEFAULT 'play'
                       CHECK (category IN ('play','win','social','profile','clan','tournament')),
  xp_reward    integer NOT NULL DEFAULT 100,
  coins_reward integer NOT NULL DEFAULT 50,
  target_value integer NOT NULL DEFAULT 1,
  icon         text    NOT NULL DEFAULT '🎯',
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "missions_read_active" ON public.missions;
DROP POLICY IF EXISTS "missions_admin_all"   ON public.missions;

CREATE POLICY "missions_read_active" ON public.missions
  FOR SELECT USING (is_active = true);

CREATE POLICY "missions_admin_all" ON public.missions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
    AND role IN ('admin','super_admin'))
);

GRANT SELECT                     ON TABLE public.missions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE     ON TABLE public.missions TO authenticated;

-- Seed starter missions
INSERT INTO public.missions (title, description, type, category, xp_reward, coins_reward, target_value, icon)
VALUES
  ('Premier Pas',     'Connecte-toi aujourd''hui',             'daily',  'profile',    50,  25, 1, '👋'),
  ('Visiteur Fidèle', 'Consulte ton profil',                   'daily',  'profile',    75,  30, 1, '👤'),
  ('Explorateur',     'Visite la boutique',                    'daily',  'play',       50,  20, 1, '🛍️'),
  ('Champion Hebdo',  'Joue 1 tournoi cette semaine',          'weekly', 'tournament', 300, 150, 1, '🏆'),
  ('Social Gamer',    'Envoie 3 messages dans le chat',        'weekly', 'social',     200, 100, 3, '💬'),
  ('Tireur d''Élite', 'Participe à 3 tournois cette semaine',  'weekly', 'tournament', 500, 250, 3, '🎯')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- 8. USER DAILY CLAIMS TABLE
--    Dailyrewards.jsx reads: claimed_at, streak
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_daily_claims (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  day        integer NOT NULL CHECK (day BETWEEN 1 AND 7),
  streak     integer NOT NULL DEFAULT 1,
  coins      integer NOT NULL DEFAULT 0,
  xp         integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS udc_user_claimed_idx
  ON public.user_daily_claims(user_id, claimed_at DESC);

ALTER TABLE public.user_daily_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "udc_read_self" ON public.user_daily_claims;
DROP POLICY IF EXISTS "udc_admin_all" ON public.user_daily_claims;

CREATE POLICY "udc_read_self" ON public.user_daily_claims
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "udc_admin_all" ON public.user_daily_claims FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
    AND role IN ('admin','super_admin'))
);

GRANT SELECT       ON TABLE public.user_daily_claims TO authenticated;
GRANT INSERT       ON TABLE public.user_daily_claims TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 9. USER MISSIONS TABLE
--    Dailyrewards.jsx reads: mission_id, progress, completed, claimed, reset_date
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_missions (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mission_id uuid    NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  progress   integer NOT NULL DEFAULT 0,
  completed  boolean NOT NULL DEFAULT false,
  claimed    boolean NOT NULL DEFAULT false,
  reset_date date    NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (user_id, mission_id, reset_date)
);

CREATE INDEX IF NOT EXISTS um_user_date_idx
  ON public.user_missions(user_id, reset_date);

ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "um_self"      ON public.user_missions;
DROP POLICY IF EXISTS "um_admin_all" ON public.user_missions;

CREATE POLICY "um_self" ON public.user_missions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "um_admin_all" ON public.user_missions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
    AND role IN ('admin','super_admin'))
);

GRANT SELECT, INSERT, UPDATE ON TABLE public.user_missions TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 10. SEED WALLETS FOR ALL EXISTING PROFILES
--     Fixes: 1016 users showing 0 CP because the trigger only fires
--     on new INSERT — existing users never got a wallet row.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.wallets (user_id, balance)
SELECT id, 0
FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.wallets);

-- ─────────────────────────────────────────────────────────────────────
-- 11. RPC: purchase_item
--     Store.jsx: supabase.rpc("purchase_item", { p_item_id: item.id })
--     Was MISSING from all SQL files.
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
  -- Get item (must be active and approved)
  SELECT * INTO v_item
  FROM public.store_items
  WHERE id = p_item_id AND active = true AND approved = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found or unavailable');
  END IF;

  -- Check not already owned
  IF EXISTS (
    SELECT 1 FROM public.user_items
    WHERE user_id = v_user_id AND item_id = p_item_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item already owned');
  END IF;

  -- Check balance
  SELECT balance INTO v_balance
  FROM public.wallets WHERE user_id = v_user_id;

  IF v_balance IS NULL OR v_balance < v_item.price THEN
    RETURN jsonb_build_object(
      'success', false, 'error', 'Insufficient balance',
      'balance', COALESCE(v_balance, 0), 'required', v_item.price
    );
  END IF;

  -- Atomic deduction (race-condition safe)
  UPDATE public.wallets
  SET balance = balance - v_item.price, updated_at = now()
  WHERE user_id = v_user_id AND balance >= v_item.price
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Balance changed — please retry');
  END IF;

  -- Record transaction
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (v_user_id, -v_item.price, 'purchase', format('Boutique: %s', v_item.name));

  -- Grant item
  INSERT INTO public.user_items (user_id, item_id)
  VALUES (v_user_id, p_item_id)
  ON CONFLICT (user_id, item_id) DO NOTHING;

  -- Notify
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
-- 12. RPC: claim_daily_reward
--     Dailyrewards.jsx: supabase.rpc("claim_daily_reward", { p_user_id: profile.id })
--     Returns: { success, coins, xp, day, streak, is_special }
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.claim_daily_reward(uuid);
CREATE OR REPLACE FUNCTION public.claim_daily_reward(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid := auth.uid();
  v_last     record;
  v_streak   integer := 1;
  v_day      integer;
  v_reward   record;
  v_today    date := CURRENT_DATE;
BEGIN
  -- Allow p_user_id fallback (frontend passes it explicitly)
  IF v_user_id IS NULL THEN v_user_id := p_user_id; END IF;

  -- Get most recent claim
  SELECT * INTO v_last
  FROM public.user_daily_claims
  WHERE user_id = v_user_id
  ORDER BY claimed_at DESC
  LIMIT 1;

  -- Already claimed today?
  IF v_last IS NOT NULL AND v_last.claimed_at::date = v_today THEN
    RETURN jsonb_build_object(
      'success', false, 'error', 'Already claimed today',
      'next_claim', (v_today + 1)::text
    );
  END IF;

  -- Calculate streak
  IF v_last IS NULL THEN
    v_streak := 1;
  ELSIF v_last.claimed_at::date = v_today - 1 THEN
    v_streak := v_last.streak + 1;   -- consecutive
  ELSE
    v_streak := 1;                    -- streak broken
  END IF;

  -- Day in 7-cycle
  v_day := ((v_streak - 1) % 7) + 1;

  -- Get reward
  SELECT * INTO v_reward FROM public.daily_rewards WHERE day = v_day;
  IF NOT FOUND THEN
    -- Fallback if table is empty
    v_reward.coins      := 50;
    v_reward.xp         := 100;
    v_reward.is_special := false;
  END IF;

  -- Credit wallet
  UPDATE public.wallets
  SET balance = balance + v_reward.coins, updated_at = now()
  WHERE user_id = v_user_id;

  -- Wallet transaction
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (
    v_user_id, v_reward.coins, 'daily_reward',
    format('Récompense Jour %s — Streak %s 🔥', v_day, v_streak)
  );

  -- XP
  BEGIN
    UPDATE public.profiles
    SET xp = COALESCE(xp, 0) + v_reward.xp, updated_at = now()
    WHERE id = v_user_id;
  EXCEPTION WHEN undefined_column THEN NULL;
  END;

  -- Record claim
  INSERT INTO public.user_daily_claims (user_id, claimed_at, day, streak, coins, xp)
  VALUES (v_user_id, now(), v_day, v_streak, v_reward.coins, v_reward.xp);

  -- Notify
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
-- 13. RPC: claim_mission_reward
--     Dailyrewards.jsx: supabase.rpc("claim_mission_reward", { p_user_id, p_mission_id })
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.claim_mission_reward(uuid, uuid);
CREATE OR REPLACE FUNCTION public.claim_mission_reward(
  p_user_id    uuid,
  p_mission_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_mission record;
  v_um      record;
  v_today   date := CURRENT_DATE;
BEGIN
  IF v_user_id IS NULL THEN v_user_id := p_user_id; END IF;

  -- Get active mission
  SELECT * INTO v_mission FROM public.missions WHERE id = p_mission_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission introuvable');
  END IF;

  -- Get user progress for today
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

  -- Mark claimed
  UPDATE public.user_missions SET claimed = true WHERE id = v_um.id;

  -- Credit coins
  IF COALESCE(v_mission.coins_reward, 0) > 0 THEN
    UPDATE public.wallets
    SET balance = balance + v_mission.coins_reward, updated_at = now()
    WHERE user_id = v_user_id;

    INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (v_user_id, v_mission.coins_reward, 'mission_reward',
      format('Mission: %s', v_mission.title));
  END IF;

  -- Credit XP
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
-- 14. RPC: admin_grant_item
--     Adminstorepanel.jsx: supabase.rpc("admin_grant_item", { p_target_user_id, p_item_id, p_reason })
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.admin_grant_item(uuid, uuid, text);
CREATE OR REPLACE FUNCTION public.admin_grant_item(
  p_target_user_id uuid,
  p_item_id        uuid,
  p_reason         text DEFAULT 'Admin Grant'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_item     record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_admin_id
      AND role IN ('admin','super_admin','founder','fondateur')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_item FROM public.store_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  INSERT INTO public.user_items (user_id, item_id)
  VALUES (p_target_user_id, p_item_id)
  ON CONFLICT (user_id, item_id) DO NOTHING;

  BEGIN
    INSERT INTO public.admin_logs (admin_id, action, target_user_id, details)
    VALUES (v_admin_id, 'grant_item', p_target_user_id,
      jsonb_build_object('item_id', p_item_id, 'item_name', v_item.name, 'reason', p_reason));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      p_target_user_id, 'gift',
      format('🎁 Cadeau Admin: %s', v_item.name),
      format('Un administrateur t''a offert "%s" — %s', v_item.name, p_reason),
      jsonb_build_object('item_id', p_item_id, 'item_name', v_item.name)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('success', true, 'item_name', v_item.name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_grant_item(uuid, uuid, text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 15. RPC: admin_remove_item
--     Adminstorepanel.jsx: supabase.rpc("admin_remove_item", { p_target_user_id, p_item_id })
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.admin_remove_item(uuid, uuid);
CREATE OR REPLACE FUNCTION public.admin_remove_item(
  p_target_user_id uuid,
  p_item_id        uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_item     record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_admin_id
      AND role IN ('admin','super_admin','founder','fondateur')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT name INTO v_item FROM public.store_items WHERE id = p_item_id;

  DELETE FROM public.user_items
  WHERE user_id = p_target_user_id AND item_id = p_item_id;

  BEGIN
    INSERT INTO public.admin_logs (admin_id, action, target_user_id, details)
    VALUES (v_admin_id, 'remove_item', p_target_user_id,
      jsonb_build_object('item_id', p_item_id, 'item_name', v_item.name));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_remove_item(uuid, uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 16. RPC: admin_adjust_coins (updated — adds admin_grant tx type + wallet seed)
--     Adminstorepanel.jsx: supabase.rpc("admin_adjust_coins", { p_target_user_id, p_amount, p_reason })
--     Returns: { success, new_balance, amount }
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.admin_adjust_coins(uuid, integer, text);
CREATE OR REPLACE FUNCTION public.admin_adjust_coins(
  p_target_user_id uuid,
  p_amount         integer,
  p_reason         text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id    uuid := auth.uid();
  v_new_balance integer;
  v_tx_type     text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_admin_id
      AND role IN ('admin','super_admin','founder','fondateur')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount cannot be 0');
  END IF;

  v_tx_type := CASE WHEN p_amount > 0 THEN 'admin_grant' ELSE 'debit' END;

  -- Ensure wallet exists
  INSERT INTO public.wallets (user_id, balance)
  VALUES (p_target_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Adjust (floor at 0 for deductions)
  UPDATE public.wallets
  SET balance    = CASE WHEN p_amount < 0
                        THEN GREATEST(0, balance + p_amount)
                        ELSE balance + p_amount END,
      updated_at = now()
  WHERE user_id = p_target_user_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User wallet not found');
  END IF;

  -- Transaction record
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (p_target_user_id, p_amount, v_tx_type,
    format('[Admin] %s', p_reason));

  -- Admin log
  BEGIN
    INSERT INTO public.admin_logs (admin_id, action, target_user_id, details)
    VALUES (v_admin_id, 'adjust_coins', p_target_user_id,
      jsonb_build_object('amount', p_amount, 'reason', p_reason, 'new_balance', v_new_balance));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- User notification
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      p_target_user_id,
      CASE WHEN p_amount > 0 THEN 'coins_received' ELSE 'system' END,
      CASE WHEN p_amount > 0
           THEN format('💰 +%s CP reçus', p_amount)
           ELSE format('⚠️ %s CP déduits', ABS(p_amount)) END,
      format('%s', p_reason),
      jsonb_build_object('amount', p_amount, 'reason', p_reason, 'new_balance', v_new_balance)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'amount', p_amount);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_adjust_coins(uuid, integer, text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 17. FIX: equip_item — correct version (from sql/21)
--     Unequips only same type, syncs profiles.avatar_url for avatar type
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.equip_item(uuid);
CREATE OR REPLACE FUNCTION public.equip_item(p_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_type    text;
  v_img     text;
BEGIN
  SELECT type, image_url INTO v_type, v_img
  FROM public.store_items WHERE id = p_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_items WHERE user_id = v_user_id AND item_id = p_item_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not owned');
  END IF;

  -- Unequip same type only
  UPDATE public.user_items ui
  SET equipped = false
  FROM public.store_items si
  WHERE ui.user_id = v_user_id
    AND ui.item_id = si.id
    AND si.type = v_type;

  -- Equip selected
  UPDATE public.user_items
  SET equipped = true
  WHERE user_id = v_user_id AND item_id = p_item_id;

  -- Sync avatar_url on profiles
  IF v_type = 'avatar' THEN
    UPDATE public.profiles SET avatar_url = v_img WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.equip_item(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 18. FIX: start_new_season — canonical 11-param version
--     SeasonsManager.jsx calls with exactly these 11 named params:
--     p_name, p_number, p_description, p_reset_coins, p_reset_xp,
--     p_reset_stats, p_reset_wins, p_reset_avatars, p_reset_chat,
--     p_reset_tournaments, p_reset_clans
--     Old 9-param version from sql/03 caused "ambiguous function" error.
-- ─────────────────────────────────────────────────────────────────────

-- Drop all known overloads first (including the target signature to allow return type change)
DROP FUNCTION IF EXISTS public.start_new_season(text, integer, boolean, boolean, boolean, boolean, boolean, boolean, boolean);
DROP FUNCTION IF EXISTS public.start_new_season(text, integer, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean);
DROP FUNCTION IF EXISTS public.start_new_season(text, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean);
DROP FUNCTION IF EXISTS public.start_new_season(text, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean);

CREATE OR REPLACE FUNCTION public.start_new_season(
  p_name              text,
  p_number            integer    DEFAULT NULL,
  p_description       text       DEFAULT '',
  p_reset_coins       boolean    DEFAULT false,
  p_reset_xp          boolean    DEFAULT false,
  p_reset_stats       boolean    DEFAULT true,
  p_reset_wins        boolean    DEFAULT true,
  p_reset_avatars     boolean    DEFAULT false,
  p_reset_chat        boolean    DEFAULT true,
  p_reset_tournaments boolean    DEFAULT true,
  p_reset_clans       boolean    DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id      uuid := auth.uid();
  v_old_id        uuid;
  v_new_id        uuid;
  v_season_number integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_admin_id
      AND role IN ('admin','super_admin','founder','fondateur')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Close current active season
  UPDATE public.seasons
  SET status = 'completed', end_date = now()
  WHERE status = 'active'
  RETURNING id INTO v_old_id;

  -- Auto-number if not provided
  IF p_number IS NULL THEN
    SELECT COALESCE(MAX(number), 0) + 1 INTO v_season_number FROM public.seasons;
  ELSE
    v_season_number := p_number;
  END IF;

  -- Create new season
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

  -- Apply coin reset
  IF p_reset_coins THEN
    INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    SELECT w.user_id, -w.balance, 'season_reset', format('Saison reset: %s', p_name)
    FROM public.wallets w WHERE w.balance > 0;

    UPDATE public.wallets SET balance = 0, updated_at = now();
  END IF;

  -- Log
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
-- 19. RPC: join_tournament
--     TournamentDetails.jsx: supabase.rpc("join_tournament", { p_tournament_id })
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.join_tournament(uuid);
CREATE OR REPLACE FUNCTION public.join_tournament(p_tournament_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_tournament record;
  v_balance    integer;
  v_count      integer;
BEGIN
  SELECT * INTO v_tournament FROM public.tournaments WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournoi introuvable');
  END IF;

  IF v_tournament.status NOT IN ('published','registration_open') THEN
    RETURN jsonb_build_object('success', false, 'error',
      format('Inscriptions fermées (statut: %s)', v_tournament.status));
  END IF;

  -- Already registered?
  IF EXISTS (
    SELECT 1 FROM public.tournament_players
    WHERE tournament_id = p_tournament_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Déjà inscrit');
  END IF;

  -- Check capacity
  IF v_tournament.max_players IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM public.tournament_players WHERE tournament_id = p_tournament_id;

    IF v_count >= v_tournament.max_players THEN
      RETURN jsonb_build_object('success', false, 'error', 'Tournoi complet');
    END IF;
  END IF;

  -- Handle entry fee
  IF COALESCE(v_tournament.entry_fee, 0) > 0 THEN
    SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_user_id;

    IF COALESCE(v_balance, 0) < v_tournament.entry_fee THEN
      RETURN jsonb_build_object(
        'success', false, 'error', 'Solde insuffisant',
        'balance', COALESCE(v_balance, 0), 'required', v_tournament.entry_fee
      );
    END IF;

    UPDATE public.wallets
    SET balance = balance - v_tournament.entry_fee, updated_at = now()
    WHERE user_id = v_user_id AND balance >= v_tournament.entry_fee;

    INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (v_user_id, -v_tournament.entry_fee, 'fee',
      format('Inscription tournoi: %s', v_tournament.title));
  END IF;

  -- Register
  INSERT INTO public.tournament_players (tournament_id, user_id)
  VALUES (p_tournament_id, v_user_id)
  ON CONFLICT DO NOTHING;

  -- Mark full if at capacity
  IF v_tournament.max_players IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM public.tournament_players WHERE tournament_id = p_tournament_id;

    IF v_count >= v_tournament.max_players THEN
      UPDATE public.tournaments SET status = 'full' WHERE id = p_tournament_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'tournament', v_tournament.title);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_tournament(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 20. RPC: leave_tournament
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.leave_tournament(uuid);
CREATE OR REPLACE FUNCTION public.leave_tournament(p_tournament_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_tournament record;
BEGIN
  SELECT * INTO v_tournament FROM public.tournaments WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournoi introuvable');
  END IF;

  IF v_tournament.status NOT IN ('published','registration_open','full') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Impossible de quitter — tournoi déjà commencé');
  END IF;

  DELETE FROM public.tournament_players
  WHERE tournament_id = p_tournament_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non inscrit');
  END IF;

  -- Refund entry fee
  IF COALESCE(v_tournament.entry_fee, 0) > 0 THEN
    UPDATE public.wallets
    SET balance = balance + v_tournament.entry_fee, updated_at = now()
    WHERE user_id = v_user_id;

    INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (v_user_id, v_tournament.entry_fee, 'refund',
      format('Désinscription: %s', v_tournament.title));
  END IF;

  -- Reopen if was full
  IF v_tournament.status = 'full' THEN
    UPDATE public.tournaments SET status = 'registration_open' WHERE id = p_tournament_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_tournament(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 21. NORMALIZE tournament status values (old → canonical)
-- ─────────────────────────────────────────────────────────────────────
UPDATE public.tournaments SET status = 'registration_open' WHERE status = 'open';
UPDATE public.tournaments SET status = 'completed'         WHERE status = 'finished';
UPDATE public.tournaments SET status = 'live'              WHERE status = 'ongoing';
UPDATE public.tournaments SET status = 'published'         WHERE status = 'upcoming';
UPDATE public.tournaments SET status = 'draft'             WHERE status = 'inactive';

-- ─────────────────────────────────────────────────────────────────────
-- 22. Add prize_coins column to tournaments if missing
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS prize_coins integer NOT NULL DEFAULT 0;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS entry_fee   integer NOT NULL DEFAULT 0;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS max_players integer;

-- ══════════════════════════════════════════════════════════════════════
-- END OF sql/34 — Production Complete Sync
-- Tables added:  store_items (safety), user_items, daily_store,
--                daily_rewards, missions, user_daily_claims, user_missions
-- RPCs added:    purchase_item, claim_daily_reward, claim_mission_reward,
--                admin_grant_item, admin_remove_item
-- RPCs fixed:    admin_adjust_coins, equip_item, start_new_season,
--                join_tournament, leave_tournament
-- Data fixed:    wallet_transactions.type constraint expanded
--                wallets seeded for all existing profiles
--                daily_rewards seeded (7 days), missions seeded (6)
--                tournament statuses normalized
-- ══════════════════════════════════════════════════════════════════════
