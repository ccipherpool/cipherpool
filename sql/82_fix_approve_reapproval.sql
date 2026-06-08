-- ══════════════════════════════════════════════════════════════════════
-- sql/82 — Fix approve_reapproval: update by email, not by stale new_user_id
--
-- Root cause: approve_reapproval updates profiles WHERE id = new_user_id.
-- If new_user_id is stale (user re-registered multiple times, or profile
-- was cascade-deleted when the auth user was removed), the UPDATE matches
-- 0 rows silently. The function still returns {success:true} because there
-- is no GET DIAGNOSTICS / IF NOT FOUND check after the UPDATE.
--
-- Fix:
--   1. Try update by new_user_id (fast path, works for the normal case)
--   2. Fallback: update by email via JOIN to auth.users (immune to stale ids)
--   3. Close ALL pending requests for this email (handles duplicate requests)
--   4. Return rows_updated so the frontend can log and verify
-- ══════════════════════════════════════════════════════════════════════

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
  -- ── Auth check ────────────────────────────────────────────────────────
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('founder', 'fondateur', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- ── Fetch request ────────────────────────────────────────────────────
  SELECT * INTO v_req FROM public.reapproval_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;
  IF v_req.status NOT IN ('pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request already reviewed');
  END IF;

  -- ── Strategy 1: update by new_user_id (normal case) ──────────────────
  IF v_req.new_user_id IS NOT NULL THEN
    UPDATE public.profiles
       SET account_status = 'active', updated_at = now()
     WHERE id = v_req.new_user_id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
  END IF;

  -- ── Strategy 2: update by email via auth.users (stale-id fallback) ───
  -- Fires when new_user_id is NULL or points to a deleted/wrong profile.
  -- Covers: user re-registered multiple times, auth cascade deleted profile.
  IF v_rows = 0 THEN
    UPDATE public.profiles p
       SET account_status = 'active', updated_at = now()
      FROM auth.users u
     WHERE u.id          = p.id
       AND lower(u.email) = lower(v_req.email)
       AND p.account_status = 'pending_reapproval';

    GET DIAGNOSTICS v_rows = ROW_COUNT;
  END IF;

  -- ── Close ALL pending requests for this email ─────────────────────────
  -- User may have clicked register multiple times → duplicate pending rows.
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

-- ── Also fix reject_reapproval with the same email-based fallback ─────
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

  -- Fast path
  IF v_req.new_user_id IS NOT NULL THEN
    UPDATE public.profiles
       SET account_status = 'banned', updated_at = now()
     WHERE id = v_req.new_user_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
  END IF;

  -- Email fallback
  IF v_rows = 0 THEN
    UPDATE public.profiles p
       SET account_status = 'banned', updated_at = now()
      FROM auth.users u
     WHERE u.id          = p.id
       AND lower(u.email) = lower(v_req.email)
       AND p.account_status = 'pending_reapproval';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
  END IF;

  -- Close all pending requests for this email
  UPDATE public.reapproval_requests
     SET status      = 'rejected',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         review_note = p_note
   WHERE lower(email) = lower(v_req.email)
     AND status       = 'pending';

  RETURN jsonb_build_object('success', true, 'rows_updated', v_rows);
END;
$$;

-- ── Backfill: anyone currently approved in reapproval_requests but ────
-- whose profile is still pending_reapproval (from the broken old function)
UPDATE public.profiles p
   SET account_status = 'active', updated_at = now()
  FROM auth.users u
  JOIN public.reapproval_requests rr ON lower(rr.email) = lower(u.email)
 WHERE u.id    = p.id
   AND rr.status            = 'approved'
   AND p.account_status     = 'pending_reapproval';
