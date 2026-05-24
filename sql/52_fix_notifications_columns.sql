-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/52 Fix notifications missing columns + rebuild RPCs
-- Error fixed: column "icon" of relation "notifications" does not exist
-- Also adds: action_url, is_read, expires_at if missing
-- Safe to run multiple times (idempotent).
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. Add ALL potentially missing columns to notifications
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- icon: emoji or icon name for display
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'icon'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN icon text;
  END IF;

  -- action_url: click destination
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'action_url'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN action_url text;
  END IF;

  -- is_read: canonical read state (may have been named "read" in older schemas)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'is_read'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN is_read boolean NOT NULL DEFAULT false;
    -- Backfill from "read" column if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'read'
    ) THEN
      UPDATE public.notifications SET is_read = "read";
    END IF;
  END IF;

  -- expires_at: soft-expiry for notifications
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN expires_at timestamptz;
  END IF;

  -- category
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'category'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN category text NOT NULL DEFAULT 'system';
  END IF;

  -- priority
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'priority'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN priority text NOT NULL DEFAULT 'normal';
  END IF;

  -- image_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN image_url text;
  END IF;

  -- created_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- metadata
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}';
  END IF;

  -- data (some older schemas used data instead of metadata)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'data'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN data jsonb NOT NULL DEFAULT '{}';
  END IF;
END;
$$;

-- Drop old type CHECK if it exists (blocks new type values)
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Indexes for new columns
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS notif_category_idx   ON public.notifications(user_id, category);
CREATE INDEX IF NOT EXISTS notif_priority_idx   ON public.notifications(user_id, priority);
CREATE INDEX IF NOT EXISTS notif_is_read_idx    ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS notif_created_by_idx ON public.notifications(created_by);

