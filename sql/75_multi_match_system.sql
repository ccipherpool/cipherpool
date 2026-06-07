-- ═══════════════════════════════════════════════════════════════════════
-- CipherPool — Multi-Match System (BO3/BO5 support + anti-cheat)
-- Adds: tournament_matches, match_id linkage, image_hash, deadline,
--       leaderboard, end_match RPC, enhanced submit_match_result
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. tournament_matches — one row per match played within a tournament
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tournament_matches (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   uuid        NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  match_number    int         NOT NULL DEFAULT 1,
  started_at      timestamptz NOT NULL DEFAULT now(),
  ended_at        timestamptz,
  deadline        timestamptz,   -- screenshot submission deadline
  deadline_minutes int         NOT NULL DEFAULT 15,
  status          text        NOT NULL DEFAULT 'live'
                              CHECK (status IN ('live','processing','completed','cancelled')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, match_number)
);

CREATE INDEX IF NOT EXISTS tm_tournament_idx ON public.tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS tm_status_idx     ON public.tournament_matches(status);

ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_read_all"    ON public.tournament_matches;
DROP POLICY IF EXISTS "tm_admin_write" ON public.tournament_matches;
CREATE POLICY "tm_read_all"    ON public.tournament_matches FOR SELECT USING (true);
CREATE POLICY "tm_admin_write" ON public.tournament_matches FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
          AND role IN ('admin','super_admin','founder'))
  OR EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id AND t.created_by = auth.uid()
  )
);
GRANT SELECT ON public.tournament_matches TO anon, authenticated;
GRANT INSERT, UPDATE ON public.tournament_matches TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Enhance match_results — link to a specific match + image hash
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.match_results
  ADD COLUMN IF NOT EXISTS match_id    uuid REFERENCES public.tournament_matches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS image_hash  text,
  ADD COLUMN IF NOT EXISTS submitted_ip text;  -- for future fraud detection

CREATE INDEX IF NOT EXISTS mr_match_id_idx    ON public.match_results(match_id);
CREATE INDEX IF NOT EXISTS mr_image_hash_idx  ON public.match_results(image_hash);

-- ─────────────────────────────────────────────────────────────────────
-- 3. tournament_leaderboard — cumulative points across all matches
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tournament_leaderboard (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   uuid        NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_points    int         NOT NULL DEFAULT 0,
  total_kills     int         NOT NULL DEFAULT 0,
  matches_played  int         NOT NULL DEFAULT 0,
  best_placement  int,
  rank_position   int,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, player_id)
);

CREATE INDEX IF NOT EXISTS lb_tournament_idx ON public.tournament_leaderboard(tournament_id);
CREATE INDEX IF NOT EXISTS lb_points_idx     ON public.tournament_leaderboard(tournament_id, total_points DESC);

