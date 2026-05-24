-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/53 Email Notification Delivery + Advanced Targeting
-- Adds:
--   • Email delivery columns on notification_broadcasts
--   • notification_email_logs table
--   • Updated send_global_notification RPC (email params + new targets)
--   • New target types: online_users, clan_members, team_members
-- Safe to run multiple times (idempotent).
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. Add email delivery columns to notification_broadcasts
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notification_broadcasts' AND column_name='send_in_app') THEN
    ALTER TABLE public.notification_broadcasts ADD COLUMN send_in_app boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notification_broadcasts' AND column_name='send_email') THEN
    ALTER TABLE public.notification_broadcasts ADD COLUMN send_email boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notification_broadcasts' AND column_name='email_subject') THEN
    ALTER TABLE public.notification_broadcasts ADD COLUMN email_subject text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notification_broadcasts' AND column_name='email_status') THEN
    ALTER TABLE public.notification_broadcasts ADD COLUMN email_status text DEFAULT 'not_sent';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notification_broadcasts' AND column_name='email_sent_count') THEN
    ALTER TABLE public.notification_broadcasts ADD COLUMN email_sent_count integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notification_broadcasts' AND column_name='email_failed_count') THEN
    ALTER TABLE public.notification_broadcasts ADD COLUMN email_failed_count integer NOT NULL DEFAULT 0;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 2. notification_email_logs — per-user email delivery audit
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_email_logs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id  uuid        REFERENCES public.notification_broadcasts(id) ON DELETE SET NULL,
  user_id       uuid,
  email         text        NOT NULL,
  status        text        NOT NULL DEFAULT 'pending',  -- pending | sent | failed | skipped
  error_message text,
  sent_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_logs_broadcast_idx ON public.notification_email_logs(broadcast_id);
CREATE INDEX IF NOT EXISTS email_logs_user_idx      ON public.notification_email_logs(user_id);
CREATE INDEX IF NOT EXISTS email_logs_status_idx    ON public.notification_email_logs(status);

ALTER TABLE public.notification_email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_logs_admin_read"    ON public.notification_email_logs;
DROP POLICY IF EXISTS "email_logs_service_write"  ON public.notification_email_logs;

-- Admins can view all logs
CREATE POLICY "email_logs_admin_read" ON public.notification_email_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','founder'))
  );

GRANT SELECT ON public.notification_email_logs TO authenticated;
GRANT ALL    ON public.notification_email_logs TO service_role;

