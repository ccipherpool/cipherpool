-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/65 Deleted Account Security System
-- Adds:
--   • profiles.account_status column
--   • deleted_accounts table (archive on deletion)
--   • reapproval_requests table (re-registration detection)
--   • Trigger: detect deleted email re-registering
--   • RPCs: approve_reapproval, reject_reapproval, permanently_ban_deleted_account
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. profiles.account_status
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';

-- Drop any old check on account_status if re-running
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.contype = 'c' AND t.relname = 'profiles' AND n.nspname = 'public'
      AND pg_get_constraintdef(c.oid) LIKE '%account_status%'
  LOOP
    EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_status_check
  CHECK (account_status IN ('active', 'deleted', 'pending_reapproval', 'banned'));

-- ─────────────────────────────────────────────────────────────────────
-- 2. deleted_accounts — permanent archive of removed users
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deleted_accounts (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 text        NOT NULL,
  user_id               uuid        NOT NULL,          -- original auth.users id
  username              text,
  deleted_by            uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_at            timestamptz NOT NULL DEFAULT now(),
  reason                text,
  profile_snapshot      jsonb       NOT NULL DEFAULT '{}',
  is_permanently_banned boolean     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS da_email_idx   ON public.deleted_accounts(lower(email));
CREATE INDEX IF NOT EXISTS da_user_id_idx ON public.deleted_accounts(user_id);
CREATE INDEX IF NOT EXISTS da_deleted_at  ON public.deleted_accounts(deleted_at DESC);

ALTER TABLE public.deleted_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_deleted_accounts" ON public.deleted_accounts;
CREATE POLICY "staff_read_deleted_accounts" ON public.deleted_accounts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','super_admin','founder')
    )
  );

DROP POLICY IF EXISTS "staff_insert_deleted_accounts" ON public.deleted_accounts;
CREATE POLICY "staff_insert_deleted_accounts" ON public.deleted_accounts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','super_admin','founder')
    )
  );

DROP POLICY IF EXISTS "staff_update_deleted_accounts" ON public.deleted_accounts;
CREATE POLICY "staff_update_deleted_accounts" ON public.deleted_accounts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','super_admin','founder')
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- 3. reapproval_requests — when a deleted email re-registers
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reapproval_requests (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_account_id   uuid        REFERENCES public.deleted_accounts(id) ON DELETE CASCADE,
  new_user_id          uuid,                           -- new auth.users id after re-registration
  email                text        NOT NULL,
  status               text        NOT NULL DEFAULT 'pending',
  requested_at         timestamptz NOT NULL DEFAULT now(),
  reviewed_by          uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at          timestamptz,
  review_note          text
);

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.contype = 'c' AND t.relname = 'reapproval_requests' AND n.nspname = 'public'
      AND pg_get_constraintdef(c.oid) LIKE '%status%'
  LOOP
    EXECUTE 'ALTER TABLE public.reapproval_requests DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.reapproval_requests
  ADD CONSTRAINT rr_status_check
  CHECK (status IN ('pending','approved','rejected','banned'));

CREATE INDEX IF NOT EXISTS rr_email_idx     ON public.reapproval_requests(email);
CREATE INDEX IF NOT EXISTS rr_status_idx    ON public.reapproval_requests(status);
CREATE INDEX IF NOT EXISTS rr_new_user_idx  ON public.reapproval_requests(new_user_id);

ALTER TABLE public.reapproval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_reapproval" ON public.reapproval_requests;
CREATE POLICY "staff_read_reapproval" ON public.reapproval_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','super_admin','founder')
    )
  );

DROP POLICY IF EXISTS "staff_update_reapproval" ON public.reapproval_requests;
CREATE POLICY "staff_update_reapproval" ON public.reapproval_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','super_admin','founder')
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- 4. Trigger: detect re-registration of deleted/banned emails
--    Fires BEFORE INSERT on profiles — runs in same txn as auth user creation
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_deleted_account_on_register()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email        text;
  v_deleted      public.deleted_accounts%ROWTYPE;
