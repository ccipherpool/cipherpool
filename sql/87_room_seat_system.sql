-- ══════════════════════════════════════════════════════════════════════
-- sql/87 — Room Seat System v2
-- Auto-assign seats, admin exclusion, WhatsApp validation, notifications
-- ══════════════════════════════════════════════════════════════════════

-- ─── Helper: is_admin_role ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin_role(p_role text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_role, '') IN ('admin', 'super_admin', 'founder', 'fondateur', 'staff');
$$;

-- ─── 1. enter_tournament_room ─────────────────────────────────────────
-- Called when a player navigates to the room page.
-- Validates WhatsApp, account status, approved participant, available seat.
-- Auto-assigns first free slot. Idempotent (returns existing seat if already seated).
DROP FUNCTION IF EXISTS public.enter_tournament_room(uuid);

CREATE OR REPLACE FUNCTION public.enter_tournament_room(p_tournament_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id  uuid := auth.uid();
  v_profile    record;
  v_tournament record;
  v_team_size  int;
  v_num_teams  int;
  v_team       int  := NULL;
  v_seat       int  := NULL;
  ti           int;
  si           int;
  v_occupied   boolean;
  v_existing   record;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT role, whatsapp_verified, account_status
  INTO v_profile FROM profiles WHERE id = v_caller_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'profile_not_found');
  END IF;

  -- Block suspended accounts
  IF v_profile.account_status IN ('banned', 'deleted', 'pending_deletion') THEN
    RETURN jsonb_build_object('success', false, 'error', 'account_suspended');
  END IF;

  -- Admins enter as observers — never occupy a player seat
  IF is_admin_role(v_profile.role) THEN
    RETURN jsonb_build_object('success', true, 'is_admin', true, 'seat_assigned', false);
  END IF;

  -- Players must have verified WhatsApp
  IF NOT COALESCE(v_profile.whatsapp_verified, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'whatsapp_not_verified');
  END IF;

  -- If already seated, return existing seat (idempotent)
  SELECT team_number, seat_number INTO v_existing
  FROM room_members WHERE tournament_id = p_tournament_id AND user_id = v_caller_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success',        true,
      'already_seated', true,
      'team_number',    v_existing.team_number,
      'seat_number',    v_existing.seat_number
    );
  END IF;

  -- Must have an approved participation record
  IF NOT EXISTS (
    SELECT 1 FROM tournament_participants
    WHERE tournament_id = p_tournament_id
      AND user_id       = v_caller_id
      AND status        = 'approved'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_approved');
  END IF;

  -- Load tournament structure
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'tournament_not_found');
  END IF;

  IF v_tournament.game_type = 'cs' THEN
    v_num_teams := 2;
    v_team_size := CASE v_tournament.cs_format WHEN '1v1' THEN 1 WHEN '2v2' THEN 2 ELSE 4 END;
  ELSE
    v_team_size := CASE v_tournament.mode WHEN 'squad' THEN 4 WHEN 'duo' THEN 2 ELSE 1 END;
    v_num_teams := CEIL(v_tournament.max_players::float / v_team_size);
  END IF;

  -- Find first unoccupied player slot (admin slots are ignored from count)
  FOR ti IN 1..v_num_teams LOOP
    FOR si IN 1..v_team_size LOOP
      SELECT EXISTS(
        SELECT 1 FROM room_members rm
        JOIN profiles p ON p.id = rm.user_id
        WHERE rm.tournament_id = p_tournament_id
          AND rm.team_number   = ti
          AND rm.seat_number   = si
          AND NOT is_admin_role(p.role)
      ) INTO v_occupied;
      IF NOT v_occupied THEN
        v_team := ti; v_seat := si;
        EXIT;
      END IF;
    END LOOP;
    IF v_team IS NOT NULL THEN EXIT; END IF;
  END LOOP;

  IF v_team IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_seats_available');
  END IF;

  -- Assign the seat
  INSERT INTO room_members (tournament_id, user_id, team_number, seat_number, is_ready)
  VALUES (p_tournament_id, v_caller_id, v_team, v_seat, false)
  ON CONFLICT (tournament_id, user_id) DO UPDATE
    SET team_number = EXCLUDED.team_number,
        seat_number = EXCLUDED.seat_number;

  -- In-app notification
  INSERT INTO notifications (user_id, type, category, priority, title, message, action_url, metadata)
  VALUES (
    v_caller_id,
    'tournament',
    'tournament',
    'high',
    '🎮 Seat Reserved!',
    'You''ve been assigned Seat #' || v_seat || ' (Team ' || v_team || ') for ' || COALESCE(v_tournament.name, 'the tournament') || '. Good luck!',
    '/tournaments/' || p_tournament_id || '/room',
    jsonb_build_object(
      'tournament_id',     p_tournament_id,
      'tournament_name',   COALESCE(v_tournament.name, ''),
      'seat_number',       v_seat,
      'team_number',       v_team,
      'notification_type', 'seat_assigned'
    )
  );

  RETURN jsonb_build_object(
    'success',      true,
    'newly_seated', true,
    'team_number',  v_team,
    'seat_number',  v_seat
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.enter_tournament_room(uuid) TO authenticated;

-- ─── 2. get_room_player_count ─────────────────────────────────────────
-- Returns count of real players only (excludes admins and banned/deleted).
CREATE OR REPLACE FUNCTION public.get_room_player_count(p_tournament_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM room_members rm
  JOIN profiles p ON p.id = rm.user_id
  WHERE rm.tournament_id = p_tournament_id
    AND NOT is_admin_role(p.role)
    AND COALESCE(p.account_status, 'active') NOT IN ('banned', 'deleted');
$$;

GRANT EXECUTE ON FUNCTION public.get_room_player_count(uuid) TO authenticated;

-- ─── 3. Updated approve_tournament_participant ────────────────────────
-- Extends sql/61 version: adds WhatsApp check + in-app notification.
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
  v_caller_role text;
  v_created_by  uuid;
  v_t           record;
  v_team_size   int;
  v_num_teams   int;
  v_team        int := NULL;
  v_seat        int := NULL;
  ti            int;
  si            int;
  v_occupied    boolean;
  v_player      record;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  SELECT created_by INTO v_created_by FROM tournaments WHERE id = p_tournament_id;

  IF v_created_by IS DISTINCT FROM auth.uid()
     AND NOT is_admin_role(v_caller_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Validate player eligibility
  SELECT role, whatsapp_verified, account_status
  INTO v_player FROM profiles WHERE id = p_user_id;

  IF v_player.account_status IN ('banned', 'deleted') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player account is suspended');
  END IF;

  IF NOT COALESCE(v_player.whatsapp_verified, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player has not verified WhatsApp');
  END IF;

  SELECT * INTO v_t FROM tournaments WHERE id = p_tournament_id;

  IF v_t.game_type = 'cs' THEN
    v_num_teams := 2;
    v_team_size := CASE v_t.cs_format WHEN '1v1' THEN 1 WHEN '2v2' THEN 2 ELSE 4 END;
  ELSE
    v_team_size := CASE v_t.mode WHEN 'squad' THEN 4 WHEN 'duo' THEN 2 ELSE 1 END;
    v_num_teams := CEIL(v_t.max_players::float / v_team_size);
  END IF;

  -- Find first player slot (skip slots occupied by admins)
  FOR ti IN 1..v_num_teams LOOP
    FOR si IN 1..v_team_size LOOP
      SELECT EXISTS(
        SELECT 1 FROM room_members rm
        JOIN profiles p ON p.id = rm.user_id
        WHERE rm.tournament_id = p_tournament_id
          AND rm.team_number   = ti
          AND rm.seat_number   = si
          AND NOT is_admin_role(p.role)
      ) INTO v_occupied;
      IF NOT v_occupied THEN v_team := ti; v_seat := si; EXIT; END IF;
    END LOOP;
    IF v_team IS NOT NULL THEN EXIT; END IF;
  END LOOP;

  -- Approve the participant
  UPDATE tournament_participants
  SET status      = 'approved',
      approved_by = auth.uid(),
      approved_at = now()
  WHERE tournament_id = p_tournament_id AND user_id = p_user_id;

  -- Reserve the seat
  INSERT INTO room_members (tournament_id, user_id, team_number, seat_number, is_ready)
  VALUES (p_tournament_id, p_user_id, COALESCE(v_team, 1), COALESCE(v_seat, 1), false)
  ON CONFLICT (tournament_id, user_id) DO NOTHING;

  -- Notify approved player
  INSERT INTO notifications (user_id, type, category, priority, title, message, action_url, metadata)
  VALUES (
    p_user_id,
    'tournament',
    'tournament',
    'high',
    '✅ Registration Approved!',
    'Congratulations! Your registration for ' || COALESCE(v_t.name, 'the tournament')
      || ' has been approved. You have been assigned Seat #' || COALESCE(v_seat, 1)
      || ' (Team ' || COALESCE(v_team, 1) || '). Check in on time and good luck!',
    '/tournaments/' || p_tournament_id || '/room',
    jsonb_build_object(
      'tournament_id',     p_tournament_id,
      'tournament_name',   COALESCE(v_t.name, ''),
      'seat_number',       COALESCE(v_seat, 1),
      'team_number',       COALESCE(v_team, 1),
      'notification_type', 'registration_approved'
    )
  );

  RETURN jsonb_build_object(
    'success',     true,
    'team_number', COALESCE(v_team, 1),
    'seat_number', COALESCE(v_seat, 1)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_tournament_participant(uuid, uuid) TO authenticated;

-- ─── 4. Notification logs table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        REFERENCES public.profiles(id) ON DELETE CASCADE,
  type            text        NOT NULL,  -- 'email' | 'whatsapp'
  notification_type text,               -- 'seat_assigned' | 'registration_approved' | 'welcome' | etc.
  title           text,
  message         text,
  status          text        DEFAULT 'sent', -- 'sent' | 'failed' | 'skipped'
  error_message   text,
  sent_at         timestamptz DEFAULT now(),
  metadata        jsonb       DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_notif_logs_user ON public.notification_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_notif_logs_type ON public.notification_logs (type);
CREATE INDEX IF NOT EXISTS idx_notif_logs_sent ON public.notification_logs (sent_at DESC);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_see_own_logs" ON public.notification_logs;
CREATE POLICY "user_see_own_logs" ON public.notification_logs
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_see_all_logs" ON public.notification_logs;
CREATE POLICY "admin_see_all_logs" ON public.notification_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin_role(role))
  );

GRANT SELECT ON public.notification_logs TO authenticated;

-- ─── 5. Tournament reminders table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tournament_reminders (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   uuid        NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  remind_at       timestamptz NOT NULL,
  type            text        NOT NULL DEFAULT '1h', -- '24h' | '1h' | '15m'
  sent            boolean     DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (tournament_id, user_id, type)
);

ALTER TABLE public.tournament_reminders ADD COLUMN IF NOT EXISTS remind_at  timestamptz;
ALTER TABLE public.tournament_reminders ADD COLUMN IF NOT EXISTS type       text NOT NULL DEFAULT '1h';
ALTER TABLE public.tournament_reminders ADD COLUMN IF NOT EXISTS sent       boolean DEFAULT false;
ALTER TABLE public.tournament_reminders ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON public.tournament_reminders (remind_at) WHERE sent = false;

ALTER TABLE public.tournament_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_see_own_reminders" ON public.tournament_reminders;
CREATE POLICY "user_see_own_reminders" ON public.tournament_reminders
  FOR SELECT USING (user_id = auth.uid());

-- ─── 6. schedule_tournament_reminders ────────────────────────────────
-- Called when a player is approved: schedules 24h, 1h, 15m reminders.
CREATE OR REPLACE FUNCTION public.schedule_tournament_reminders(
  p_tournament_id uuid,
  p_user_id       uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_time timestamptz;
BEGIN
  SELECT start_time INTO v_start_time
  FROM tournaments WHERE id = p_tournament_id;

  IF v_start_time IS NULL THEN RETURN; END IF;

  INSERT INTO tournament_reminders (tournament_id, user_id, remind_at, type)
  VALUES
    (p_tournament_id, p_user_id, v_start_time - interval '24 hours', '24h'),
    (p_tournament_id, p_user_id, v_start_time - interval '1 hour',   '1h'),
    (p_tournament_id, p_user_id, v_start_time - interval '15 minutes', '15m')
  ON CONFLICT (tournament_id, user_id, type) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.schedule_tournament_reminders(uuid, uuid) TO service_role;

-- ─── Verify ──────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'sql/87 OK — enter_tournament_room, get_room_player_count, approve_tournament_participant v2, notification_logs, tournament_reminders';
END;
$$;
