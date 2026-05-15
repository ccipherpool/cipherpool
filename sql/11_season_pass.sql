-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — Season Pass (Battle Pass System)
-- Like Fortnite Battle Pass: missions → XP → levels → rewards
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. SEASON PASS TIERS (levels 1–100, each with free + premium reward)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.season_pass_tiers (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id     uuid    NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  tier          integer NOT NULL CHECK (tier BETWEEN 1 AND 100),
  xp_required   integer NOT NULL DEFAULT 500,   -- XP needed to reach this tier

  -- Free track rewards
  free_coins    integer DEFAULT 0,
  free_item_id  uuid,
  free_badge_id uuid,
  free_label    text,

  -- Premium track rewards
  premium_coins    integer DEFAULT 0,
  premium_item_id  uuid,
  premium_badge_id uuid,
  premium_label    text,

  UNIQUE (season_id, tier)
);

CREATE INDEX IF NOT EXISTS spt_season_idx ON public.season_pass_tiers(season_id);

ALTER TABLE public.season_pass_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spt_read_all" ON public.season_pass_tiers FOR SELECT USING (true);
CREATE POLICY "spt_write_admin" ON public.season_pass_tiers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
);
GRANT SELECT ON TABLE public.season_pass_tiers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.season_pass_tiers TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 2. SEASON PASS MISSIONS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.season_pass_missions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id    uuid        NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  title        text        NOT NULL,
  description  text        NOT NULL,
  type         text        NOT NULL CHECK (type IN ('daily','weekly','seasonal','event')),
  category     text        NOT NULL CHECK (category IN ('play','win','social','profile','clan')),
  xp_reward    integer     NOT NULL DEFAULT 100,
  coins_reward integer     NOT NULL DEFAULT 0,
  target_count integer     NOT NULL DEFAULT 1,     -- e.g. "play 3 tournaments" → target_count=3
  icon         text        DEFAULT '🎯',
  is_active    boolean     NOT NULL DEFAULT true,
  reset_at     timestamptz,                        -- when daily/weekly missions reset
  expires_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS spm_season_idx ON public.season_pass_missions(season_id, is_active);

ALTER TABLE public.season_pass_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spm_read_all" ON public.season_pass_missions FOR SELECT USING (is_active = true);
CREATE POLICY "spm_write_admin" ON public.season_pass_missions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
);
GRANT SELECT ON TABLE public.season_pass_missions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.season_pass_missions TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 3. USER SEASON PASS (one row per user per season)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_season_pass (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season_id    uuid        NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  current_xp   integer     NOT NULL DEFAULT 0,
  current_tier integer     NOT NULL DEFAULT 0,
  is_premium   boolean     NOT NULL DEFAULT false,  -- paid premium track
  purchased_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, season_id)
);

CREATE INDEX IF NOT EXISTS usp_user_idx   ON public.user_season_pass(user_id);
CREATE INDEX IF NOT EXISTS usp_season_idx ON public.user_season_pass(season_id);

ALTER TABLE public.user_season_pass ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usp_read_self" ON public.user_season_pass FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "usp_read_admin" ON public.user_season_pass FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
);
GRANT SELECT ON TABLE public.user_season_pass TO authenticated;
GRANT INSERT, UPDATE ON TABLE public.user_season_pass TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 4. USER MISSION PROGRESS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_mission_progress (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mission_id   uuid        NOT NULL REFERENCES public.season_pass_missions(id) ON DELETE CASCADE,
  progress     integer     NOT NULL DEFAULT 0,
  completed    boolean     NOT NULL DEFAULT false,
  completed_at timestamptz,
  rewarded     boolean     NOT NULL DEFAULT false,
  UNIQUE (user_id, mission_id)
);

CREATE INDEX IF NOT EXISTS ump_user_idx    ON public.user_mission_progress(user_id);
CREATE INDEX IF NOT EXISTS ump_mission_idx ON public.user_mission_progress(mission_id);

ALTER TABLE public.user_mission_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ump_self" ON public.user_mission_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_mission_progress TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 5. RPC: add_season_xp — add XP and auto-level up
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.add_season_xp(
  p_user_id  uuid,
  p_season_id uuid,
  p_xp       integer
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_usp     record;
  v_new_xp  integer;
  v_new_tier integer;
  v_tier    record;
BEGIN
  -- Upsert user season pass
  INSERT INTO public.user_season_pass (user_id, season_id, current_xp, current_tier)
  VALUES (p_user_id, p_season_id, 0, 0)
  ON CONFLICT (user_id, season_id) DO NOTHING;

  SELECT * INTO v_usp FROM public.user_season_pass WHERE user_id = p_user_id AND season_id = p_season_id;
  v_new_xp := v_usp.current_xp + p_xp;

  -- Calculate new tier based on cumulative XP
  SELECT COALESCE(MAX(tier), 0) INTO v_new_tier
  FROM public.season_pass_tiers
  WHERE season_id = p_season_id
    AND xp_required <= v_new_xp;

  UPDATE public.user_season_pass
  SET current_xp = v_new_xp, current_tier = GREATEST(current_tier, v_new_tier), updated_at = now()
  WHERE user_id = p_user_id AND season_id = p_season_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_xp', v_new_xp,
    'new_tier', GREATEST(v_usp.current_tier, v_new_tier),
    'leveled_up', GREATEST(v_usp.current_tier, v_new_tier) > v_usp.current_tier
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 6. SAMPLE: Insert default missions for first season
-- ─────────────────────────────────────────────────────────────────────
-- Run after creating a season:
-- INSERT INTO public.season_pass_missions (season_id, title, description, type, category, xp_reward, coins_reward, target_count, icon)
-- SELECT id, 'First Blood', 'Play your first tournament', 'seasonal', 'play', 500, 100, 1, '🎮'
-- FROM public.seasons WHERE status = 'active' LIMIT 1;
