-- CipherPool tournament creation and role separation hardening.
-- Apply after 56_tournaments_and_social_fixes.sql.

-- Keep the app and database aligned for room lifecycle values.
ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournaments_room_status_check;
ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_room_status_check
  CHECK (
    room_status IS NULL OR room_status IN (
      'registration',
      'pending',
      'ready',
      'waiting',
      'live',
      'finished',
      'results_open',
      'results_closed'
    )
  );

UPDATE public.tournaments
SET room_status = 'registration'
WHERE room_status IS NULL OR room_status = 'pending';

ALTER TABLE public.tournaments
  ALTER COLUMN room_status SET DEFAULT 'registration';

-- Remove older permissive policies that made founder/admin scopes overlap.
DROP POLICY IF EXISTS "tournaments_manage_staff" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_write_founder" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_insert_founder" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_update_founder" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_delete_staff" ON public.tournaments;
DROP POLICY IF EXISTS "t_insert" ON public.tournaments;
DROP POLICY IF EXISTS "t_update" ON public.tournaments;
DROP POLICY IF EXISTS "t_delete" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_read_all" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_insert_owner_founder" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_update_owner_or_super_admin" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_delete_owner_or_super_admin" ON public.tournaments;

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournaments_read_all"
  ON public.tournaments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "tournaments_insert_owner_founder"
  ON public.tournaments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('founder', 'fondateur', 'super_admin')
    )
  );

CREATE POLICY "tournaments_update_owner_or_super_admin"
  ON public.tournaments
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

CREATE POLICY "tournaments_delete_owner_or_super_admin"
  ON public.tournaments
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournaments TO authenticated;
