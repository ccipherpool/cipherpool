-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/71  Fix fondateur role permissions
--
-- ROOT CAUSES:
--
-- 1. reapproval_requests RLS — staff_read_reapproval policy allows
--    role IN ('admin','super_admin','founder') but not 'fondateur'.
--    A fondateur user receives 403 on every HEAD/GET to that table.
--    Browser shows: HEAD /rest/v1/reapproval_requests 403 Forbidden
--
-- 2. deleted_accounts RLS — same issue on the read policy.
--
-- 3. archive_and_delete_user() RPC — permission guard only allows
--    ('founder','super_admin'); rejects fondateur with 'Unauthorized'.
--    The Edge Function therefore fails at step 7 even when CORS passes.
--
-- 4. approve_reapproval, reject_reapproval, permanently_ban RPCs —
--    same guard pattern, same exclusion of fondateur.
--
-- FIX:
--   Treat fondateur as equivalent to founder throughout.
--   Drop and recreate each affected RLS policy with fondateur added.
--   Recreate each affected RPC with fondateur in the role check.
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. reapproval_requests — SELECT policy ────────────────────────────
DROP POLICY IF EXISTS "staff_read_reapproval" ON public.reapproval_requests;
CREATE POLICY "staff_read_reapproval" ON public.reapproval_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'founder', 'fondateur')
    )
  );

-- ── 2. reapproval_requests — UPDATE policy ────────────────────────────
DROP POLICY IF EXISTS "staff_update_reapproval" ON public.reapproval_requests;
CREATE POLICY "staff_update_reapproval" ON public.reapproval_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'founder', 'fondateur')
    )
  );

-- ── 3. deleted_accounts — SELECT policy ──────────────────────────────
-- Recreate with fondateur added (original only had admin/super_admin/founder)
DROP POLICY IF EXISTS "staff_read_deleted"   ON public.deleted_accounts;
DROP POLICY IF EXISTS "staff_select_deleted" ON public.deleted_accounts;
CREATE POLICY "staff_read_deleted" ON public.deleted_accounts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'founder', 'fondateur')
    )
  );

-- ── 4. deleted_accounts — any other restrictive policies ─────────────
DROP POLICY IF EXISTS "staff_insert_deleted" ON public.deleted_accounts;
CREATE POLICY "staff_insert_deleted" ON public.deleted_accounts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('super_admin', 'founder', 'fondateur')
    )
  );

-- ══════════════════════════════════════════════════════════════════════
-- 5. archive_and_delete_user — add fondateur to permission check
-- ══════════════════════════════════════════════════════════════════════
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
  IF v_caller_role NOT IN ('founder', 'fondateur', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error',
      format('Unauthorized: role "%s" cannot delete users', COALESCE(v_caller_role, 'NULL')));
  END IF;

  SELECT role INTO v_target_role FROM public.profiles WHERE id = p_user_id;

  -- Only a founder/fondateur can delete another founder/fondateur
  IF v_target_role IN ('founder', 'fondateur')
     AND v_caller_role NOT IN ('founder', 'fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete a founder account');
  END IF;

  IF p_user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete your own account');
  END IF;

  -- Capture email from auth schema
  SELECT lower(u.email) INTO v_email FROM auth.users u WHERE u.id = p_user_id;

  -- Snapshot full profile row
  SELECT to_jsonb(p) INTO v_profile FROM public.profiles p WHERE p.id = p_user_id;

  -- Archive to deleted_accounts
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

  -- Soft-delete profile (edge function deletes auth.users separately)
  UPDATE public.profiles
     SET account_status = 'deleted', updated_at = now()
   WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'email', v_email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_and_delete_user(uuid, text) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- 6. approve_reapproval — add fondateur
-- ══════════════════════════════════════════════════════════════════════
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
  IF v_caller_role NOT IN ('founder', 'fondateur', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_req FROM public.reapproval_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;
  IF v_req.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request already reviewed');
  END IF;

  UPDATE public.profiles
     SET account_status = 'active', updated_at = now()
   WHERE id = v_req.new_user_id;

  UPDATE public.reapproval_requests
     SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
   WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true, 'user_id', v_req.new_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_reapproval(uuid) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- 7. reject_reapproval — add fondateur
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.reject_reapproval(p_request_id uuid, p_note text DEFAULT NULL)
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
  IF v_caller_role NOT IN ('founder', 'fondateur', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_req FROM public.reapproval_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  UPDATE public.profiles
     SET account_status = 'banned', updated_at = now()
   WHERE id = v_req.new_user_id;

  UPDATE public.reapproval_requests
     SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note
   WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_reapproval(uuid, text) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- 8. permanently_ban_deleted_account — add fondateur
-- ══════════════════════════════════════════════════════════════════════
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
  IF v_caller_role NOT IN ('founder', 'fondateur', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  UPDATE public.deleted_accounts
     SET permanently_banned = true, updated_at = now()
   WHERE id = p_deleted_account_id;

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

GRANT EXECUTE ON FUNCTION public.permanently_ban_deleted_account(uuid) TO authenticated;

-- ── Verify ────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'OK: sql/71 applied.';
  RAISE NOTICE '  fondateur role now has access to:';
  RAISE NOTICE '    - reapproval_requests (SELECT, UPDATE)';
  RAISE NOTICE '    - deleted_accounts (SELECT, INSERT)';
  RAISE NOTICE '    - archive_and_delete_user()';
  RAISE NOTICE '    - approve_reapproval()';
  RAISE NOTICE '    - reject_reapproval()';
  RAISE NOTICE '    - permanently_ban_deleted_account()';
END;
$$;
