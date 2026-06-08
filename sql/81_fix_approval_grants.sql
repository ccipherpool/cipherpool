-- ══════════════════════════════════════════════════════════════════════
-- sql/81 — Fix 403 on reapproval_requests & deleted_accounts
--
-- Root cause: both tables have RLS policies but are missing table-level
-- GRANT statements. Supabase REST API checks GRANT before running RLS,
-- so every request returns 403 even for super_admin users.
-- This is the same class of bug fixed in sql/79 for whatsapp_verification_codes.
-- ══════════════════════════════════════════════════════════════════════

-- ── reapproval_requests ───────────────────────────────────────────────
GRANT ALL ON TABLE public.reapproval_requests
  TO postgres, anon, authenticated, service_role;

-- ── deleted_accounts ──────────────────────────────────────────────────
GRANT ALL ON TABLE public.deleted_accounts
  TO postgres, anon, authenticated, service_role;

-- ── Ensure trigger function runs with correct search path ─────────────
-- (re-run to pick up any schema changes since sql/65)
CREATE OR REPLACE FUNCTION public.check_deleted_account_on_register()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email   text;
  v_deleted public.deleted_accounts%ROWTYPE;
BEGIN
  -- Resolve caller's email from auth.users
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = NEW.id;
  IF v_email IS NULL THEN RETURN NEW; END IF;

  -- Permanently banned → block immediately, no reapproval possible
  SELECT * INTO v_deleted
  FROM public.deleted_accounts
  WHERE lower(email) = v_email AND is_permanently_banned = true
  ORDER BY deleted_at DESC LIMIT 1;

  IF FOUND THEN
    NEW.account_status := 'banned';
    RETURN NEW;
  END IF;

  -- Previously deleted (not permanently banned) → require reapproval
  SELECT * INTO v_deleted
  FROM public.deleted_accounts
  WHERE lower(email) = v_email AND is_permanently_banned = false
  ORDER BY deleted_at DESC LIMIT 1;

  IF FOUND THEN
    NEW.account_status := 'pending_reapproval';

    -- Record the reapproval request (ignore if duplicate)
    INSERT INTO public.reapproval_requests (deleted_account_id, new_user_id, email)
    VALUES (v_deleted.id, NEW.id, v_email)
    ON CONFLICT DO NOTHING;

    -- Notify founders + super_admins
    INSERT INTO public.notifications (user_id, type, title, body, data)
    SELECT
      p.id,
      'system',
      'Rejoin Request',
      'Previously deleted email ' || v_email || ' is requesting access again.',
      jsonb_build_object(
        'email',              v_email,
        'new_user_id',        NEW.id,
        'deleted_account_id', v_deleted.id
      )
    FROM public.profiles p
    WHERE p.role IN ('founder', 'fondateur', 'super_admin');
  END IF;

  -- First-time email: account_status stays at DEFAULT 'active'
  RETURN NEW;
END;
$$;

-- Ensure trigger is attached (idempotent)
DROP TRIGGER IF EXISTS trg_check_deleted_on_register ON public.profiles;
CREATE TRIGGER trg_check_deleted_on_register
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_deleted_account_on_register();

-- ── Backfill: fix any stuck pending_reapproval profiles that have ─────
-- no matching reapproval_request (can happen after a partial wipe)
-- Sets them back to active so they're not permanently blocked.
UPDATE public.profiles p
SET    account_status = 'active'
WHERE  p.account_status = 'pending_reapproval'
AND    NOT EXISTS (
  SELECT 1 FROM public.reapproval_requests r
  WHERE  r.new_user_id = p.id AND r.status = 'pending'
);
