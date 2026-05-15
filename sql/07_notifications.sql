-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — Notifications System
-- Tables: notifications
-- RPC: send_notification, mark_notifications_read
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. NOTIFICATIONS TABLE
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        text        NOT NULL CHECK (type IN (
                'tournament_invite','tournament_start','match_result',
                'ban','unban','coins_received','coins_deducted',
                'announcement','support_reply','rank_up','achievement',
                'season_start','season_end','clan_invite','system'
              )),
  title       text        NOT NULL,
  message     text        NOT NULL,
  data        jsonb       NOT NULL DEFAULT '{}',
  icon        text,
  action_url  text,
  read        boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notif_user_idx   ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notif_read_idx   ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS notif_date_idx   ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_read_self"   ON public.notifications;
DROP POLICY IF EXISTS "notif_write_admin" ON public.notifications;
DROP POLICY IF EXISTS "notif_update_self" ON public.notifications;

CREATE POLICY "notif_read_self" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notif_update_self" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notif_write_admin" ON public.notifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','founder','fondateur'))
  );

CREATE POLICY "notif_delete_self" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, UPDATE, DELETE ON TABLE public.notifications TO authenticated;
GRANT INSERT ON TABLE public.notifications TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 2. RPC: send_notification — send to one user
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.send_notification(
  p_user_id   uuid,
  p_type      text,
  p_title     text,
  p_message   text,
  p_data      jsonb    DEFAULT '{}',
  p_action_url text   DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
  VALUES (p_user_id, p_type, p_title, p_message, p_data, p_action_url)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 3. RPC: broadcast_notification — send to all users with a given role
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.broadcast_notification(
  p_role      text,   -- 'all' to send to everyone
  p_type      text,
  p_title     text,
  p_message   text,
  p_data      jsonb  DEFAULT '{}',
  p_action_url text  DEFAULT NULL
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count integer := 0;
BEGIN
  IF p_role = 'all' THEN
    INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
    SELECT id, p_type, p_title, p_message, p_data, p_action_url FROM public.profiles;
  ELSE
    INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
    SELECT id, p_type, p_title, p_message, p_data, p_action_url FROM public.profiles WHERE role = p_role;
  END IF;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 4. RPC: mark_notifications_read — mark all unread as read
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_notifications_read(
  p_user_id uuid DEFAULT NULL
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid uuid := COALESCE(p_user_id, auth.uid());
  v_count integer;
BEGIN
  UPDATE public.notifications SET read = true
  WHERE user_id = v_uid AND read = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 5. RPC: get_unread_count — quick unread count for bell badge
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_unread_count()
RETURNS integer LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COUNT(*)::integer FROM public.notifications
  WHERE user_id = auth.uid() AND read = false;
$$;
