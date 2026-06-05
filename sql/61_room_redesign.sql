-- ══════════════════════════════════════════════════════════════════════
-- sql/61 — Tournament Room Redesign: participant columns + slot assignment
-- ══════════════════════════════════════════════════════════════════════

-- ─── 1. Extend tournament_participants ───────────────────────────────
ALTER TABLE public.tournament_participants
  ADD COLUMN IF NOT EXISTS approved_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at  timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at  timestamptz,
  ADD COLUMN IF NOT EXISTS join_message text;

-- ─── 2. approve_tournament_participant ───────────────────────────────
-- Auto-assigns the first free slot in the team structure.
DROP FUNCTION IF EXISTS public.approve_tournament_participant(uuid, uuid);

CREATE FUNCTION public.approve_tournament_participant(
  p_tournament_id uuid,
  p_user_id       uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role  text;
  v_created_by   uuid;
  v_t            record;
  v_team_size    int;
  v_num_teams    int;
  v_team         int := NULL;
  v_seat         int := NULL;
  ti             int;
  si             int;
  v_occupied     boolean;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  SELECT created_by INTO v_created_by FROM tournaments WHERE id = p_tournament_id;

  IF v_created_by IS DISTINCT FROM auth.uid()
     AND v_caller_role NOT IN ('admin','super_admin','founder') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  SELECT * INTO v_t FROM tournaments WHERE id = p_tournament_id;

  -- Determine team structure
  IF v_t.game_type = 'cs' THEN
    v_num_teams := 2;
    v_team_size := CASE v_t.cs_format WHEN '1v1' THEN 1 WHEN '2v2' THEN 2 ELSE 4 END;
  ELSE
    v_team_size := CASE v_t.mode WHEN 'squad' THEN 4 WHEN 'duo' THEN 2 ELSE 1 END;
    v_num_teams := CEIL(v_t.max_players::float / v_team_size);
  END IF;

  -- Find first empty slot
  FOR ti IN 1..v_num_teams LOOP
    FOR si IN 1..v_team_size LOOP
      SELECT EXISTS(
        SELECT 1 FROM room_members
        WHERE tournament_id = p_tournament_id
          AND team_number   = ti
          AND seat_number   = si
      ) INTO v_occupied;

      IF NOT v_occupied THEN
        v_team := ti; v_seat := si;
        EXIT;
      END IF;
    END LOOP;
    IF v_team IS NOT NULL THEN EXIT; END IF;
  END LOOP;

  -- Approve participant
  UPDATE tournament_participants
  SET status      = 'approved',
      approved_by = auth.uid(),
      approved_at = now()
  WHERE tournament_id = p_tournament_id
    AND user_id       = p_user_id;

  -- Insert into room_members with assigned slot
  INSERT INTO room_members (tournament_id, user_id, team_number, seat_number, is_ready)
  VALUES (
    p_tournament_id, p_user_id,
    COALESCE(v_team, 1), COALESCE(v_seat, 1),
    false
  )
  ON CONFLICT (tournament_id, user_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success',     true,
    'team_number', COALESCE(v_team, 1),
    'seat_number', COALESCE(v_seat, 1)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_tournament_participant(uuid, uuid) TO authenticated;

-- ─── 3. reject_tournament_participant ────────────────────────────────
DROP FUNCTION IF EXISTS public.reject_tournament_participant(uuid, uuid);

CREATE FUNCTION public.reject_tournament_participant(
  p_tournament_id uuid,
  p_user_id       uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_created_by  uuid;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  SELECT created_by INTO v_created_by FROM tournaments WHERE id = p_tournament_id;

  IF v_created_by IS DISTINCT FROM auth.uid()
     AND v_caller_role NOT IN ('admin','super_admin','founder') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  UPDATE tournament_participants
  SET status      = 'rejected',
      rejected_by = auth.uid(),
      rejected_at = now()
  WHERE tournament_id = p_tournament_id
    AND user_id       = p_user_id;

  -- Remove from room if somehow present
  DELETE FROM room_members
  WHERE tournament_id = p_tournament_id AND user_id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_tournament_participant(uuid, uuid) TO authenticated;

-- ─── 4. RLS: organizer can read all participants for their tournament ─
-- (only add if RLS is enabled on tournament_participants)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'tournament_participants'
  ) THEN
    -- Ensure the table has RLS enabled
    ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

    -- Drop & recreate organizer-read policy (idempotent)
    DROP POLICY IF EXISTS "organizer_can_read_participants" ON public.tournament_participants;
    CREATE POLICY "organizer_can_read_participants"
      ON public.tournament_participants FOR SELECT
      USING (
        -- Player can see their own row, organizer can see all for their tournament
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.tournaments t
          WHERE t.id = tournament_id AND t.created_by = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('admin','super_admin','founder')
        )
      );
  END IF;
END;
$$;

-- ─── Verify ─────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'sql/61 OK: approve_tournament_participant + reject_tournament_participant created.';
END;
$$;
