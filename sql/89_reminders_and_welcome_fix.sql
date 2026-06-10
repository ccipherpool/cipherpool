-- ══════════════════════════════════════════════════════════════════════
-- sql/89 — Reminder scheduling + welcome trigger pg_net call
-- 1. approve_tournament_participant v3: calls schedule_tournament_reminders
-- 2. notify_user_approved v2: calls send-welcome-notification via pg_net
-- 3. pg_cron job to process pending reminders every 5 minutes
-- ══════════════════════════════════════════════════════════════════════

-- ─── 1. approve_tournament_participant v3 ────────────────────────────
-- Adds schedule_tournament_reminders call after successful approval.
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

  UPDATE tournament_participants
  SET status      = 'approved',
      approved_by = auth.uid(),
      approved_at = now()
  WHERE tournament_id = p_tournament_id AND user_id = p_user_id;

  INSERT INTO room_members (tournament_id, user_id, team_number, seat_number, is_ready)
  VALUES (p_tournament_id, p_user_id, COALESCE(v_team, 1), COALESCE(v_seat, 1), false)
  ON CONFLICT (tournament_id, user_id) DO NOTHING;

  -- Schedule 24h / 1h / 15m reminders
  PERFORM schedule_tournament_reminders(p_tournament_id, p_user_id);

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

-- ─── 2. notify_user_approved v2 — fires WhatsApp via pg_net ──────────
-- Replaces the version in sql/88.
-- Calls send-welcome-notification edge function when an account is approved
-- AND whatsapp_verified is already true (the WA-first path).
CREATE OR REPLACE FUNCTION public.notify_user_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament  record;
  v_service_url text;
  v_anon_key    text;
BEGIN
  IF NEW.account_status IS DISTINCT FROM 'approved'
     OR OLD.account_status = 'approved' THEN
    RETURN NEW;
  END IF;

  IF NEW.whatsapp_verified IS NOT TRUE THEN
    -- Account approved but WA not verified yet.
    -- Welcome will be sent when WA is verified (trg_notify_whatsapp_verified fires).
    -- Still send in-app welcome notification.
    INSERT INTO notifications (user_id, type, category, priority, title, message, action_url, metadata)
    VALUES (
      NEW.id,
      'system',
      'system',
      'high',
      '🎉 Account Approved!',
      'Your account has been approved. Complete WhatsApp verification to access all tournament features.',
      '/verify-whatsapp',
      jsonb_build_object('notification_type', 'welcome', 'user_id', NEW.id)
    );
    RETURN NEW;
  END IF;

  -- Full welcome: WA already verified + now approved
  INSERT INTO notifications (user_id, type, category, priority, title, message, action_url, metadata)
  VALUES (
    NEW.id,
    'system',
    'system',
    'high',
    '🎉 Welcome to CipherPool!',
    'Your account has been approved. You can now register for tournaments, compete for prizes, and climb the leaderboard!',
    '/tournaments',
    jsonb_build_object('notification_type', 'welcome', 'user_id', NEW.id)
  );

  -- Open tournament notifications
  FOR v_tournament IN
    SELECT id, name, prize FROM tournaments
    WHERE status IN ('registration_open')
      AND (registration_deadline IS NULL OR registration_deadline > now())
    ORDER BY created_at DESC
    LIMIT 3
  LOOP
    INSERT INTO notifications (user_id, type, category, priority, title, message, action_url, metadata)
    VALUES (
      NEW.id,
      'tournament',
      'tournament',
      'normal',
      '🏆 Tournament Available: ' || v_tournament.name,
      'A tournament is open for registration: ' || v_tournament.name
        || CASE WHEN v_tournament.prize IS NOT NULL THEN '. Prize: ' || v_tournament.prize ELSE '' END
        || '. Register now!',
      '/tournaments/' || v_tournament.id,
      jsonb_build_object('notification_type', 'tournament_available', 'tournament_id', v_tournament.id, 'tournament_name', v_tournament.name)
    );
  END LOOP;

  -- Call send-welcome-notification edge function via pg_net (if extension available)
  BEGIN
    v_service_url := current_setting('app.supabase_url', true);
    v_anon_key    := current_setting('app.anon_key', true);
    IF v_service_url IS NOT NULL AND v_anon_key IS NOT NULL THEN
      PERFORM net.http_post(
        url     := v_service_url || '/functions/v1/send-welcome-notification',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || v_anon_key
        ),
        body    := jsonb_build_object('user_id', NEW.id)
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- pg_net not available or settings not set — WhatsApp will be sent by frontend
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- ─── 3. process_due_reminders() — called by cron ─────────────────────
-- Finds pending reminders that are due, inserts in-app notifications,
-- and marks them sent. The actual WhatsApp is handled by the edge function.
CREATE OR REPLACE FUNCTION public.process_due_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reminder  record;
  v_t         record;
  v_profile   record;
  v_count     int := 0;
  v_label     text;
  v_msg       text;
