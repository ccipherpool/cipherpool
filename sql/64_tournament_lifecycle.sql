-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/64 Tournament Lifecycle
-- Adds:
--   • New tournament status values (registration_closed, ready_check,
--     lobby_created, in_progress, results, finished)
--   • roster_snapshots table (checkpoint on tournament start)
--   • take_roster_snapshot(tournament_id) RPC
--   • Tournaments status check constraint updated
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. roster_snapshots — immutable record of who was in at start time
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.roster_snapshots (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id  uuid        NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  snapshot_at    timestamptz NOT NULL DEFAULT now(),
  snapshot_type  text        NOT NULL DEFAULT 'start', -- 'start' | 'checkpoint'
  players        jsonb       NOT NULL DEFAULT '[]',    -- array of player records
  created_by     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS roster_snap_tournament_idx ON public.roster_snapshots(tournament_id);
CREATE INDEX IF NOT EXISTS roster_snap_at_idx         ON public.roster_snapshots(snapshot_at DESC);

ALTER TABLE public.roster_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizer_read_snapshots" ON public.roster_snapshots;
CREATE POLICY "organizer_read_snapshots" ON public.roster_snapshots
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id
        AND (
          t.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin','super_admin','founder')
          )
        )
    )
  );

DROP POLICY IF EXISTS "organizer_insert_snapshots" ON public.roster_snapshots;
CREATE POLICY "organizer_insert_snapshots" ON public.roster_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id
        AND (
          t.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin','super_admin','founder')
          )
        )
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- 2. take_roster_snapshot RPC
--    Called automatically when organizer starts the tournament.
--    Captures every room_member with their slot, team, and ready state.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.take_roster_snapshot(
  p_tournament_id uuid,
  p_snapshot_type text DEFAULT 'start'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_snapshot_id uuid;
  v_players     jsonb;
BEGIN
  -- Permission check
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF NOT EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE id = p_tournament_id
      AND (created_by = auth.uid() OR v_caller_role IN ('admin','super_admin','founder'))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Build player snapshot from room_members + profiles
  SELECT jsonb_agg(
    jsonb_build_object(
      'user_id',     rm.user_id,
      'username',    COALESCE(p.full_name, p.username, 'Player'),
      'free_fire_id', p.free_fire_id,
      'avatar_url',  p.avatar_url,
      'team_number', rm.team_number,
      'seat_number', rm.seat_number,
      'is_ready',    rm.is_ready,
      'joined_at',   rm.created_at
    )
    ORDER BY rm.team_number, rm.seat_number
  )
  INTO v_players
  FROM public.room_members rm
  LEFT JOIN public.profiles p ON p.id = rm.user_id
  WHERE rm.tournament_id = p_tournament_id;

  -- Insert snapshot
  INSERT INTO public.roster_snapshots (tournament_id, snapshot_type, players, created_by)
  VALUES (p_tournament_id, p_snapshot_type, COALESCE(v_players, '[]'), auth.uid())
  RETURNING id INTO v_snapshot_id;

  RETURN jsonb_build_object(
    'success',      true,
    'snapshot_id',  v_snapshot_id,
    'player_count', jsonb_array_length(COALESCE(v_players, '[]'))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.take_roster_snapshot(uuid, text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Update tournaments status column to allow new lifecycle values
--    Drop old check constraint (if any), add new one.
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop every CHECK constraint on tournaments that references the status column
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class     t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.contype   = 'c'
      AND t.relname   = 'tournaments'
      AND n.nspname   = 'public'
      AND pg_get_constraintdef(c.oid) LIKE '%status%'
  LOOP
    EXECUTE 'ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;

  -- Add the updated constraint
  ALTER TABLE public.tournaments
    ADD CONSTRAINT tournaments_status_check
    CHECK (status IN (
      'draft',
      'published',
      'registration_open',
      'registration_closed',
      'ready_check',
      'lobby_created',
      'ready',
      'in_progress',
      'live',
      'paused',
      'results',
      'results_open',
      'results_pending',
      'finished',
      'completed',
      'cancelled',
      'locked'
    ));
END;
$$;
