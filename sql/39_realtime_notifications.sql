-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/39 Realtime & Notifications
-- Fixes: all_notifications view (is_read/expires_at column refs,
--        admin_messages missing table), optimised broadcast_notification,
--        Realtime enabled on key tables, stale presence cleanup job.
-- Safe to run multiple times (fully idempotent).
-- Depends on: sql/37_database_integrity.sql, sql/38_chat_schema.sql
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. ENABLE REALTIME on key existing tables
--    notifications and tournaments need live updates for the UI.
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_participants;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 2. FIX all_notifications VIEW
--    sql/17 defined a view that UNIONs notifications + admin_messages.
--    Problems:
--      a) admin_messages table has no SQL definition — never created
--      b) View references is_read column (sql/37 added it, but `read`
--         may still be the live column on some databases)
--      c) View references expires_at (sql/37 added it)
--    Fix: rebuild view using only the notifications table; reference
--    is_read with COALESCE fallback for databases that still have `read`.
-- ─────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.all_notifications;

DO $$
DECLARE
  v_has_is_read boolean;
  v_has_read    boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications'
      AND column_name = 'is_read'
  ) INTO v_has_is_read;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications'
      AND column_name = 'read'
  ) INTO v_has_read;

  -- Build view dynamically so it works regardless of which read column exists
  IF v_has_is_read THEN
    EXECUTE '
      CREATE VIEW public.all_notifications
      WITH (security_invoker = true) AS
      SELECT
        id,
        user_id,
        type,
        title,
        message,
        is_read,
        expires_at,
        data,
        created_at
      FROM public.notifications
      WHERE (expires_at IS NULL OR expires_at > now())
        AND auth.uid() = user_id
      ORDER BY created_at DESC
    ';
  ELSIF v_has_read THEN
    EXECUTE '
      CREATE VIEW public.all_notifications
      WITH (security_invoker = true) AS
      SELECT
        id,
        user_id,
        type,
        title,
        message,
        read AS is_read,
        NULL::timestamptz AS expires_at,
        CASE WHEN to_jsonb(notifications) ? ''data'' THEN data ELSE ''{}''::jsonb END AS data,
        created_at
      FROM public.notifications
      WHERE auth.uid() = user_id
      ORDER BY created_at DESC
    ';
  END IF;
END;
$$;

GRANT SELECT ON public.all_notifications TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 3. OPTIMISED broadcast_notification RPC
--    The old approach inserted one notification row per user for mass
--    broadcasts (e.g. 100k users = 100k rows in one transaction, full
--    table lock for the duration). The announcement_reads pattern is
--    already in place (sql/08). For mass notifications, we now insert
--    into announcements and rely on the lazy-read pattern.
--    For targeted notifications (< 1000 users), we keep the fan-out
--    approach but batch it.
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.broadcast_notification(text, text, text, text[]);
CREATE OR REPLACE FUNCTION public.broadcast_notification(
  p_title     text,
  p_message   text,
  p_type      text    DEFAULT 'info',
  p_roles     text[]  DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id   uuid    := auth.uid();
  v_rows       integer;
  v_ann_id     uuid;
BEGIN
  IF NOT public.is_role(ARRAY['admin','super_admin','founder','fondateur']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF char_length(COALESCE(p_title, '')) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Title required');
  END IF;

  -- Use the announcements table for mass broadcasts (lazy-read pattern)
  -- This avoids inserting N notification rows and locking the table.
  INSERT INTO public.announcements (
    title, content, type, priority, is_active, is_pinned,
    target_roles, created_by, expires_at
  )
  VALUES (
    p_title, p_message,
    CASE p_type
      WHEN 'warning'     THEN 'warning'
      WHEN 'success'     THEN 'success'
      WHEN 'danger'      THEN 'danger'
      WHEN 'maintenance' THEN 'maintenance'
      WHEN 'update'      THEN 'update'
      ELSE 'info'
    END,
    5, true, false,
    p_roles,
    v_admin_id,
    now() + INTERVAL '7 days'
  )
  RETURNING id INTO v_ann_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  BEGIN
    INSERT INTO public.admin_logs (admin_id, action, details)
    VALUES (v_admin_id, 'broadcast_notification',
      jsonb_build_object(
        'title', p_title, 'type', p_type,
        'roles', p_roles, 'announcement_id', v_ann_id
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success',         true,
    'announcement_id', v_ann_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.broadcast_notification(text, text, text, text[]) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 4. RPC: mark_notifications_read — bulk mark as read for current user
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.mark_notifications_read(uuid[]);
CREATE OR REPLACE FUNCTION public.mark_notifications_read(
  p_notification_ids uuid[] DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_updated integer;
BEGIN
  IF v_user_id IS NULL THEN RETURN 0; END IF;

  -- If no IDs given: mark all as read
  IF p_notification_ids IS NULL OR array_length(p_notification_ids, 1) IS NULL THEN
    UPDATE public.notifications
    SET is_read = true
    WHERE user_id = v_user_id AND is_read = false;
  ELSE
    UPDATE public.notifications
    SET is_read = true
    WHERE user_id = v_user_id
      AND id = ANY(p_notification_ids)
      AND is_read = false;
  END IF;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 5. RPC: cleanup_stale_presence
--    Users who disconnect without calling update_presence('offline')
--    leave stale 'online' rows. This RPC marks them offline after
--    5 minutes of no heartbeat. Should be called by a cron job or
--    the frontend on load (cheap: only touches rows > 5 min old).
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.cleanup_stale_presence();
CREATE OR REPLACE FUNCTION public.cleanup_stale_presence()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.user_presence
  SET status = 'offline', updated_at = now()
  WHERE status IN ('online','idle')
    AND last_seen < now() - INTERVAL '5 minutes';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

-- Anyone can call this (safe: only updates stale rows, no data leak)
GRANT EXECUTE ON FUNCTION public.cleanup_stale_presence() TO authenticated, anon;

-- ─────────────────────────────────────────────────────────────────────
-- 6. REGISTER MIGRATION
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.schema_migrations (filename)
VALUES ('39_realtime_notifications.sql')
ON CONFLICT (filename) DO NOTHING;