BEGIN
  -- Resolve email from auth.users
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = NEW.id;
  IF v_email IS NULL THEN RETURN NEW; END IF;

  -- Permanently banned → block immediately
  SELECT * INTO v_deleted FROM public.deleted_accounts
  WHERE lower(email) = v_email AND is_permanently_banned = true
  ORDER BY deleted_at DESC LIMIT 1;

  IF FOUND THEN
    NEW.account_status := 'banned';
    RETURN NEW;
  END IF;

  -- Previously deleted (not permanently banned) → pending reapproval
  SELECT * INTO v_deleted FROM public.deleted_accounts
  WHERE lower(email) = v_email AND is_permanently_banned = false
  ORDER BY deleted_at DESC LIMIT 1;

  IF FOUND THEN
    NEW.account_status := 'pending_reapproval';

    -- Record the reapproval request
    INSERT INTO public.reapproval_requests (deleted_account_id, new_user_id, email)
    VALUES (v_deleted.id, NEW.id, v_email)
    ON CONFLICT DO NOTHING;

    -- Notify all founders
    INSERT INTO public.notifications (user_id, type, title, body, data)
    SELECT p.id,
           'system',
           'Deleted Account Re-registration',
           'Previously deleted email ' || v_email || ' is requesting access again.',
           jsonb_build_object(
             'email',              v_email,
             'new_user_id',        NEW.id,
             'deleted_account_id', v_deleted.id
           )
    FROM public.profiles p
    WHERE p.role IN ('founder','super_admin');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_deleted_on_register ON public.profiles;
CREATE TRIGGER trg_check_deleted_on_register
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_deleted_account_on_register();

-- ─────────────────────────────────────────────────────────────────────
-- 5. approve_reapproval(request_id)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.approve_reapproval(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_req         public.reapproval_requests%ROWTYPE;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('founder','super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_req FROM public.reapproval_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;
  IF v_req.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request already reviewed');
  END IF;

  -- Activate account
  UPDATE public.profiles
     SET account_status = 'active', updated_at = now()
   WHERE id = v_req.new_user_id;

  -- Mark request
  UPDATE public.reapproval_requests
     SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
   WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true, 'user_id', v_req.new_user_id);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 6. reject_reapproval(request_id, note?)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reject_reapproval(
  p_request_id uuid,
  p_note       text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_req         public.reapproval_requests%ROWTYPE;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('founder','super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_req FROM public.reapproval_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  -- Block the account
  UPDATE public.profiles
     SET account_status = 'banned', updated_at = now()
   WHERE id = v_req.new_user_id;

  UPDATE public.reapproval_requests
     SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note
   WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 7. permanently_ban_deleted_account(deleted_account_id)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.permanently_ban_deleted_account(p_deleted_account_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('founder','super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  UPDATE public.deleted_accounts
     SET is_permanently_banned = true
   WHERE id = p_deleted_account_id;

  -- Ban any live pending accounts linked to this record
  UPDATE public.profiles p
     SET account_status = 'banned', updated_at = now()
    FROM public.reapproval_requests r
   WHERE r.deleted_account_id = p_deleted_account_id
     AND r.new_user_id = p.id
     AND r.status = 'pending';

  UPDATE public.reapproval_requests
     SET status = 'banned', reviewed_by = auth.uid(), reviewed_at = now()
   WHERE deleted_account_id = p_deleted_account_id AND status = 'pending';

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 8. archive_and_delete_user(user_id, reason) — called by edge function
--    Archives profile data to deleted_accounts, then soft-deletes profile.
--    Auth user deletion is handled separately by the edge function.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.archive_and_delete_user(
  p_user_id  uuid,
  p_reason   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role  text;
  v_target_role  text;
  v_email        text;
  v_profile      jsonb;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('founder','super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT role INTO v_target_role FROM public.profiles WHERE id = p_user_id;
  IF v_target_role = 'founder' AND v_caller_role != 'founder' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete a founder account');
  END IF;

  IF p_user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete your own account');
  END IF;

  -- Get email from auth schema
  SELECT lower(u.email) INTO v_email FROM auth.users u WHERE u.id = p_user_id;

  -- Snapshot full profile row
  SELECT to_jsonb(p) INTO v_profile FROM public.profiles p WHERE p.id = p_user_id;

  -- Archive
  INSERT INTO public.deleted_accounts (email, user_id, username, deleted_by, reason, profile_snapshot)
  SELECT
    COALESCE(v_email, ''),
    p_user_id,
    COALESCE(p.username, p.full_name),
    auth.uid(),
    p_reason,
    COALESCE(v_profile, '{}')
  FROM public.profiles p
  WHERE p.id = p_user_id
  ON CONFLICT DO NOTHING;

  -- Soft-delete profile (may cascade-delete when auth user is deleted)
  UPDATE public.profiles
     SET account_status = 'deleted', updated_at = now()
   WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'email', v_email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_reapproval(uuid)                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_reapproval(uuid, text)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.permanently_ban_deleted_account(uuid)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_and_delete_user(uuid, text)        TO authenticated;