BEGIN
  FOR v_reminder IN
    SELECT r.id, r.tournament_id, r.user_id, r.type, r.remind_at
    FROM tournament_reminders r
    JOIN profiles p ON p.id = r.user_id
    WHERE r.sent       = false
      AND r.remind_at  <= now()
      AND COALESCE(p.account_status, 'active') NOT IN ('banned', 'deleted')
      AND p.whatsapp_verified = true
      AND NOT is_admin_role(p.role)
  LOOP
    SELECT name, start_time INTO v_t FROM tournaments WHERE id = v_reminder.tournament_id;

    v_label := CASE v_reminder.type
      WHEN '24h'  THEN '24 hours'
      WHEN '1h'   THEN '1 hour'
      WHEN '15m'  THEN '15 minutes'
      ELSE v_reminder.type
    END;

    v_msg := 'Reminder: ' || COALESCE(v_t.name, 'Your tournament') || ' starts in ' || v_label || '! Make sure you''re ready to enter the match center on time.';

    INSERT INTO notifications (user_id, type, category, priority, title, message, action_url, metadata)
    VALUES (
      v_reminder.user_id,
      'tournament',
      'tournament',
      CASE v_reminder.type WHEN '15m' THEN 'urgent' WHEN '1h' THEN 'high' ELSE 'normal' END,
      '⏰ ' || COALESCE(v_t.name, 'Tournament') || ' starts in ' || v_label || '!',
      v_msg,
      '/tournaments/' || v_reminder.tournament_id || '/room',
      jsonb_build_object(
        'notification_type', 'reminder',
        'reminder_type',     v_reminder.type,
        'tournament_id',     v_reminder.tournament_id,
        'tournament_name',   COALESCE(v_t.name, '')
      )
    );

    UPDATE tournament_reminders SET sent = true WHERE id = v_reminder.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_due_reminders() TO service_role;

-- ─── 4. pg_cron — process reminders every 5 minutes ──────────────────
-- Requires pg_cron extension (enable in Supabase: Dashboard > Database > Extensions)
-- If pg_cron is not enabled, skip this block and call process_due_reminders()
-- via a scheduled edge function instead.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove old job if exists
    PERFORM cron.unschedule('process-tournament-reminders');
    -- Schedule new job
    PERFORM cron.schedule(
      'process-tournament-reminders',
      '*/5 * * * *',
      $cron$SELECT public.process_due_reminders();$cron$
    );
    RAISE NOTICE 'pg_cron job scheduled: process-tournament-reminders every 5 min';
  ELSE
    RAISE NOTICE 'pg_cron not enabled — deploy process-reminders edge function and schedule via Supabase dashboard';
  END IF;
END;
$$;

-- ─── Verify ──────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'sql/89 OK — approve_tournament_participant v3 + process_due_reminders + cron';
END;
$$;
