-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/55 Individual Notification Email Trigger
-- Adds:
--   • notification_id column on notification_email_logs (individual emails)
--   • pg_net extension (Supabase built-in — allows HTTP calls from triggers)
--   • notify_user_by_email() trigger function
--   • trg_notify_user_by_email trigger on notifications INSERT
--   • RPC: send_test_notification_email() for admins
--
-- ⚠️  ONE-TIME SETUP after running this file:
--     Run this in the Supabase SQL Editor (Dashboard → SQL Editor):
--
--       ALTER DATABASE postgres
--         SET "app.service_role_key" = 'your-service-role-key-here';
--
--     Find your service role key:
--     Supabase Dashboard → Project Settings → API → service_role (secret)
--
-- Safe to run multiple times (idempotent).
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. Enable pg_net (built into Supabase — may already be enabled)
-- ─────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Add notification_id column to notification_email_logs
--    (individual notification emails, vs broadcast_id for broadcasts)
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'notification_email_logs'
      AND column_name  = 'notification_id'
  ) THEN
    ALTER TABLE public.notification_email_logs
      ADD COLUMN notification_id uuid REFERENCES public.notifications(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS email_logs_notification_idx
      ON public.notification_email_logs(notification_id);
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Store the Edge Functions URL in site_settings
--    site_settings is the correct key-value store (key TEXT PRIMARY KEY,
--    value JSONB). system_config is a singleton row — not key-value.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.site_settings (key, value, category, label, description, is_public)
VALUES (
  'supabase_functions_url',
  '"https://mbaldfltjcjlsrhntteh.supabase.co/functions/v1"'::jsonb,
  'security',
  'Edge Functions Base URL',
  'Base URL for Supabase Edge Functions — used by DB triggers to send emails',
  false
)
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- 4. Trigger function: fires AFTER INSERT on notifications
--    • Checks notification_preferences.email_notifications for the user
--    • If true → calls send-notification-email edge function via net.http_post()
--    • Uses net.http_post() (pg_net API) — NOT extensions.http_post()
--    • Never blocks the INSERT even if HTTP call fails
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_user_by_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email_enabled  boolean := false;
  v_functions_url  text;
  v_service_key    text;
BEGIN
  -- Skip if no user_id on the notification
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if this user wants email notifications
  SELECT COALESCE(email_notifications, false)
    INTO v_email_enabled
    FROM public.notification_preferences
   WHERE user_id = NEW.user_id
   LIMIT 1;

  IF NOT v_email_enabled THEN
    RETURN NEW;
  END IF;

  -- Get edge function URL from site_settings
  -- site_settings.value is JSONB, use #>>'{}'  to extract as plain text
  SELECT value #>> '{}'
    INTO v_functions_url
    FROM public.site_settings
   WHERE key = 'supabase_functions_url'
   LIMIT 1;

  -- Get service role key stored as a DB parameter
  -- Set once with: ALTER DATABASE postgres SET "app.service_role_key" = 'key';
  v_service_key := current_setting('app.service_role_key', true);

  -- Bail out gracefully if either config is missing
  IF v_functions_url IS NULL
     OR v_functions_url = ''
     OR v_service_key IS NULL
     OR v_service_key = ''
  THEN
    RETURN NEW;
  END IF;

  -- Fire-and-forget HTTP POST to the edge function via pg_net
  -- net.http_post() is async — it enqueues the request and returns immediately
  -- so it NEVER delays the triggering INSERT
  BEGIN
    PERFORM net.http_post(
      url     := v_functions_url || '/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body    := jsonb_build_object('notification_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    -- Silently swallow errors — never fail the INSERT
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 5. Create trigger (DROP + CREATE = idempotent)
-- ─────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_notify_user_by_email ON public.notifications;

CREATE TRIGGER trg_notify_user_by_email
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_by_email();

-- ─────────────────────────────────────────────────────────────────────
-- 6. RPC: send_test_notification_email
--    Admins call this to test email delivery for any notification
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.send_test_notification_email(p_notification_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role   text;
  v_functions_url text;
  v_service_key   text;
BEGIN
  -- Only admins can call this
  SELECT role INTO v_caller_role
    FROM public.profiles
   WHERE id = auth.uid()
   LIMIT 1;

  IF v_caller_role NOT IN ('admin', 'super_admin', 'founder') THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  SELECT value #>> '{}'
    INTO v_functions_url
    FROM public.site_settings
   WHERE key = 'supabase_functions_url'
   LIMIT 1;

  v_service_key := current_setting('app.service_role_key', true);

  IF v_functions_url IS NULL OR v_service_key IS NULL OR v_service_key = '' THEN
    RETURN jsonb_build_object(
      'error', 'Edge function URL or service key not configured',
      'hint',  'Run: ALTER DATABASE postgres SET "app.service_role_key" = ''your-key'';'
    );
  END IF;

  PERFORM net.http_post(
    url     := v_functions_url || '/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body    := jsonb_build_object('notification_id', p_notification_id)
  );

  RETURN jsonb_build_object('ok', true, 'notification_id', p_notification_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_test_notification_email(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 7. Register migration
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.schema_migrations (filename)
VALUES ('55_individual_email_trigger.sql')
ON CONFLICT (filename) DO NOTHING;
