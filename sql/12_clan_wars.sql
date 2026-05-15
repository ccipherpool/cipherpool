-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — Clan Wars System
-- Clan vs Clan: compete for points, win prizes and leaderboard placement
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. CLAN WARS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clan_wars (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_a_id       uuid        NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  clan_b_id       uuid        NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  status          text        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','active','completed','cancelled')),
  clan_a_score    integer     NOT NULL DEFAULT 0,
  clan_b_score    integer     NOT NULL DEFAULT 0,
  winner_clan_id  uuid        REFERENCES public.clans(id) ON DELETE SET NULL,
  prize_pool_cp   integer     NOT NULL DEFAULT 0,
  starts_at       timestamptz NOT NULL DEFAULT now(),
  ends_at         timestamptz NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  declared_by     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (clan_a_id != clan_b_id)
);

CREATE INDEX IF NOT EXISTS cw_clan_a_idx  ON public.clan_wars(clan_a_id);
CREATE INDEX IF NOT EXISTS cw_clan_b_idx  ON public.clan_wars(clan_b_id);
CREATE INDEX IF NOT EXISTS cw_status_idx  ON public.clan_wars(status);

ALTER TABLE public.clan_wars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cw_read_all" ON public.clan_wars FOR SELECT USING (true);
CREATE POLICY "cw_write_leader" ON public.clan_wars FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clan_members
    WHERE user_id = auth.uid() AND clan_id = clan_a_id AND role IN ('leader','co-leader')
  )
);
CREATE POLICY "cw_manage_admin" ON public.clan_wars FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
);
GRANT SELECT ON TABLE public.clan_wars TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.clan_wars TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 2. CLAN WAR CONTRIBUTIONS (player-level points)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clan_war_contributions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  war_id        uuid        NOT NULL REFERENCES public.clan_wars(id) ON DELETE CASCADE,
  clan_id       uuid        NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tournament_id uuid        REFERENCES public.tournaments(id) ON DELETE SET NULL,
  points        integer     NOT NULL DEFAULT 0,
  kills         integer     DEFAULT 0,
  wins          integer     DEFAULT 0,
  reason        text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cwc_war_idx  ON public.clan_war_contributions(war_id);
CREATE INDEX IF NOT EXISTS cwc_clan_idx ON public.clan_war_contributions(clan_id);
CREATE INDEX IF NOT EXISTS cwc_user_idx ON public.clan_war_contributions(user_id);

ALTER TABLE public.clan_war_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cwc_read_all" ON public.clan_war_contributions FOR SELECT USING (true);
CREATE POLICY "cwc_write_self" ON public.clan_war_contributions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cwc_manage_admin" ON public.clan_war_contributions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
);
GRANT SELECT ON TABLE public.clan_war_contributions TO anon, authenticated;
GRANT INSERT ON TABLE public.clan_war_contributions TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 3. CLAN WAR LEADERBOARD (view: top clans by war wins)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.clan_war_leaderboard AS
SELECT
  c.id,
  c.name,
  c.tag,
  c.logo_url,
  c.accent_color,
  COUNT(CASE WHEN cw.winner_clan_id = c.id THEN 1 END) AS war_wins,
  COUNT(CASE WHEN (cw.clan_a_id = c.id OR cw.clan_b_id = c.id) AND cw.status = 'completed' THEN 1 END) AS total_wars,
  COALESCE(SUM(CASE WHEN cw.clan_a_id = c.id THEN cw.clan_a_score WHEN cw.clan_b_id = c.id THEN cw.clan_b_score ELSE 0 END), 0) AS total_points
FROM public.clans c
LEFT JOIN public.clan_wars cw ON (cw.clan_a_id = c.id OR cw.clan_b_id = c.id) AND cw.status = 'completed'
GROUP BY c.id, c.name, c.tag, c.logo_url, c.accent_color
ORDER BY war_wins DESC, total_points DESC;

GRANT SELECT ON public.clan_war_leaderboard TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 4. RPC: add_war_points — add points to a clan in an active war
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.add_war_points(
  p_war_id   uuid,
  p_clan_id  uuid,
  p_user_id  uuid,
  p_points   integer,
  p_kills    integer DEFAULT 0,
  p_wins     integer DEFAULT 0,
  p_reason   text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_war record;
BEGIN
  SELECT * INTO v_war FROM public.clan_wars WHERE id = p_war_id AND status = 'active';
  IF v_war IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'War not found or not active');
  END IF;

  -- Verify clan is in this war
  IF v_war.clan_a_id != p_clan_id AND v_war.clan_b_id != p_clan_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Clan is not part of this war');
  END IF;

  -- Add contribution
  INSERT INTO public.clan_war_contributions (war_id, clan_id, user_id, points, kills, wins, reason)
  VALUES (p_war_id, p_clan_id, p_user_id, p_points, p_kills, p_wins, p_reason);

  -- Update war score
  IF v_war.clan_a_id = p_clan_id THEN
    UPDATE public.clan_wars SET clan_a_score = clan_a_score + p_points, updated_at = now() WHERE id = p_war_id;
  ELSE
    UPDATE public.clan_wars SET clan_b_score = clan_b_score + p_points, updated_at = now() WHERE id = p_war_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 5. RPC: resolve_clan_war — end a war and distribute prizes
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_clan_war(p_war_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_war       record;
  v_winner_id uuid;
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;

  SELECT * INTO v_war FROM public.clan_wars WHERE id = p_war_id AND status = 'active';
  IF v_war IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'War not found or already resolved');
  END IF;

  -- Determine winner
  IF v_war.clan_a_score > v_war.clan_b_score THEN
    v_winner_id := v_war.clan_a_id;
  ELSIF v_war.clan_b_score > v_war.clan_a_score THEN
    v_winner_id := v_war.clan_b_id;
  ELSE
    v_winner_id := NULL; -- Draw
  END IF;

  -- Mark as completed
  UPDATE public.clan_wars
  SET status = 'completed', winner_clan_id = v_winner_id, ends_at = now(), updated_at = now()
  WHERE id = p_war_id;

  -- Notify clan members (winners)
  IF v_winner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    SELECT cm.user_id, 'announcement', '🏆 Clan War Victory!',
           'Your clan won the war! Collect your rewards.', jsonb_build_object('war_id', p_war_id)
    FROM public.clan_members cm WHERE cm.clan_id = v_winner_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'winner_clan_id', v_winner_id);
END;
$$;
