-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/86 Fix archive_and_delete_user RPC
-- Problem: the RPC uses auth.uid() for authorization checks, which is
--   NULL when called from a service-role edge function. This caused the
--   edge function's archive step to return "Unauthorized" and silently
--   skip soft-deletion and hard-deletion of the auth user.
-- Fix: accept an optional p_caller_id parameter so edge functions can
--   pass the authenticated admin's UUID directly.
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.archive_and_delete_user(
  p_user_id   uuid,
  p_reason    text DEFAULT NULL,
  p_caller_id uuid DEFAULT NULL   -- explicit caller ID for service-role callers
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_effective_caller uuid;
  v_caller_role      text;
  v_target_role      text;
  v_email            text;
  v_profile          jsonb;
BEGIN
  -- Use explicit caller ID (edge function) or fall back to auth.uid() (direct call)
  v_effective_caller := COALESCE(p_caller_id, auth.uid());

  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_effective_caller;
  IF v_caller_role NOT IN ('founder', 'fondateur', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT role INTO v_target_role FROM public.profiles WHERE id = p_user_id;
  IF (v_target_role = 'founder' OR v_target_role = 'fondateur')
     AND v_caller_role NOT IN ('founder', 'fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete a founder account');
  END IF;

  IF p_user_id = v_effective_caller THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete your own account');
  END IF;

  -- Get email from auth schema (SECURITY DEFINER runs as owner, has access to auth.users)
  SELECT lower(u.email) INTO v_email FROM auth.users u WHERE u.id = p_user_id;

  -- Snapshot full profile row
  SELECT to_jsonb(p) INTO v_profile FROM public.profiles p WHERE p.id = p_user_id;

  -- Archive to deleted_accounts
  INSERT INTO public.deleted_accounts (email, user_id, username, deleted_by, reason, profile_snapshot)
  SELECT
    COALESCE(v_email, ''),
    p_user_id,
    COALESCE(p.username, p.full_name),
    v_effective_caller,
    p_reason,
    COALESCE(v_profile, '{}')
  FROM public.profiles p
  WHERE p.id = p_user_id
  ON CONFLICT DO NOTHING;

  -- Soft-delete profile (triggers realtime subscription → force-logout on all clients)
  UPDATE public.profiles
     SET account_status = 'deleted', updated_at = now()
   WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'email', v_email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_and_delete_user(uuid, text, uuid) TO authenticated;
