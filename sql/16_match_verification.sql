-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — Smart Result Verification System (SERVER AUTHORITATIVE)
-- All result decisions happen in the database, never in the browser.
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. ENHANCE player_stats TABLE
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.player_stats (
  user_id           uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  kills             integer NOT NULL DEFAULT 0,
  wins              integer NOT NULL DEFAULT 0,
  losses            integer NOT NULL DEFAULT 0,
  tournaments_played integer NOT NULL DEFAULT 0,
  top3_finishes     integer NOT NULL DEFAULT 0,
  total_earnings    integer NOT NULL DEFAULT 0,
  total_points      integer NOT NULL DEFAULT 0,
  best_position     integer,
  kd_ratio          numeric(6,2) NOT NULL DEFAULT 0,
  mvp_count         integer NOT NULL DEFAULT 0,
  win_streak        integer NOT NULL DEFAULT 0,
  best_win_streak   integer NOT NULL DEFAULT 0,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Add columns if table already exists
ALTER TABLE public.player_stats
  ADD COLUMN IF NOT EXISTS mvp_count       integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS win_streak      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_win_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at      timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ps_read_all" ON public.player_stats;
DROP POLICY IF EXISTS "ps_admin"    ON public.player_stats;
CREATE POLICY "ps_read_all" ON public.player_stats FOR SELECT USING (true);
CREATE POLICY "ps_admin"    ON public.player_stats FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
);
GRANT SELECT ON TABLE public.player_stats TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 2. ENHANCE match_results TABLE
--    Add verification_status, dispute fields, auto_verified columns
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.match_results
  ADD COLUMN IF NOT EXISTS verified_at     timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_reason  text,
  ADD COLUMN IF NOT EXISTS is_mvp          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS coins_awarded   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_verified   boolean NOT NULL DEFAULT false;

-- Ensure status column allows new values (drop + recreate CHECK if needed)
-- Keep existing: pending, verified, rejected
-- Add: auto_verified, disputed
-- We do it via a function-level check in RPCs (no ALTER CONSTRAINT needed if no CHECK exists)

-- ─────────────────────────────────────────────────────────────────────
-- 3. MATCH VERIFICATION LOG (per-tournament verification event record)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.match_verifications (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   uuid        NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','all_submitted','verifying','auto_verified','disputed','resolved')),
  total_players   integer     NOT NULL DEFAULT 0,
  submitted_count integer     NOT NULL DEFAULT 0,
  mvp_user_id     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  dispute_reason  text,
  resolved_by     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id)
);

CREATE INDEX IF NOT EXISTS mv_tournament_idx ON public.match_verifications(tournament_id);
CREATE INDEX IF NOT EXISTS mv_status_idx     ON public.match_verifications(status);

