-- ══════════════════════════════════════════════════════════════════════
-- sql/88 — Welcome & Tournament Onboarding Notifications
-- Trigger: when a user's account_status transitions to 'approved' or
--          whatsapp_verified flips to true, fire the welcome flow.
-- ══════════════════════════════════════════════════════════════════════

-- ─── 1. notify_user_approved() trigger function ───────────────────────
-- Fires on UPDATE of profiles when account_status -> 'approved'
-- Inserts in-app notification (which auto-triggers email via existing trigger).
-- Also inserts rows for any open tournaments the user can join.
CREATE OR REPLACE FUNCTION public.notify_user_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament record;
BEGIN
  -- Only fire when account_status becomes 'approved'
  IF NEW.account_status IS DISTINCT FROM 'approved'
     OR OLD.account_status = 'approved' THEN
    RETURN NEW;
  END IF;

  -- Safety: never send to banned/deleted/unverified
  IF NEW.whatsapp_verified IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Welcome in-app notification (email triggered automatically by existing trigger)
  INSERT INTO notifications (user_id, type, category, priority, title, message, action_url, metadata)
  VALUES (
    NEW.id,
    'system',
    'system',
    'high',
    '🎉 Welcome to CipherPool!',
    'Your account has been approved. You can now register for tournaments, compete for prizes, and climb the leaderboard. Let the games begin!',
    '/tournaments',
    jsonb_build_object('notification_type', 'welcome', 'user_id', NEW.id)
  );

  -- Check for open registration tournaments and notify
  FOR v_tournament IN
    SELECT id, name, start_time, prize, max_players, mode
    FROM tournaments
    WHERE status IN ('registration_open', 'draft')
      AND (registration_deadline IS NULL OR registration_deadline > now())
      AND (max_players IS NULL OR (
        SELECT COUNT(*) FROM tournament_participants
        WHERE tournament_id = tournaments.id AND status = 'approved'
      ) < max_players)
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
      'A new tournament is open for registration: ' || v_tournament.name
        || CASE WHEN v_tournament.prize IS NOT NULL THEN '. Prize: ' || v_tournament.prize ELSE '' END
        || '. Register now before slots fill up!',
      '/tournaments/' || v_tournament.id,
      jsonb_build_object(
        'notification_type', 'tournament_available',
        'tournament_id',     v_tournament.id,
        'tournament_name',   v_tournament.name
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_user_approved ON public.profiles;
CREATE TRIGGER trg_notify_user_approved
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_approved();

-- ─── 2. notify_whatsapp_verified() trigger function ───────────────────
-- Fires when whatsapp_verified flips to true.
-- Only sends if account already approved (otherwise the approved trigger fires later).
CREATE OR REPLACE FUNCTION public.notify_whatsapp_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when whatsapp_verified becomes true
  IF NEW.whatsapp_verified IS NOT TRUE
     OR COALESCE(OLD.whatsapp_verified, false) = TRUE THEN
    RETURN NEW;
  END IF;

  -- If already approved, trigger the welcome flow via a direct notify
  -- (reuse the same function logic — just insert the welcome notification)
  IF NEW.account_status = 'approved' THEN
    INSERT INTO notifications (user_id, type, category, priority, title, message, action_url, metadata)
    VALUES (
      NEW.id,
      'system',
      'system',
      'high',
      '📱 WhatsApp Verified!',
      'Your WhatsApp number has been verified. You will now receive important tournament notifications and updates directly on WhatsApp.',
      '/tournaments',
      jsonb_build_object('notification_type', 'whatsapp_verified', 'user_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_whatsapp_verified ON public.profiles;
CREATE TRIGGER trg_notify_whatsapp_verified
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_whatsapp_verified();

-- ─── 3. notify_tournament_room_open() trigger function ────────────────
-- Fires when tournament status changes to 'lobby_created' or 'in_progress'.
-- Notifies all approved participants that the match center is now open.
CREATE OR REPLACE FUNCTION public.notify_tournament_room_open()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant record;
BEGIN
  -- Only fire when status becomes active (room open)
  IF NEW.status NOT IN ('lobby_created', 'in_progress', 'ready_check')
     OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Notify all approved, verified, active participants
  FOR v_participant IN
    SELECT tp.user_id
    FROM tournament_participants tp
    JOIN profiles p ON p.id = tp.user_id
    WHERE tp.tournament_id = NEW.id
      AND tp.status        = 'approved'
      AND p.whatsapp_verified = TRUE
      AND COALESCE(p.account_status, 'active') NOT IN ('banned', 'deleted')
      AND NOT is_admin_role(p.role)
  LOOP
    INSERT INTO notifications (user_id, type, category, priority, title, message, action_url, metadata)
    VALUES (
      v_participant.user_id,
      'tournament',
      'tournament',
      'urgent',
      '⚡ Match Center Open — ' || COALESCE(NEW.name, 'Tournament'),
      'The match center is now open for ' || COALESCE(NEW.name, 'your tournament') || '! Enter now to claim your seat and get ready.',
      '/tournaments/' || NEW.id || '/room',
      jsonb_build_object(
        'notification_type', 'room_open',
        'tournament_id',     NEW.id,
        'tournament_name',   COALESCE(NEW.name, '')
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_tournament_room_open ON public.tournaments;
CREATE TRIGGER trg_notify_tournament_room_open
  AFTER UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_tournament_room_open();

-- ─── Verify ──────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'sql/88 OK — notify_user_approved, notify_whatsapp_verified, notify_tournament_room_open';
END;
$$;