-- ─────────────────────────────────────────────────────────────────────
-- 3. Recreate send_global_notification — fixed column list
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.send_global_notification(text,text,text,text,text,text,jsonb,text,text,text);
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
  p_image_url      text    DEFAULT NULL
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
  -- Auth check
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_caller_id AND role IN ('admin','super_admin','founder')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF char_length(COALESCE(p_title, '')) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Title is required');
  END IF;

  -- Resolve target user IDs
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

    ELSE
      SELECT array_agg(id) INTO v_user_ids
      FROM public.profiles WHERE role != 'banned';
  END CASE;

  -- Record the broadcast
  INSERT INTO public.notification_broadcasts (
    title, message, type, category, priority,
    target_type, target_filters, icon, action_url, image_url,
    sent_count, created_by
  ) VALUES (
    p_title, p_message, p_type, p_category, p_priority,
    p_target_type, p_target_filters, p_icon, p_action_url, p_image_url,
    0, v_caller_id
  )
  RETURNING id INTO v_broadcast_id;

  -- Fan-out inserts
  IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
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

  -- Audit log (best-effort)
  BEGIN
    INSERT INTO public.admin_logs (admin_id, action, details)
    VALUES (v_caller_id, 'send_global_notification',
      jsonb_build_object(
        'broadcast_id', v_broadcast_id,
        'target_type', p_target_type,
        'sent_count', v_sent_count,
        'title', p_title
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success',      true,
    'broadcast_id', v_broadcast_id,
    'sent_count',   v_sent_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_global_notification(text,text,text,text,text,text,jsonb,text,text,text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 4. Recreate send_user_notification — fixed column list
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.send_user_notification(uuid, text, text, text, text, text, text, text, text);
CREATE OR REPLACE FUNCTION public.send_user_notification(
  p_user_id    uuid,
  p_title      text,
  p_message    text,
  p_type       text    DEFAULT 'announcement',
  p_category   text    DEFAULT 'admin',
  p_priority   text    DEFAULT 'normal',
  p_icon       text    DEFAULT NULL,
  p_action_url text    DEFAULT NULL,
  p_image_url  text    DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_notif_id  uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_caller_id AND role IN ('admin','super_admin','founder')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.notifications (
    user_id, title, message, type, category, priority,
    icon, action_url, image_url, is_read, created_by, metadata
  ) VALUES (
    p_user_id, p_title, p_message, p_type, p_category, p_priority,
    p_icon, p_action_url, p_image_url,
    false,
    v_caller_id,
    jsonb_build_object('sent_by', v_caller_id)
  )
  RETURNING id INTO v_notif_id;

  BEGIN
    INSERT INTO public.admin_logs (admin_id, action, target_user_id, details)
    VALUES (v_caller_id, 'send_user_notification', p_user_id,
      jsonb_build_object('notification_id', v_notif_id, 'title', p_title)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_notif_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_user_notification(uuid,text,text,text,text,text,text,text,text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 5. Recreate mark_notification_read
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.mark_notification_read(uuid);
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.notifications
  SET is_read = true
  WHERE id = p_notification_id
    AND user_id = auth.uid()
    AND is_read = false;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 6. Recreate mark_all_notifications_read
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.mark_all_notifications_read();
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.notifications
  SET is_read = true
  WHERE user_id = auth.uid() AND is_read = false;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 7. Recreate get_unread_notification_count
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_unread_notification_count();
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.notifications
  WHERE user_id = auth.uid()
    AND is_read = false
    AND (expires_at IS NULL OR expires_at > now());
$$;

GRANT EXECUTE ON FUNCTION public.get_unread_notification_count() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 8. Recreate upsert_notification_preferences
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.upsert_notification_preferences(boolean,boolean,boolean,boolean,boolean,boolean,boolean);
CREATE OR REPLACE FUNCTION public.upsert_notification_preferences(
  p_tournament  boolean DEFAULT true,
  p_social      boolean DEFAULT true,
  p_admin       boolean DEFAULT true,
  p_marketing   boolean DEFAULT true,
  p_system      boolean DEFAULT true,
  p_sound       boolean DEFAULT true,
  p_email       boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_preferences (
    user_id,
    tournament_notifications, social_notifications, admin_notifications,
    marketing_notifications, system_notifications, sound_enabled, email_notifications,
    updated_at
  ) VALUES (
    auth.uid(),
    p_tournament, p_social, p_admin, p_marketing, p_system, p_sound, p_email,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    tournament_notifications = EXCLUDED.tournament_notifications,
    social_notifications     = EXCLUDED.social_notifications,
    admin_notifications      = EXCLUDED.admin_notifications,
    marketing_notifications  = EXCLUDED.marketing_notifications,
    system_notifications     = EXCLUDED.system_notifications,
    sound_enabled            = EXCLUDED.sound_enabled,
    email_notifications      = EXCLUDED.email_notifications,
    updated_at               = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_notification_preferences(boolean,boolean,boolean,boolean,boolean,boolean,boolean) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 9. Ensure notification_broadcasts table exists
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_broadcasts (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text        NOT NULL,
  message        text        NOT NULL,
  type           text        NOT NULL DEFAULT 'announcement',
  category       text        NOT NULL DEFAULT 'admin',
  priority       text        NOT NULL DEFAULT 'normal',
  target_type    text        NOT NULL DEFAULT 'all_users',
  target_filters jsonb       NOT NULL DEFAULT '{}',
  icon           text,
  action_url     text,
  image_url      text,
  sent_count     integer     NOT NULL DEFAULT 0,
  created_by     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  scheduled_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nb_read_admin"  ON public.notification_broadcasts;
DROP POLICY IF EXISTS "nb_write_admin" ON public.notification_broadcasts;

CREATE POLICY "nb_read_admin" ON public.notification_broadcasts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','founder'))
  );

CREATE POLICY "nb_write_admin" ON public.notification_broadcasts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','founder'))
  );

GRANT SELECT, INSERT ON public.notification_broadcasts TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 10. Ensure notification_preferences table exists
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid        UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tournament_notifications boolean     NOT NULL DEFAULT true,
  social_notifications    boolean     NOT NULL DEFAULT true,
  admin_notifications     boolean     NOT NULL DEFAULT true,
  marketing_notifications boolean     NOT NULL DEFAULT true,
  system_notifications    boolean     NOT NULL DEFAULT true,
  sound_enabled           boolean     NOT NULL DEFAULT true,
  email_notifications     boolean     NOT NULL DEFAULT false,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "np_read_self"  ON public.notification_preferences;
DROP POLICY IF EXISTS "np_write_self" ON public.notification_preferences;

CREATE POLICY "np_read_self" ON public.notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "np_write_self" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 11. Enable Realtime
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;              EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_broadcasts;    EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_preferences;   EXCEPTION WHEN OTHERS THEN NULL; END;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 12. Final grants on notifications
-- ─────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 13. Register migration
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.schema_migrations (filename)
VALUES ('52_fix_notifications_columns.sql')
ON CONFLICT (filename) DO NOTHING;