ALTER TABLE public.match_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mv_read_all"   ON public.match_verifications FOR SELECT USING (true);
CREATE POLICY "mv_admin_write" ON public.match_verifications FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
);
GRANT SELECT ON TABLE public.match_verifications TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 4. RPC: submit_match_result — SERVER AUTHORITATIVE submission
--    Frontend uploads screenshot → gets URL → calls this RPC
--    RPC validates, inserts, triggers auto-verify
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_match_result(
  p_tournament_id  uuid,
  p_rank           integer,
  p_kills          integer,
  p_screenshot_url text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id         uuid := auth.uid();
  v_tournament      record;
  v_is_participant  boolean := false;
  v_existing        record;
  v_max_placement   integer;
  v_points          integer;
  v_coins           integer;
  v_submission_cnt  integer;
  v_expected_cnt    integer;
  v_mv              record;
BEGIN
  -- 1. Get tournament
  SELECT * INTO v_tournament FROM public.tournaments WHERE id = p_tournament_id;
  IF v_tournament IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  -- 2. Check tournament accepts results
  IF v_tournament.room_status NOT IN ('results_open', 'results_closed', 'finished')
     AND v_tournament.status NOT IN ('finished', 'results_open', 'completed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Results phase not open yet');
  END IF;

  -- 3. Check user is a participant (room_members OR tournament_players)
  SELECT EXISTS (
    SELECT 1 FROM public.room_members WHERE tournament_id = p_tournament_id AND user_id = v_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.tournament_players WHERE tournament_id = p_tournament_id AND user_id = v_user_id
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not a participant in this tournament');
  END IF;

  -- 4. Check not already submitted
  SELECT * INTO v_existing FROM public.match_results
  WHERE tournament_id = p_tournament_id AND user_id = v_user_id;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You already submitted your result',
      'already_submitted', true,
      'status', v_existing.status
    );
  END IF;

  -- 5. Validate inputs
  v_max_placement := COALESCE(v_tournament.max_players, 12);
  IF p_rank IS NULL OR p_rank < 1 OR p_rank > v_max_placement THEN
    RETURN jsonb_build_object('success', false, 'error', format('Invalid rank — must be 1 to %s', v_max_placement));
  END IF;
  IF p_kills IS NULL OR p_kills < 0 OR p_kills > 99 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid kills count (0–99)');
  END IF;
  IF p_screenshot_url IS NULL OR p_screenshot_url = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Screenshot is required');
  END IF;

  -- 6. Calculate points (Battle Royale scoring + kills bonus)
  v_points := CASE p_rank
    WHEN 1  THEN 12 WHEN 2  THEN 9  WHEN 3  THEN 8  WHEN 4  THEN 7
    WHEN 5  THEN 6  WHEN 6  THEN 5  WHEN 7  THEN 4  WHEN 8  THEN 3
    WHEN 9  THEN 2  WHEN 10 THEN 1  ELSE 0
  END + p_kills;
  v_coins := v_points * 10;

  -- 7. Insert match result
  INSERT INTO public.match_results (
    tournament_id, user_id, placement, kills, points, estimated_coins,
    screenshot_url, status, submitted_at
  ) VALUES (
    p_tournament_id, v_user_id, p_rank, p_kills, v_points, v_coins,
    p_screenshot_url, 'pending', NOW()
  );

  -- 8. Count expected vs submitted
  SELECT COUNT(*) INTO v_submission_cnt
  FROM public.match_results WHERE tournament_id = p_tournament_id;

  SELECT COUNT(*) INTO v_expected_cnt
  FROM public.room_members WHERE tournament_id = p_tournament_id;
  IF v_expected_cnt = 0 THEN
    SELECT COUNT(*) INTO v_expected_cnt
    FROM public.tournament_players WHERE tournament_id = p_tournament_id;
  END IF;
  IF v_expected_cnt = 0 THEN
    v_expected_cnt := COALESCE(v_tournament.max_players, 12);
  END IF;

  -- 9. Upsert match_verifications record
  INSERT INTO public.match_verifications (tournament_id, total_players, submitted_count, status)
  VALUES (p_tournament_id, v_expected_cnt, v_submission_cnt, 'pending')
  ON CONFLICT (tournament_id) DO UPDATE
    SET submitted_count = v_submission_cnt,
        total_players   = EXCLUDED.total_players,
        status          = CASE WHEN v_submission_cnt >= v_expected_cnt THEN 'all_submitted' ELSE 'pending' END,
        updated_at      = NOW();

  -- 10. If all submitted → trigger auto-verify
  IF v_submission_cnt >= v_expected_cnt AND v_expected_cnt > 0 THEN
    PERFORM public.auto_verify_match(p_tournament_id);
  END IF;

  RETURN jsonb_build_object(
    'success',        true,
    'points',         v_points,
    'coins_estimate', v_coins,
    'submitted',      v_submission_cnt,
    'expected',       v_expected_cnt,
    'all_submitted',  v_submission_cnt >= v_expected_cnt
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 5. RPC: auto_verify_match — compares all submissions, decides outcome
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_verify_match(p_tournament_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_has_duplicate_ranks boolean;
  v_mvp_user_id         uuid;
  v_tournament          record;
  v_submission_cnt      integer;
BEGIN
  SELECT * INTO v_tournament FROM public.tournaments WHERE id = p_tournament_id;
  SELECT COUNT(*) INTO v_submission_cnt FROM public.match_results WHERE tournament_id = p_tournament_id AND status = 'pending';

  -- Check for duplicate rank claims
  SELECT EXISTS (
    SELECT placement
    FROM public.match_results
    WHERE tournament_id = p_tournament_id AND status = 'pending'
    GROUP BY placement
    HAVING COUNT(*) > 1
  ) INTO v_has_duplicate_ranks;

  -- Update verification log
  UPDATE public.match_verifications
  SET status = 'verifying', updated_at = NOW()
  WHERE tournament_id = p_tournament_id;

  IF v_has_duplicate_ranks THEN
    -- ── DISPUTED ──────────────────────────────────────────────
    UPDATE public.match_results
    SET status = 'disputed'
    WHERE tournament_id = p_tournament_id AND status = 'pending';

    UPDATE public.tournaments
    SET status = 'disputed', updated_at = NOW()
    WHERE id = p_tournament_id;

    UPDATE public.match_verifications
    SET status = 'disputed',
        dispute_reason = 'Multiple players claimed the same rank',
        updated_at = NOW()
    WHERE tournament_id = p_tournament_id;

    -- Notify all admins
    INSERT INTO public.notifications (user_id, type, title, message, data)
    SELECT p.id, 'system',
      '⚠️ Match Under Review',
      format('Tournament "%s" has conflicting rank submissions. Manual review required.', v_tournament.name),
      jsonb_build_object('tournament_id', p_tournament_id, 'type', 'dispute')
    FROM public.profiles p
    WHERE p.role IN ('admin', 'super_admin');

    RETURN jsonb_build_object('status', 'disputed', 'reason', 'Duplicate rank claims');

  ELSE
    -- ── AUTO VERIFIED ─────────────────────────────────────────
    -- Find MVP: player with most kills (ties go to lower rank/lower user_id)
    SELECT user_id INTO v_mvp_user_id
    FROM public.match_results
    WHERE tournament_id = p_tournament_id AND status = 'pending'
    ORDER BY kills DESC, placement ASC
    LIMIT 1;

    -- Mark all submissions as auto_verified
    UPDATE public.match_results
    SET status        = 'auto_verified',
        auto_verified = true,
        verified_at   = NOW(),
        is_mvp        = (user_id = v_mvp_user_id)
    WHERE tournament_id = p_tournament_id AND status = 'pending';

    -- Mark tournament as completed
    UPDATE public.tournaments
    SET status     = 'completed',
        updated_at = NOW()
    WHERE id = p_tournament_id;

    -- Update verification log
    UPDATE public.match_verifications
    SET status      = 'auto_verified',
        mvp_user_id = v_mvp_user_id,
        updated_at  = NOW()
    WHERE tournament_id = p_tournament_id;

    -- Distribute rewards
    PERFORM public.distribute_match_rewards(p_tournament_id, v_mvp_user_id);

    RETURN jsonb_build_object('status', 'auto_verified', 'mvp_user_id', v_mvp_user_id);
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 6. RPC: distribute_match_rewards — give coins + update stats
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.distribute_match_rewards(
  p_tournament_id uuid,
  p_mvp_user_id   uuid DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r           record;
  v_tournament record;
  v_prize_pool integer;
  v_coins      integer;
  v_is_win     boolean;
  v_is_top3    boolean;
  v_stats      record;
  v_new_streak integer;
BEGIN
  SELECT * INTO v_tournament FROM public.tournaments WHERE id = p_tournament_id;
  v_prize_pool := COALESCE(v_tournament.prize_pool, 0);

  FOR r IN
    SELECT * FROM public.match_results
    WHERE tournament_id = p_tournament_id AND status = 'auto_verified'
  LOOP
    v_is_win  := r.placement = 1;
    v_is_top3 := r.placement <= 3;

    -- Base coins from points
    v_coins := COALESCE(r.estimated_coins, r.points * 10);

    -- Add prize pool share
    IF v_prize_pool > 0 THEN
      v_coins := v_coins + CASE r.placement
        WHEN 1 THEN (v_prize_pool * 50 / 100)
        WHEN 2 THEN (v_prize_pool * 30 / 100)
        WHEN 3 THEN (v_prize_pool * 20 / 100)
        ELSE 0
      END;
    END IF;

    -- MVP bonus
    IF r.user_id = p_mvp_user_id THEN
      v_coins := v_coins + 50;
    END IF;

    -- Update match_results with actual coins
    UPDATE public.match_results SET coins_awarded = v_coins WHERE id = r.id;

    -- Give coins via server-side RPC
    PERFORM public.admin_adjust_coins(
      r.user_id, v_coins,
      format('Match reward: %s — Rank #%s · %s kills%s',
        v_tournament.name, r.placement, r.kills,
        CASE WHEN r.user_id = p_mvp_user_id THEN ' · 🔥 MVP +50' ELSE '' END
      )
    );

    -- Update player_stats
    SELECT * INTO v_stats FROM public.player_stats WHERE user_id = r.user_id;

    IF v_stats IS NULL THEN
      INSERT INTO public.player_stats (
        user_id, kills, wins, losses, tournaments_played, top3_finishes,
        total_earnings, total_points, best_position, kd_ratio, mvp_count,
        win_streak, best_win_streak, updated_at
      ) VALUES (
        r.user_id,
        r.kills,
        CASE WHEN v_is_win THEN 1 ELSE 0 END,
        CASE WHEN v_is_win THEN 0 ELSE 1 END,
        1,
        CASE WHEN v_is_top3 THEN 1 ELSE 0 END,
        v_coins,
        r.points,
        r.placement,
        r.kills::numeric,
        CASE WHEN r.user_id = p_mvp_user_id THEN 1 ELSE 0 END,
        CASE WHEN v_is_win THEN 1 ELSE 0 END,
        CASE WHEN v_is_win THEN 1 ELSE 0 END,
        NOW()
      );
    ELSE
      v_new_streak := CASE WHEN v_is_win THEN v_stats.win_streak + 1 ELSE 0 END;
      UPDATE public.player_stats SET
        kills              = kills + r.kills,
        wins               = wins + CASE WHEN v_is_win THEN 1 ELSE 0 END,
        losses             = losses + CASE WHEN v_is_win THEN 0 ELSE 1 END,
        tournaments_played = tournaments_played + 1,
        top3_finishes      = top3_finishes + CASE WHEN v_is_top3 THEN 1 ELSE 0 END,
        total_earnings     = total_earnings + v_coins,
        total_points       = total_points + r.points,
        best_position      = LEAST(COALESCE(best_position, 9999), r.placement),
        kd_ratio           = ROUND(((kills + r.kills)::numeric / (tournaments_played + 1)), 2),
        mvp_count          = mvp_count + CASE WHEN r.user_id = p_mvp_user_id THEN 1 ELSE 0 END,
        win_streak         = v_new_streak,
        best_win_streak    = GREATEST(best_win_streak, v_new_streak),
        updated_at         = NOW()
      WHERE user_id = r.user_id;
    END IF;

    -- Notify player
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      r.user_id,
      CASE
        WHEN v_is_win THEN 'achievement'
        WHEN r.user_id = p_mvp_user_id THEN 'achievement'
        ELSE 'system'
      END,
      CASE
        WHEN v_is_win AND r.user_id = p_mvp_user_id THEN '🏆🔥 Victory & MVP!'
        WHEN v_is_win                                THEN '🏆 Tournament Victory!'
        WHEN r.user_id = p_mvp_user_id              THEN '🔥 You are the MVP!'
        WHEN v_is_top3                               THEN '🥉 Top 3 Finish!'
        ELSE '✅ Match Results Verified'
      END,
      format('Rank #%s · %s kills · +%s CP%s',
        r.placement, r.kills, v_coins,
        CASE WHEN r.user_id = p_mvp_user_id THEN ' (MVP)' ELSE '' END
      ),
      jsonb_build_object(
        'tournament_id', p_tournament_id,
        'tournament_name', v_tournament.name,
        'placement', r.placement,
        'kills', r.kills,
        'coins', v_coins,
        'is_mvp', r.user_id = p_mvp_user_id,
        'is_win', v_is_win
      )
    );

    -- Fair-play bonus for clean match completion
    PERFORM public.apply_fair_play_event(r.user_id, 'fair_match', 2, 'Clean match completion');

    -- Tournament win fair-play bonus
    IF v_is_win THEN
      PERFORM public.apply_fair_play_event(r.user_id, 'tournament_won', 10, 'Tournament victory');
    END IF;

  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 7. RPC: admin_verify_result — admin manually approves/rejects a result
--    SERVER AUTHORITATIVE — replaces browser-side logic in Adminresults.jsx
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_verify_result(
  p_result_id uuid,
  p_action    text  -- 'approve' or 'reject'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_role text;
  v_result      record;
  v_is_win      boolean;
  v_is_top3     boolean;
  v_coins       integer;
  v_tournament  record;
  v_stats       record;
  v_new_streak  integer;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin', 'super_admin', 'fondateur', 'founder') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;

  IF p_action NOT IN ('approve', 'reject') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Action must be approve or reject');
  END IF;

  SELECT mr.*, t.name AS tournament_name, t.prize_pool
  INTO v_result
  FROM public.match_results mr
  JOIN public.tournaments t ON t.id = mr.tournament_id
  WHERE mr.id = p_result_id;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Result not found');
  END IF;

  IF v_result.status NOT IN ('pending', 'disputed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Result already processed');
  END IF;

  -- Update result status
  UPDATE public.match_results
  SET status      = CASE WHEN p_action = 'approve' THEN 'verified' ELSE 'rejected' END,
      verified_at = NOW()
  WHERE id = p_result_id;

  IF p_action = 'approve' THEN
    v_is_win  := v_result.placement = 1;
    v_is_top3 := v_result.placement <= 3;
    v_coins   := COALESCE(v_result.estimated_coins, v_result.points * 10);

    -- Add prize pool share
    IF COALESCE(v_result.prize_pool, 0) > 0 THEN
      v_coins := v_coins + CASE v_result.placement
        WHEN 1 THEN (v_result.prize_pool * 50 / 100)
        WHEN 2 THEN (v_result.prize_pool * 30 / 100)
        WHEN 3 THEN (v_result.prize_pool * 20 / 100)
        ELSE 0
      END;
    END IF;

    -- Update coins_awarded
    UPDATE public.match_results SET coins_awarded = v_coins WHERE id = p_result_id;

    -- Give coins
    PERFORM public.admin_adjust_coins(
      v_result.user_id, v_coins,
      format('Admin verified: %s — Rank #%s · %s kills', v_result.tournament_name, v_result.placement, v_result.kills)
    );

    -- Update player_stats
    SELECT * INTO v_stats FROM public.player_stats WHERE user_id = v_result.user_id;
    IF v_stats IS NULL THEN
      INSERT INTO public.player_stats (
        user_id, kills, wins, losses, tournaments_played, top3_finishes,
        total_earnings, total_points, best_position, kd_ratio, win_streak, best_win_streak
      ) VALUES (
        v_result.user_id, v_result.kills,
        CASE WHEN v_is_win THEN 1 ELSE 0 END,
        CASE WHEN v_is_win THEN 0 ELSE 1 END,
        1, CASE WHEN v_is_top3 THEN 1 ELSE 0 END,
        v_coins, v_result.points, v_result.placement,
        v_result.kills::numeric,
        CASE WHEN v_is_win THEN 1 ELSE 0 END,
        CASE WHEN v_is_win THEN 1 ELSE 0 END
      );
    ELSE
      v_new_streak := CASE WHEN v_is_win THEN v_stats.win_streak + 1 ELSE 0 END;
      UPDATE public.player_stats SET
        kills              = kills + v_result.kills,
        wins               = wins + CASE WHEN v_is_win THEN 1 ELSE 0 END,
        losses             = losses + CASE WHEN v_is_win THEN 0 ELSE 1 END,
        tournaments_played = tournaments_played + 1,
        top3_finishes      = top3_finishes + CASE WHEN v_is_top3 THEN 1 ELSE 0 END,
        total_earnings     = total_earnings + v_coins,
        total_points       = total_points + v_result.points,
        best_position      = LEAST(COALESCE(best_position, 9999), v_result.placement),
        kd_ratio           = ROUND(((kills + v_result.kills)::numeric / (tournaments_played + 1)), 2),
        win_streak         = v_new_streak,
        best_win_streak    = GREATEST(best_win_streak, v_new_streak),
        updated_at         = NOW()
      WHERE user_id = v_result.user_id;
    END IF;

    -- Notify player: approved
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_result.user_id, 'coins_received',
      format('%s Result Approved!', CASE WHEN v_is_win THEN '🏆' WHEN v_is_top3 THEN '🥉' ELSE '✅' END),
      format('Rank #%s · %s kills · +%s CP awarded', v_result.placement, v_result.kills, v_coins),
      jsonb_build_object(
        'tournament_id', v_result.tournament_id,
        'tournament_name', v_result.tournament_name,
        'placement', v_result.placement,
        'coins', v_coins
      )
    );

    -- Admin log
    INSERT INTO public.admin_logs (user_id, action, details)
    VALUES (auth.uid(), 'verify_result', jsonb_build_object('result_id', p_result_id, 'action', 'approve', 'coins', v_coins));

    RETURN jsonb_build_object('success', true, 'coins', v_coins, 'action', 'approved');

  ELSE
    -- Notify player: rejected
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_result.user_id, 'system',
      '❌ Result Rejected',
      format('Your submitted result for %s was rejected. Contact support if you believe this is an error.', v_result.tournament_name),
      jsonb_build_object('tournament_id', v_result.tournament_id)
    );

    -- Fair-play penalty
    PERFORM public.apply_fair_play_event(
      v_result.user_id, 'report_confirmed', -10, 'Result rejected by admin'
    );

    INSERT INTO public.admin_logs (user_id, action, details)
    VALUES (auth.uid(), 'verify_result', jsonb_build_object('result_id', p_result_id, 'action', 'reject'));

    RETURN jsonb_build_object('success', true, 'action', 'rejected');
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 8. RPC: get_tournament_submissions — admin view of all submissions
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_tournament_submissions(p_tournament_id uuid)
RETURNS TABLE (
  result_id        uuid,
  user_id          uuid,
  username         text,
  avatar_url       text,
  placement        integer,
  kills            integer,
  points           integer,
  coins_awarded    integer,
  status           text,
  is_mvp           boolean,
  screenshot_url   text,
  submitted_at     timestamptz,
  verified_at      timestamptz,
  fair_play_score  integer
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    mr.id,
    mr.user_id,
    p.username,
    p.avatar_url,
    mr.placement,
    mr.kills,
    mr.points,
    mr.coins_awarded,
    mr.status,
    mr.is_mvp,
    mr.screenshot_url,
    mr.submitted_at,
    mr.verified_at,
    p.fair_play_score
  FROM public.match_results mr
  JOIN public.profiles p ON p.id = mr.user_id
  WHERE mr.tournament_id = p_tournament_id
  ORDER BY mr.placement ASC NULLS LAST, mr.kills DESC;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 9. RPC: get_disputed_tournaments — admin: list all disputed matches
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_disputed_tournaments()
RETURNS TABLE (
  tournament_id    uuid,
  tournament_name  text,
  submissions      bigint,
  dispute_reason   text,
  created_at       timestamptz
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    t.id,
    t.name,
    COUNT(mr.id),
    mv.dispute_reason,
    mv.created_at
  FROM public.tournaments t
  JOIN public.match_verifications mv ON mv.tournament_id = t.id
  LEFT JOIN public.match_results mr ON mr.tournament_id = t.id
  WHERE mv.status = 'disputed' OR t.status = 'disputed'
  GROUP BY t.id, t.name, mv.dispute_reason, mv.created_at
  ORDER BY mv.created_at DESC;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 10. RPC: force_resolve_dispute — admin manually resolves a dispute
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.force_resolve_dispute(
  p_tournament_id uuid,
  p_result_ids    uuid[]  -- array of result IDs to approve (others get rejected)
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_role text;
  v_mvp_user_id uuid;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;

  -- Mark selected results as verified
  UPDATE public.match_results
  SET status = 'verified', auto_verified = false, verified_at = NOW()
  WHERE tournament_id = p_tournament_id AND id = ANY(p_result_ids);

  -- Mark others as rejected
  UPDATE public.match_results
  SET status = 'rejected', verified_at = NOW()
  WHERE tournament_id = p_tournament_id AND id != ALL(p_result_ids) AND status = 'disputed';

  -- Find MVP among approved
  SELECT user_id INTO v_mvp_user_id
  FROM public.match_results
  WHERE tournament_id = p_tournament_id AND status = 'verified'
  ORDER BY kills DESC, placement ASC LIMIT 1;

  -- Mark verified ones as auto_verified for reward distribution
  UPDATE public.match_results
  SET status = 'auto_verified', is_mvp = (user_id = v_mvp_user_id)
  WHERE tournament_id = p_tournament_id AND status = 'verified';

  -- Close tournament
  UPDATE public.tournaments SET status = 'completed', updated_at = NOW()
  WHERE id = p_tournament_id;

  -- Update verification log
  UPDATE public.match_verifications
  SET status = 'resolved', resolved_by = auth.uid(), resolved_at = NOW(), updated_at = NOW()
  WHERE tournament_id = p_tournament_id;

  -- Distribute rewards
  PERFORM public.distribute_match_rewards(p_tournament_id, v_mvp_user_id);

  INSERT INTO public.admin_logs (user_id, action, details)
  VALUES (auth.uid(), 'resolve_dispute', jsonb_build_object('tournament_id', p_tournament_id));

  RETURN jsonb_build_object('success', true, 'mvp_user_id', v_mvp_user_id);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 11. VIEW: match_results_enriched — pre-joined view for fast queries
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.match_results_enriched AS
SELECT
  mr.*,
  p.username,
  p.avatar_url,
  p.fair_play_score,
  p.is_verified,
  t.name AS tournament_name,
  t.game_type,
  t.mode,
  t.prize_pool,
  mv.status AS verification_status,
  mv.mvp_user_id
FROM public.match_results mr
JOIN public.profiles p ON p.id = mr.user_id
JOIN public.tournaments t ON t.id = mr.tournament_id
LEFT JOIN public.match_verifications mv ON mv.tournament_id = mr.tournament_id;

GRANT SELECT ON public.match_results_enriched TO authenticated;
