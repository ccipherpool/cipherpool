-- ══════════════════════════════════════════════════════════════════════
-- sql/84 — Complete rejoin approval fix
--
-- Fixes three separate failure points:
--
--   1. approve_reapproval: UPDATE by new_user_id + email fallback (idempotent
--      over sql/82 — safe to run even if 82 was already applied)
--
--   2. check_and_heal_reapproval(): new SECURITY DEFINER RPC called by
--      AuthContext every time a pending_reapproval user loads their profile.
--      Bypasses RLS, checks by email (immune to stale new_user_id), heals
--      the profile if an approved request exists.
--
--   3. Backfill: immediately heal any profiles currently stuck in
--      pending_reapproval where an approved request already exists.
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Recreate approve_reapproval (idempotent over sql/82) ───────────
CREATE OR REPLACE FUNCTION public.approve_reapproval(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role  text;
  v_req          public.reapproval_requests%ROWTYPE;
  v_rows         int := 0;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('founder', 'fondateur', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_req FROM public.reapproval_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;
  IF v_req.status NOT IN ('pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request already reviewed');
  END IF;

  -- Strategy 1: update by new_user_id
  IF v_req.new_user_id IS NOT NULL THEN
    UPDATE public.profiles
       SET account_status = 'active', updated_at = now()
     WHERE id = v_req.new_user_id
       AND account_status = 'pending_reapproval';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
  END IF;

  -- Strategy 2: fallback by email (immune to stale new_user_id)
  IF v_rows = 0 THEN
    UPDATE public.profiles p
       SET account_status = 'active', updated_at = now()
      FROM auth.users u
     WHERE u.id          = p.id
       AND lower(u.email) = lower(v_req.email)
       AND p.account_status = 'pending_reapproval';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
  END IF;

  -- Close ALL pending requests for this email
  UPDATE public.reapproval_requests
     SET status      = 'approved',
         reviewed_by = auth.uid(),
         reviewed_at = now()
   WHERE lower(email) = lower(v_req.email)
     AND status       = 'pending';

  RETURN jsonb_build_object(
    'success',      true,
    'rows_updated', v_rows,
    'email',        v_req.email,
    'new_user_id',  v_req.new_user_id
  );
END;
$$;

-- ── 2. check_and_heal_reapproval() ────────────────────────────────────
-- Called from AuthContext when a user loads with account_status = pending_reapproval.
-- SECURITY DEFINER so it can read auth.users and update profiles regardless of RLS.
-- Returns: { healed: bool, approved: bool }
--   healed   = true → profile was just updated to 'active'
--   approved = true → an approved request exists (profile may already be active)
CREATE OR REPLACE FUNCTION public.check_and_heal_reapproval()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid;
  v_email      text;
  v_approved   boolean := false;
  v_rows       int     := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('healed', false, 'approved', false, 'error', 'Not authenticated');
  END IF;

  SELECT lower(u.email) INTO v_email FROM auth.users u WHERE u.id = v_user_id;
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('healed', false, 'approved', false, 'error', 'Email not found');
  END IF;

  -- Check if there is an approved reapproval request for this email
  SELECT EXISTS(
    SELECT 1 FROM public.reapproval_requests
    WHERE lower(email) = v_email AND status = 'approved'
  ) INTO v_approved;

  IF v_approved THEN
    UPDATE public.profiles
       SET account_status = 'active', updated_at = now()
     WHERE id             = v_user_id
       AND account_status = 'pending_reapproval';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'healed',   v_rows > 0,
    'approved', v_approved
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_heal_reapproval() TO authenticated;

-- ── 3. Immediate backfill: heal any currently stuck profiles ──────────
UPDATE public.profiles p
   SET account_status = 'active', updated_at = now()
  FROM auth.users u
  JOIN public.reapproval_requests rr
    ON lower(rr.email) = lower(u.email)
 WHERE u.id               = p.id
   AND rr.status          = 'approved'
   AND p.account_status   = 'pending_reapproval';

-- ── 4. Fix reject_reapproval with same email fallback (idempotent) ────
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
  v_rows        int := 0;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('founder', 'fondateur', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_req FROM public.reapproval_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  IF v_req.new_user_id IS NOT NULL THEN
    UPDATE public.profiles
       SET account_status = 'banned', updated_at = now()
     WHERE id = v_req.new_user_id AND account_status = 'pending_reapproval';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
  END IF;

  IF v_rows = 0 THEN
    UPDATE public.profiles p
       SET account_status = 'banned', updated_at = now()
      FROM auth.users u
     WHERE u.id          = p.id
       AND lower(u.email) = lower(v_req.email)
       AND p.account_status = 'pending_reapproval';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
  END IF;

  UPDATE public.reapproval_requests
     SET status      = 'rejected',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         review_note = p_note
   WHERE lower(email) = lower(v_req.email)
     AND status       IN ('pending');

  RETURN jsonb_build_object('success', true, 'rows_updated', v_rows);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_reapproval(uuid)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_reapproval(uuid, text)     TO authenticated;
