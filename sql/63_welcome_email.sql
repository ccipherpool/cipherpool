-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/63 Welcome Email System
-- Adds:
--   • profiles.welcome_email_sent boolean
--   • email_logs table (general email delivery log)
--   • email_templates table (editable from SuperAdmin)
--   • send_welcome_email() trigger function
--   • trg_welcome_email trigger on profiles INSERT
--
-- Requires pg_net + app.service_role_key DB param (see sql/55)
-- Safe to re-run.
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. Add welcome_email_sent to profiles
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'welcome_email_sent'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN welcome_email_sent boolean NOT NULL DEFAULT false;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 2. email_logs table
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  email      text        NOT NULL,
  template   text        NOT NULL,
  status     text        NOT NULL DEFAULT 'pending',
  metadata   jsonb,
  sent_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_logs_user_idx     ON public.email_logs(user_id);
CREATE INDEX IF NOT EXISTS email_logs_template_idx ON public.email_logs(template);
CREATE INDEX IF NOT EXISTS email_logs_status_idx   ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS email_logs_sent_at_idx  ON public.email_logs(sent_at DESC);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_email_logs" ON public.email_logs;
CREATE POLICY "staff_read_email_logs" ON public.email_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'founder')
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- 3. email_templates table
--    DROP first so we always get the correct schema (table has no
--    production data — it is brand-new from this migration).
-- ─────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.email_templates CASCADE;

CREATE TABLE public.email_templates (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text        UNIQUE NOT NULL,
  name        text        NOT NULL,
  subject     text        NOT NULL,
  title       text,
  content     text,
  cta_label   text,
  cta_url     text,
  is_active   boolean     NOT NULL DEFAULT true,
  updated_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed default welcome template
INSERT INTO public.email_templates (slug, name, subject, title, content, cta_label, cta_url)
VALUES (
  'welcome',
  'Welcome Email',
  '🎮 Welcome to CipherPool – Your Journey Starts Now',
  'Welcome to CipherPool!',
  'Your email has been verified and your CipherPool account is now active. You are officially part of the CipherPool competitive gaming community.',
  'ENTER ARENA',
  '/arena'
)
ON CONFLICT (slug) DO NOTHING;

-- RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_read_email_templates" ON public.email_templates;
CREATE POLICY "anyone_read_email_templates" ON public.email_templates
  FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "staff_write_email_templates" ON public.email_templates;
CREATE POLICY "staff_write_email_templates" ON public.email_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'founder')
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- 4. Trigger function: fire welcome email on profiles INSERT
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_functions_url text;
  v_service_key   text;
BEGIN
  SELECT value #>> '{}'
    INTO v_functions_url
    FROM public.site_settings
   WHERE key = 'supabase_functions_url'
   LIMIT 1;

  v_service_key := current_setting('app.service_role_key', true);

  IF v_functions_url IS NULL OR v_functions_url = ''
     OR v_service_key IS NULL OR v_service_key = ''
  THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url     := v_functions_url || '/send-welcome-email',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body    := jsonb_build_object('user_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 5. Attach trigger
-- ─────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_welcome_email ON public.profiles;
CREATE TRIGGER trg_welcome_email
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_email();

-- ─────────────────────────────────────────────────────────────────────
-- 6. Admin RPC: resend_welcome_email(user_id)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resend_welcome_email(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role   text;
  v_functions_url text;
  v_service_key   text;
  v_req_id        bigint;
BEGIN
  SELECT role INTO v_caller_role
    FROM public.profiles
   WHERE id = auth.uid();

  IF v_caller_role NOT IN ('admin', 'super_admin', 'founder') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  UPDATE public.profiles
     SET welcome_email_sent = false
   WHERE id = p_user_id;

  SELECT value #>> '{}' INTO v_functions_url
    FROM public.site_settings
   WHERE key = 'supabase_functions_url' LIMIT 1;

  v_service_key := current_setting('app.service_role_key', true);

  IF v_functions_url IS NULL OR v_service_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Edge function URL not configured');
  END IF;

  SELECT net.http_post(
    url     := v_functions_url || '/send-welcome-email',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body    := jsonb_build_object('user_id', p_user_id)
  ) INTO v_req_id;

  RETURN jsonb_build_object('success', true, 'request_id', v_req_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.resend_welcome_email(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 7. Grants
-- ─────────────────────────────────────────────────────────────────────
GRANT SELECT ON public.email_logs      TO authenticated;
GRANT SELECT ON public.email_templates TO authenticated;
GRANT ALL    ON public.email_logs      TO service_role;
GRANT ALL    ON public.email_templates TO service_role;
