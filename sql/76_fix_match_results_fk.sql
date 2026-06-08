-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/76 Fix match_results FK
--
-- Problem: match_results.match_id FK was pointing to matches(id)
-- (the old head-to-head bracket system). The BR multi-match system
-- creates rows in tournament_matches, not matches. INSERT into
-- match_results with a tournament_matches UUID fails the FK check.
--
-- Fix: drop the old constraint, add one pointing to tournament_matches.
-- ══════════════════════════════════════════════════════════════════════

-- 1. Drop the stale FK (safe — only removes the constraint, not the column)
ALTER TABLE public.match_results
  DROP CONSTRAINT IF EXISTS match_results_match_id_fkey;

-- 2. Re-add pointing to the correct table
ALTER TABLE public.match_results
  ADD CONSTRAINT match_results_match_id_fkey
  FOREIGN KEY (match_id)
  REFERENCES public.tournament_matches(id)
  ON DELETE SET NULL;

-- 3. Also update the points formula in submit_match_result to the correct
--    Free Fire BR scoring (user-defined) and fix the match lookup.
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
  v_user_id        uuid := auth.uid();
  v_tournament     record;
  v_match          record;
  v_is_participant boolean := false;
  v_existing       record;
  v_max_placement  integer;
  v_points         integer;
  v_coins          integer;
  v_submission_cnt integer;
  v_expected_cnt   integer;
BEGIN
  SELECT * INTO v_tournament FROM public.tournaments WHERE id = p_tournament_id;
  IF v_tournament IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  IF v_tournament.room_status NOT IN ('results_open','results_closed','finished')
     AND v_tournament.status NOT IN ('results','finished','results_open','completed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Results phase not open yet');
  END IF;

  -- Find the active match — prefer explicit id, fall back to most recent processing
  IF p_match_id IS NOT NULL THEN
    SELECT * INTO v_match FROM public.tournament_matches WHERE id = p_match_id;
  ELSE
    SELECT * INTO v_match
    FROM public.tournament_matches
    WHERE tournament_id = p_tournament_id
      AND (status = 'processing' OR ended_at IS NOT NULL)
    ORDER BY ended_at DESC NULLS LAST, created_at DESC
    LIMIT 1;
  END IF;

  -- Deadline check
  IF v_match IS NOT NULL AND v_match.deadline IS NOT NULL AND now() > v_match.deadline THEN
    RETURN jsonb_build_object('success', false, 'error',
      format('Submission deadline passed — %s minute window closed', v_match.deadline_minutes));
  END IF;

  -- Participant check
  SELECT (
    EXISTS (SELECT 1 FROM public.room_members         WHERE tournament_id = p_tournament_id AND user_id = v_user_id) OR
    EXISTS (SELECT 1 FROM public.tournament_players   WHERE tournament_id = p_tournament_id AND user_id = v_user_id) OR
    EXISTS (SELECT 1 FROM public.tournament_participants WHERE tournament_id = p_tournament_id AND user_id = v_user_id)
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not a participant in this tournament');
  END IF;

  -- Already submitted check
  IF v_match IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.match_results
    WHERE tournament_id = p_tournament_id AND user_id = v_user_id AND match_id = v_match.id;
  ELSE
    SELECT * INTO v_existing FROM public.match_results
    WHERE tournament_id = p_tournament_id AND user_id = v_user_id;
  END IF;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already submitted',
      'already_submitted', true, 'status', v_existing.status);
  END IF;

  -- Anti-cheat: duplicate image hash
  IF p_image_hash IS NOT NULL AND p_image_hash != '' THEN
    IF EXISTS (
      SELECT 1 FROM public.match_results
      WHERE tournament_id = p_tournament_id
        AND image_hash = p_image_hash
        AND (v_match IS NULL OR match_id = v_match.id)
    ) THEN
      RETURN jsonb_build_object('success', false, 'error',
        'This screenshot was already submitted by another player. Use your own screenshot.');
    END IF;
  END IF;

  -- Validate inputs
  v_max_placement := COALESCE(v_tournament.max_players, 48);
  IF p_rank IS NULL OR p_rank < 1 OR p_rank > v_max_placement THEN
    RETURN jsonb_build_object('success', false, 'error', format('Rank must be 1–%s', v_max_placement));
  END IF;
  IF p_kills IS NULL OR p_kills < 0 OR p_kills > 99 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kills must be 0–99');
  END IF;
  IF p_screenshot_url IS NULL OR p_screenshot_url = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Screenshot is required');
  END IF;

  -- Free Fire BR points formula (user-defined)
  v_points := CASE p_rank
    WHEN 1  THEN 15
    WHEN 2  THEN 12
    WHEN 3  THEN 10
    WHEN 4  THEN 8
    WHEN 5  THEN 7
    WHEN 6  THEN 6
    WHEN 7  THEN 5
    WHEN 8  THEN 4
    WHEN 9  THEN 3
    WHEN 10 THEN 2
    ELSE         1   -- ranks 11–48 get 1 placement point
  END + p_kills;
  v_coins := v_points * 10;

  INSERT INTO public.match_results (
    tournament_id, user_id, placement, kills, points, estimated_coins,
    screenshot_url, image_hash, match_id, status, submitted_at
  ) VALUES (
    p_tournament_id, v_user_id, p_rank, p_kills, v_points, v_coins,
    p_screenshot_url, NULLIF(p_image_hash,''), v_match.id, 'pending', NOW()
  );

  -- Count submissions
  IF v_match IS NOT NULL THEN
    SELECT COUNT(*) INTO v_submission_cnt FROM public.match_results
    WHERE tournament_id = p_tournament_id AND match_id = v_match.id;
  ELSE
    SELECT COUNT(*) INTO v_submission_cnt FROM public.match_results
    WHERE tournament_id = p_tournament_id;
  END IF;

  SELECT COUNT(*) INTO v_expected_cnt FROM public.room_members WHERE tournament_id = p_tournament_id;
  IF v_expected_cnt = 0 THEN
    SELECT COUNT(*) INTO v_expected_cnt FROM public.tournament_participants WHERE tournament_id = p_tournament_id;
  END IF;
  IF v_expected_cnt = 0 THEN v_expected_cnt := COALESCE(v_tournament.max_players, 12); END IF;

  INSERT INTO public.match_verifications (tournament_id, total_players, submitted_count, status)
  VALUES (p_tournament_id, v_expected_cnt, v_submission_cnt, 'pending')
  ON CONFLICT (tournament_id) DO UPDATE
    SET submitted_count = v_submission_cnt,
        total_players   = EXCLUDED.total_players,
        status = CASE WHEN v_submission_cnt >= v_expected_cnt THEN 'all_submitted' ELSE 'pending' END,
        updated_at = NOW();

  IF v_submission_cnt >= v_expected_cnt AND v_expected_cnt > 0 THEN
    PERFORM public.auto_verify_match(p_tournament_id);
  END IF;

  RETURN jsonb_build_object(
    'success',        true,
    'points',         v_points,
    'coins_estimate', v_coins,
    'submitted',      v_submission_cnt,
    'expected',       v_expected_cnt,
    'match_id',       v_match.id,
    'match_number',   v_match.match_number,
    'all_submitted',  v_submission_cnt >= v_expected_cnt
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_match_result(uuid, integer, integer, text, uuid, text) TO authenticated;