ALTER TABLE public.tournament_leaderboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lb_read_all" ON public.tournament_leaderboard FOR SELECT USING (true);
GRANT SELECT ON public.tournament_leaderboard TO anon, authenticated;
GRANT INSERT, UPDATE ON public.tournament_leaderboard TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 4. RPC: end_match — organizer ends the current match
--    Creates a tournament_matches record, sets deadline, updates status
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.end_match(uuid, int);
CREATE OR REPLACE FUNCTION public.end_match(
  p_tournament_id   uuid,
  p_deadline_minutes int DEFAULT 15
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_id    uuid := auth.uid();
  v_tournament   record;
  v_match_number int;
  v_match_id     uuid;
  v_deadline     timestamptz;
BEGIN
  SELECT * INTO v_tournament FROM public.tournaments WHERE id = p_tournament_id;
  IF v_tournament IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  -- Auth: organizer or admin
  IF v_tournament.created_by != v_caller_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = v_caller_id AND role IN ('admin','super_admin','founder')
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
    END IF;
  END IF;

  -- Status must be live/in_progress
  IF v_tournament.status NOT IN ('live','in_progress') THEN
    RETURN jsonb_build_object('success', false, 'error',
      format('Cannot end match — tournament is "%s", not live', v_tournament.status));
  END IF;

  -- Next match number
  SELECT COALESCE(MAX(match_number), 0) + 1 INTO v_match_number
  FROM public.tournament_matches WHERE tournament_id = p_tournament_id;

  v_deadline := now() + (p_deadline_minutes * interval '1 minute');

  -- Create match record
  INSERT INTO public.tournament_matches
    (tournament_id, match_number, started_at, ended_at, deadline, deadline_minutes, status)
  VALUES
    (p_tournament_id, v_match_number,
     COALESCE(v_tournament.match_start_time::timestamptz, now() - interval '30 minutes'),
     now(), v_deadline, p_deadline_minutes, 'processing')
  RETURNING id INTO v_match_id;

  -- Transition tournament status → results_pending
  UPDATE public.tournaments
  SET status        = 'results',
      room_status   = 'results_open',
      match_end_time = now(),
      updated_at    = now()
  WHERE id = p_tournament_id;

  -- Notify all room members
  INSERT INTO public.notifications (user_id, type, title, message, data)
  SELECT rm.user_id, 'announcement',
    format('🏁 Match %s Ended — Upload Screenshot!', v_match_number),
    format('You have %s minutes to submit your result screenshot.', p_deadline_minutes),
    jsonb_build_object(
      'tournament_id', p_tournament_id,
      'match_id', v_match_id,
      'match_number', v_match_number,
      'deadline', v_deadline,
      'action_url', format('/tournaments/%s/room', p_tournament_id)
    )
  FROM public.room_members rm WHERE rm.tournament_id = p_tournament_id;

  RETURN jsonb_build_object(
    'success',          true,
    'match_id',         v_match_id,
    'match_number',     v_match_number,
    'deadline',         v_deadline,
    'deadline_minutes', p_deadline_minutes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.end_match(uuid, int) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 5. Enhanced submit_match_result — adds match_id, deadline, image hash
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_match_result(
  p_tournament_id  uuid,
  p_rank           integer,
  p_kills          integer,
  p_screenshot_url text,
  p_match_id       uuid    DEFAULT NULL,
  p_image_hash     text    DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id         uuid := auth.uid();
  v_tournament      record;
  v_match           record;
  v_is_participant  boolean := false;
  v_existing        record;
  v_max_placement   integer;
  v_points          integer;
  v_coins           integer;
  v_submission_cnt  integer;
  v_expected_cnt    integer;
BEGIN
  -- 1. Get tournament
  SELECT * INTO v_tournament FROM public.tournaments WHERE id = p_tournament_id;
  IF v_tournament IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  -- 2. Check tournament accepts results
  IF v_tournament.room_status NOT IN ('results_open', 'results_closed', 'finished')
     AND v_tournament.status NOT IN ('results','finished','results_open','completed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Results phase not open yet');
  END IF;

  -- 3. Check deadline (if match_id provided)
  IF p_match_id IS NOT NULL THEN
    SELECT * INTO v_match FROM public.tournament_matches WHERE id = p_match_id;
    IF v_match IS NOT NULL AND v_match.deadline IS NOT NULL AND now() > v_match.deadline THEN
      RETURN jsonb_build_object('success', false, 'error',
        format('Submission deadline passed (%s minutes window)', v_match.deadline_minutes));
    END IF;
  ELSE
    -- Find the most recent processing match for this tournament
    SELECT * INTO v_match
    FROM public.tournament_matches
    WHERE tournament_id = p_tournament_id AND status = 'processing'
    ORDER BY match_number DESC LIMIT 1;

    IF v_match IS NOT NULL AND v_match.deadline IS NOT NULL AND now() > v_match.deadline THEN
      RETURN jsonb_build_object('success', false, 'error', 'Submission deadline has passed');
    END IF;
  END IF;

  -- 4. Check participant
  SELECT EXISTS (
    SELECT 1 FROM public.room_members WHERE tournament_id = p_tournament_id AND user_id = v_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.tournament_players WHERE tournament_id = p_tournament_id AND user_id = v_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.tournament_participants WHERE tournament_id = p_tournament_id AND user_id = v_user_id
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not a participant in this tournament');
  END IF;

  -- 5. Check already submitted (per match if match_id known, else per tournament)
  IF v_match IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.match_results
    WHERE tournament_id = p_tournament_id AND user_id = v_user_id AND match_id = v_match.id;
  ELSE
    SELECT * INTO v_existing FROM public.match_results
    WHERE tournament_id = p_tournament_id AND user_id = v_user_id;
  END IF;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false, 'error', 'You already submitted your result',
      'already_submitted', true, 'status', v_existing.status
    );
  END IF;

  -- 6. Anti-cheat: duplicate image hash
  IF p_image_hash IS NOT NULL AND p_image_hash != '' THEN
    IF EXISTS (
      SELECT 1 FROM public.match_results
      WHERE tournament_id = p_tournament_id
        AND image_hash = p_image_hash
        AND (v_match IS NULL OR match_id = v_match.id)
    ) THEN
      RETURN jsonb_build_object('success', false, 'error',
        'This screenshot was already submitted by another player. Each player must upload their own screenshot.');
    END IF;
  END IF;

  -- 7. Validate inputs
  v_max_placement := COALESCE(v_tournament.max_players, 12);
  IF p_rank IS NULL OR p_rank < 1 OR p_rank > v_max_placement THEN
    RETURN jsonb_build_object('success', false, 'error',
      format('Invalid rank — must be 1 to %s', v_max_placement));
  END IF;
  IF p_kills IS NULL OR p_kills < 0 OR p_kills > 99 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid kills count (0–99)');
  END IF;
  IF p_screenshot_url IS NULL OR p_screenshot_url = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Screenshot is required');
  END IF;

  -- 8. Calculate points
  v_points := CASE p_rank
    WHEN 1  THEN 12 WHEN 2  THEN 9  WHEN 3  THEN 8  WHEN 4  THEN 7
    WHEN 5  THEN 6  WHEN 6  THEN 5  WHEN 7  THEN 4  WHEN 8  THEN 3
    WHEN 9  THEN 2  WHEN 10 THEN 1  ELSE 0
  END + p_kills;
  v_coins := v_points * 10;

  -- 9. Insert
  INSERT INTO public.match_results (
    tournament_id, user_id, placement, kills, points, estimated_coins,
    screenshot_url, image_hash, match_id, status, submitted_at
  ) VALUES (
    p_tournament_id, v_user_id, p_rank, p_kills, v_points, v_coins,
    p_screenshot_url, NULLIF(p_image_hash,''), v_match.id, 'pending', NOW()
  );

  -- 10. Count submissions for this match
  IF v_match IS NOT NULL THEN
    SELECT COUNT(*) INTO v_submission_cnt
    FROM public.match_results WHERE tournament_id = p_tournament_id AND match_id = v_match.id;
  ELSE
    SELECT COUNT(*) INTO v_submission_cnt
    FROM public.match_results WHERE tournament_id = p_tournament_id;
  END IF;

  -- 11. Count expected
  SELECT COUNT(*) INTO v_expected_cnt FROM public.room_members WHERE tournament_id = p_tournament_id;
  IF v_expected_cnt = 0 THEN
    SELECT COUNT(*) INTO v_expected_cnt FROM public.tournament_participants WHERE tournament_id = p_tournament_id;
  END IF;
  IF v_expected_cnt = 0 THEN v_expected_cnt := COALESCE(v_tournament.max_players, 12); END IF;

  -- 12. Upsert match_verifications
  INSERT INTO public.match_verifications (tournament_id, total_players, submitted_count, status)
  VALUES (p_tournament_id, v_expected_cnt, v_submission_cnt, 'pending')
  ON CONFLICT (tournament_id) DO UPDATE
    SET submitted_count = v_submission_cnt,
        total_players   = EXCLUDED.total_players,
        status = CASE WHEN v_submission_cnt >= v_expected_cnt THEN 'all_submitted' ELSE 'pending' END,
        updated_at = NOW();

  -- 13. Auto-verify when all submitted
  IF v_submission_cnt >= v_expected_cnt AND v_expected_cnt > 0 THEN
    PERFORM public.auto_verify_match(p_tournament_id);
  END IF;

  RETURN jsonb_build_object(
    'success',       true,
    'points',        v_points,
    'coins_estimate', v_coins,
    'submitted',     v_submission_cnt,
    'expected',      v_expected_cnt,
    'match_id',      v_match.id,
    'match_number',  v_match.match_number,
    'all_submitted', v_submission_cnt >= v_expected_cnt
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_match_result(uuid, integer, integer, text, uuid, text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 6. RPC: get_tournament_leaderboard — cumulative points across matches
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_tournament_leaderboard(uuid);
CREATE OR REPLACE FUNCTION public.get_tournament_leaderboard(p_tournament_id uuid)
RETURNS TABLE(
  player_id       uuid,
  username        text,
  avatar_url      text,
  free_fire_name  text,
  total_points    bigint,
  total_kills     bigint,
  matches_played  bigint,
  best_placement  int,
  rank_position   bigint
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    mr.user_id,
    p.username,
    p.avatar_url,
    p.free_fire_name,
    SUM(mr.points),
    SUM(mr.kills),
    COUNT(DISTINCT COALESCE(mr.match_id::text, mr.tournament_id::text)),
    MIN(mr.placement),
    ROW_NUMBER() OVER (ORDER BY SUM(mr.points) DESC, SUM(mr.kills) DESC, MIN(mr.placement) ASC)
  FROM public.match_results mr
  JOIN public.profiles p ON p.id = mr.user_id
  WHERE mr.tournament_id = p_tournament_id
    AND mr.status IN ('auto_verified','verified')
  GROUP BY mr.user_id, p.username, p.avatar_url, p.free_fire_name
  ORDER BY SUM(mr.points) DESC, SUM(mr.kills) DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_tournament_leaderboard(uuid) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 7. RPC: get_match_list — list all matches for a tournament
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_match_list(uuid);
CREATE OR REPLACE FUNCTION public.get_match_list(p_tournament_id uuid)
RETURNS TABLE(
  match_id      uuid,
  match_number  int,
  status        text,
  ended_at      timestamptz,
  deadline      timestamptz,
  submissions   bigint,
  started_at    timestamptz
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    tm.id,
    tm.match_number,
    tm.status,
    tm.ended_at,
    tm.deadline,
    COUNT(mr.id),
    tm.started_at
  FROM public.tournament_matches tm
  LEFT JOIN public.match_results mr ON mr.match_id = tm.id
  WHERE tm.tournament_id = p_tournament_id
  GROUP BY tm.id, tm.match_number, tm.status, tm.ended_at, tm.deadline, tm.started_at
  ORDER BY tm.match_number ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_match_list(uuid) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 8. Realtime — enable on tournament_matches + leaderboard
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_matches;    EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_leaderboard; EXCEPTION WHEN OTHERS THEN NULL; END;
END;
$$;
