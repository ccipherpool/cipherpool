-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — Fair-Play Score + Verified Players
-- Fair-play: reputation system (positive/negative events)
-- Verified: badge for verified/trusted players
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. ADD FAIR-PLAY AND VERIFIED FIELDS TO PROFILES
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fair_play_score   integer     NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS is_verified       boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at       timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by       uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_note     text;

CREATE INDEX IF NOT EXISTS profiles_fp_score_idx ON public.profiles(fair_play_score DESC);
CREATE INDEX IF NOT EXISTS profiles_verified_idx  ON public.profiles(is_verified);

-- ─────────────────────────────────────────────────────────────────────
-- 2. FAIR-PLAY EVENTS TABLE
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fair_play_events (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type    text        NOT NULL CHECK (event_type IN (
                  'report_confirmed',   -- someone's report about them was confirmed (-points)
                  'report_dismissed',   -- their report was dismissed (neutral)
                  'tournament_won',     -- won a tournament (+points)
                  'fair_match',         -- completed match without issues (+points)
                  'toxic_behavior',     -- admin flagged toxic (-points)
                  'account_restored',   -- unbanned (+points)
                  'rage_quit',          -- left tournament mid-game (-points)
                  'multiple_accounts',  -- caught with multiple accounts (-points)
                  'good_sportsmanship', -- commended by admin (+points)
                  'manual_admin'        -- manual admin adjustment
                )),
  delta         integer     NOT NULL,   -- positive or negative point change
  reason        text,
  admin_id      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  tournament_id uuid        REFERENCES public.tournaments(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fpe_user_idx ON public.fair_play_events(user_id);
CREATE INDEX IF NOT EXISTS fpe_date_idx ON public.fair_play_events(created_at DESC);

ALTER TABLE public.fair_play_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fpe_read_self" ON public.fair_play_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fpe_read_admin" ON public.fair_play_events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
);
GRANT SELECT ON TABLE public.fair_play_events TO authenticated;
GRANT INSERT ON TABLE public.fair_play_events TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 3. FAIR-PLAY EVENT DELTA CONSTANTS (reference)
-- ─────────────────────────────────────────────────────────────────────
-- report_confirmed:   -15
-- tournament_won:     +10
-- fair_match:         +2
-- toxic_behavior:     -25
-- account_restored:   +10
-- rage_quit:          -10
-- multiple_accounts:  -50
-- good_sportsmanship: +15
-- Score range: 0–200 (starts at 100)

-- ─────────────────────────────────────────────────────────────────────
-- 4. RPC: apply_fair_play_event — apply an event and update score
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.apply_fair_play_event(
  p_user_id     uuid,
  p_event_type  text,
  p_delta       integer,
  p_reason      text DEFAULT NULL,
  p_tournament_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_role text;
  v_new_score   integer;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;

  -- Log the event
  INSERT INTO public.fair_play_events (user_id, event_type, delta, reason, admin_id, tournament_id)
  VALUES (p_user_id, p_event_type, p_delta, p_reason, auth.uid(), p_tournament_id);

  -- Update score (clamp between 0 and 200)
  UPDATE public.profiles
  SET fair_play_score = GREATEST(0, LEAST(200, fair_play_score + p_delta)), updated_at = now()
  WHERE id = p_user_id
  RETURNING fair_play_score INTO v_new_score;

  -- Notify user of significant changes
  IF ABS(p_delta) >= 10 THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      p_user_id,
      'system',
      CASE WHEN p_delta > 0 THEN '✅ Fair-play Score Increased' ELSE '⚠️ Fair-play Score Decreased' END,
      COALESCE(p_reason, CASE WHEN p_delta > 0 THEN 'Good sportsmanship!' ELSE 'Behavior penalty applied.' END),
      jsonb_build_object('delta', p_delta, 'new_score', v_new_score)
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'new_score', v_new_score, 'delta', p_delta);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 5. RPC: verify_player — grant verified badge
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verify_player(
  p_user_id uuid,
  p_note    text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;

  UPDATE public.profiles
  SET is_verified = true, verified_at = now(), verified_by = auth.uid(), verified_note = p_note, updated_at = now()
  WHERE id = p_user_id;

  -- Notify user
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (p_user_id, 'achievement', '✅ Verified Player Badge!', 'Congratulations! You are now a Verified Player on CipherPool.');

  -- Fair-play bonus for verification
  PERFORM public.apply_fair_play_event(p_user_id, 'good_sportsmanship', 20, 'Verified player badge granted');

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 6. RPC: revoke_verification
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.revoke_verification(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;

  UPDATE public.profiles
  SET is_verified = false, verified_at = NULL, verified_by = NULL, verified_note = NULL, updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 7. FAIR-PLAY RANK LABEL (computed function)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fair_play_rank(score integer)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN score >= 180 THEN 'Exemplary'
    WHEN score >= 140 THEN 'Honorable'
    WHEN score >= 100 THEN 'Fair'
    WHEN score >= 60  THEN 'Caution'
    WHEN score >= 30  THEN 'Warning'
    ELSE 'Restricted'
  END;
$$;