-- ─────────────────────────────────────────────────────────────────────
-- 3. RPC: update_broadcast_email_stats — called by Edge Function
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.update_broadcast_email_stats(uuid, integer, integer, text);
CREATE OR REPLACE FUNCTION public.update_broadcast_email_stats(
  p_broadcast_id   uuid,
  p_sent_count     integer,
  p_failed_count   integer,
  p_status         text DEFAULT 'sent'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notification_broadcasts
  SET
    email_sent_count   = p_sent_count,
    email_failed_count = p_failed_count,
    email_status       = p_status
  WHERE id = p_broadcast_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_broadcast_email_stats(uuid,integer,integer,text) TO service_role;

-- ─────────────────────────────────────────────────────────────────────
-- 4. Rebuild send_global_notification with email params + new targets
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.send_global_notification(text,text,text,text,text,text,jsonb,text,text,text);
DROP FUNCTION IF EXISTS public.send_global_notification(text,text,text,text,text,text,jsonb,text,text,text,boolean,boolean,text);

CREATE OR REPLACE FUNCTION public.send_global_notification(
  p_title          text,
  p_message        text,
  p_type           text    DEFAULT 'announcement',
  p_category       text    DEFAULT 'admin',
  p_priority       text    DEFAULT 'normal',
  p_target_type    text    DEFAULT 'all_users',
  p_target_filters jsonb   DEFAULT '{}',
  p_icon           text    DEFAULT NULL,
  p_action_url     text    DEFAULT NULL,
  p_image_url      text    DEFAULT NULL,
  p_send_in_app    boolean DEFAULT true,
  p_send_email     boolean DEFAULT false,
  p_email_subject  text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id    uuid    := auth.uid();
  v_broadcast_id uuid;
  v_sent_count   integer := 0;
  v_user_ids     uuid[];
BEGIN
  -- Auth: admin/super_admin/founder only
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_caller_id AND role IN ('admin','super_admin','founder')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Email broadcasts: require super_admin or founder (extra safety)
  IF p_send_email AND NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_caller_id AND role IN ('super_admin','founder')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email broadcasts require super_admin or founder role');
  END IF;

  IF char_length(COALESCE(p_title, '')) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Title is required');
  END IF;

  -- ── Resolve target user IDs ──────────────────────────────────────
  CASE p_target_type
    WHEN 'all_users' THEN
      SELECT array_agg(id) INTO v_user_ids
      FROM public.profiles WHERE role != 'banned';

    WHEN 'admins' THEN
      SELECT array_agg(id) INTO v_user_ids
      FROM public.profiles WHERE role IN ('admin','super_admin','founder');

    WHEN 'founders' THEN
      SELECT array_agg(id) INTO v_user_ids
      FROM public.profiles WHERE role = 'founder';

    WHEN 'specific_role' THEN
      SELECT array_agg(id) INTO v_user_ids
      FROM public.profiles WHERE role = (p_target_filters->>'role');

    WHEN 'tournament_participants' THEN
      SELECT array_agg(DISTINCT user_id) INTO v_user_ids
      FROM public.tournament_participants
      WHERE tournament_id = (p_target_filters->>'tournament_id')::uuid;

    WHEN 'specific_users' THEN
      SELECT array_agg(id) INTO v_user_ids
      FROM public.profiles
      WHERE id = ANY(
        ARRAY(SELECT jsonb_array_elements_text(p_target_filters->'user_ids')::uuid)
      );

    WHEN 'online_users' THEN
      -- Users with recent presence activity (last 15 minutes)
      SELECT array_agg(DISTINCT p.id) INTO v_user_ids
      FROM public.profiles p
      INNER JOIN public.user_presence up ON up.user_id = p.id
      WHERE up.status IN ('online','idle')
        AND up.last_seen > now() - INTERVAL '15 minutes'
        AND p.role != 'banned';

    WHEN 'clan_members' THEN
      SELECT array_agg(DISTINCT cm.user_id) INTO v_user_ids
      FROM public.clan_members cm
      WHERE cm.clan_id = (p_target_filters->>'clan_id')::uuid;

    WHEN 'team_members' THEN
      SELECT array_agg(DISTINCT tm.user_id) INTO v_user_ids
      FROM public.team_members tm
      WHERE tm.team_id = (p_target_filters->>'team_id')::uuid;

    ELSE
      SELECT array_agg(id) INTO v_user_ids
      FROM public.profiles WHERE role != 'banned';
  END CASE;

  -- ── Record the broadcast ─────────────────────────────────────────
  INSERT INTO public.notification_broadcasts (
    title, message, type, category, priority,
    target_type, target_filters, icon, action_url, image_url,
    send_in_app, send_email, email_subject, email_status,
    sent_count, created_by
  ) VALUES (
    p_title, p_message, p_type, p_category, p_priority,
    p_target_type, p_target_filters, p_icon, p_action_url, p_image_url,
    p_send_in_app, p_send_email,
    COALESCE(p_email_subject, p_title),
    CASE WHEN p_send_email THEN 'queued' ELSE 'not_sent' END,
    0, v_caller_id
  )
  RETURNING id INTO v_broadcast_id;

  -- ── Fan-out in-app notifications ─────────────────────────────────
  IF p_send_in_app AND v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
    INSERT INTO public.notifications (
      user_id, title, message, type, category, priority,
      icon, action_url, image_url, is_read, created_by, metadata
    )
    SELECT
      uid,
      p_title, p_message, p_type, p_category, p_priority,
      p_icon, p_action_url, p_image_url,
      false,
      v_caller_id,
      jsonb_build_object('broadcast_id', v_broadcast_id)
    FROM unnest(v_user_ids) AS uid;

    GET DIAGNOSTICS v_sent_count = ROW_COUNT;

    UPDATE public.notification_broadcasts
    SET sent_count = v_sent_count
    WHERE id = v_broadcast_id;
  END IF;

  -- ── Audit log ────────────────────────────────────────────────────
  BEGIN
    INSERT INTO public.admin_logs (admin_id, action, details)
    VALUES (v_caller_id, 'send_global_notification',
      jsonb_build_object(
        'broadcast_id', v_broadcast_id,
        'target_type',  p_target_type,
        'sent_count',   v_sent_count,
        'send_email',   p_send_email,
        'title',        p_title
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success',      true,
    'broadcast_id', v_broadcast_id,
    'sent_count',   v_sent_count,
    'target_count', COALESCE(array_length(v_user_ids, 1), 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_global_notification(text,text,text,text,text,text,jsonb,text,text,text,boolean,boolean,text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 5. RPC: get_broadcast_email_recipients — Edge Function uses this
--    Returns emails of users who should receive the email for a broadcast
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_broadcast_email_recipients(uuid);
CREATE OR REPLACE FUNCTION public.get_broadcast_email_recipients(p_broadcast_id uuid)
RETURNS TABLE(user_id uuid, email text, username text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_broadcast   public.notification_broadcasts%ROWTYPE;
  v_user_ids    uuid[];
BEGIN
  SELECT * INTO v_broadcast FROM public.notification_broadcasts WHERE id = p_broadcast_id;

  IF v_broadcast.id IS NULL THEN
    RETURN;
  END IF;

  -- Resolve target IDs (mirror of send_global_notification)
  CASE v_broadcast.target_type
    WHEN 'all_users' THEN
      SELECT array_agg(id) INTO v_user_ids FROM public.profiles WHERE role != 'banned';
    WHEN 'admins' THEN
      SELECT array_agg(id) INTO v_user_ids FROM public.profiles WHERE role IN ('admin','super_admin','founder');
    WHEN 'founders' THEN
      SELECT array_agg(id) INTO v_user_ids FROM public.profiles WHERE role = 'founder';
    WHEN 'specific_role' THEN
      SELECT array_agg(id) INTO v_user_ids FROM public.profiles WHERE role = (v_broadcast.target_filters->>'role');
    WHEN 'tournament_participants' THEN
      SELECT array_agg(DISTINCT user_id) INTO v_user_ids FROM public.tournament_participants
      WHERE tournament_id = (v_broadcast.target_filters->>'tournament_id')::uuid;
    WHEN 'specific_users' THEN
      SELECT array_agg(id) INTO v_user_ids FROM public.profiles
      WHERE id = ANY(ARRAY(SELECT jsonb_array_elements_text(v_broadcast.target_filters->'user_ids')::uuid));
    WHEN 'online_users' THEN
      SELECT array_agg(DISTINCT p.id) INTO v_user_ids FROM public.profiles p
      INNER JOIN public.user_presence up ON up.user_id = p.id
      WHERE up.status IN ('online','idle') AND up.last_seen > now() - INTERVAL '15 minutes' AND p.role != 'banned';
    WHEN 'clan_members' THEN
      SELECT array_agg(DISTINCT cm.user_id) INTO v_user_ids FROM public.clan_members cm
      WHERE cm.clan_id = (v_broadcast.target_filters->>'clan_id')::uuid;
    WHEN 'team_members' THEN
      SELECT array_agg(DISTINCT tm.user_id) INTO v_user_ids FROM public.team_members tm
      WHERE tm.team_id = (v_broadcast.target_filters->>'team_id')::uuid;
    ELSE
      SELECT array_agg(id) INTO v_user_ids FROM public.profiles WHERE role != 'banned';
  END CASE;

  -- Return profiles with email, filtering out those who opted out
  RETURN QUERY
    SELECT p.id, au.email::text, p.username
    FROM public.profiles p
    INNER JOIN auth.users au ON au.id = p.id
    WHERE p.id = ANY(v_user_ids)
      AND au.email IS NOT NULL
      AND au.email != ''
      -- Respect email opt-out
      AND NOT EXISTS (
        SELECT 1 FROM public.notification_preferences np
        WHERE np.user_id = p.id AND np.email_notifications = false
      );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_broadcast_email_recipients(uuid) TO service_role;

-- ─────────────────────────────────────────────────────────────────────
-- 6. Enable realtime on email_logs (for delivery progress updates)
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_email_logs; EXCEPTION WHEN OTHERS THEN NULL; END;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 7. Register migration
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.schema_migrations (filename)
VALUES ('53_email_notifications.sql')
ON CONFLICT (filename) DO NOTHING;
