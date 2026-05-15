-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — Referral System
-- Each user gets a unique code. When friends register using it,
-- both get rewarded with coins.
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. REFERRAL CODES (one per user, auto-generated)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  code        text        NOT NULL UNIQUE,
  uses_count  integer     NOT NULL DEFAULT 0,
  max_uses    integer     DEFAULT NULL,   -- NULL = unlimited
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rc_code_idx ON public.referral_codes(code);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rc_read_self" ON public.referral_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rc_read_code" ON public.referral_codes FOR SELECT USING (is_active = true);
CREATE POLICY "rc_read_admin" ON public.referral_codes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
);
GRANT SELECT ON TABLE public.referral_codes TO authenticated;
GRANT INSERT, UPDATE ON TABLE public.referral_codes TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 2. REFERRAL USES (who referred whom)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referral_uses (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code   text        NOT NULL REFERENCES public.referral_codes(code),
  referrer_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id     uuid        NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  referrer_reward integer     NOT NULL DEFAULT 100,  -- CP given to referrer
  referred_reward integer     NOT NULL DEFAULT 50,   -- CP given to new user
  rewarded        boolean     NOT NULL DEFAULT false,
  rewarded_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ru_referrer_idx  ON public.referral_uses(referrer_id);
CREATE INDEX IF NOT EXISTS ru_referred_idx  ON public.referral_uses(referred_id);

ALTER TABLE public.referral_uses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ru_read_self" ON public.referral_uses FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "ru_read_admin" ON public.referral_uses FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
);
GRANT SELECT ON TABLE public.referral_uses TO authenticated;
GRANT INSERT ON TABLE public.referral_uses TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 3. REFERRAL CONFIG (in system_config, or separate row)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.system_config
  ADD COLUMN IF NOT EXISTS referral_enabled    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS referral_reward_referrer integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS referral_reward_referred  integer NOT NULL DEFAULT 50;

-- ─────────────────────────────────────────────────────────────────────
-- 4. RPC: get_or_create_referral_code — auto-creates code for user
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code    text;
  v_username text;
BEGIN
  -- Return existing code
  SELECT code INTO v_code FROM public.referral_codes WHERE user_id = v_user_id;
  IF v_code IS NOT NULL THEN RETURN v_code; END IF;

  -- Generate new code: CP + username prefix + random
  SELECT COALESCE(upper(substr(username, 1, 4)), 'USER') INTO v_username
  FROM public.profiles WHERE id = v_user_id;

  v_code := v_username || upper(substr(md5(random()::text), 1, 6));

  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.referral_codes WHERE code = v_code) LOOP
    v_code := v_username || upper(substr(md5(random()::text), 1, 6));
  END LOOP;

  INSERT INTO public.referral_codes (user_id, code) VALUES (v_user_id, v_code);
  RETURN v_code;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 5. RPC: apply_referral_code — called during/after registration
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.apply_referral_code(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id       uuid := auth.uid();
  v_ref_code      record;
  v_referrer_reward integer;
  v_referred_reward integer;
  v_config         record;
BEGIN
  -- Get config
  SELECT referral_enabled, referral_reward_referrer, referral_reward_referred
  INTO v_config FROM public.system_config LIMIT 1;

  IF NOT v_config.referral_enabled THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral system disabled');
  END IF;

  -- Find code
  SELECT * INTO v_ref_code FROM public.referral_codes WHERE code = upper(p_code) AND is_active = true;
  IF v_ref_code IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired referral code');
  END IF;

  -- Cannot refer yourself
  IF v_ref_code.user_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot use your own referral code');
  END IF;

  -- Already referred
  IF EXISTS (SELECT 1 FROM public.referral_uses WHERE referred_id = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already used a referral code');
  END IF;

  v_referrer_reward := v_config.referral_reward_referrer;
  v_referred_reward := v_config.referral_reward_referred;

  -- Record referral
  INSERT INTO public.referral_uses (referral_code, referrer_id, referred_id, referrer_reward, referred_reward, rewarded, rewarded_at)
  VALUES (v_ref_code.code, v_ref_code.user_id, v_user_id, v_referrer_reward, v_referred_reward, true, now());

  -- Update use count
  UPDATE public.referral_codes SET uses_count = uses_count + 1 WHERE id = v_ref_code.id;

  -- Grant coins to both
  PERFORM public.admin_adjust_coins(v_ref_code.user_id, v_referrer_reward, 'Referral reward: friend joined');
  PERFORM public.admin_adjust_coins(v_user_id, v_referred_reward, 'Welcome bonus: joined via referral');

  -- Notify referrer
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (v_ref_code.user_id, 'coins_received', '🎉 Referral Reward!',
          format('A friend joined using your code! You earned %s CP.', v_referrer_reward),
          jsonb_build_object('amount', v_referrer_reward, 'referred_user', v_user_id));

  RETURN jsonb_build_object('success', true, 'referrer_reward', v_referrer_reward, 'your_reward', v_referred_reward);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 6. VIEW: referral leaderboard (who has the most referrals)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.referral_leaderboard AS
SELECT
  p.id,
  p.username,
  p.avatar_url,
  rc.code,
  rc.uses_count,
  COALESCE(SUM(ru.referrer_reward), 0) AS total_coins_earned
FROM public.referral_codes rc
JOIN public.profiles p ON p.id = rc.user_id
LEFT JOIN public.referral_uses ru ON ru.referral_code = rc.code
WHERE rc.uses_count > 0
GROUP BY p.id, p.username, p.avatar_url, rc.code, rc.uses_count
ORDER BY rc.uses_count DESC, total_coins_earned DESC;

GRANT SELECT ON public.referral_leaderboard TO authenticated;
