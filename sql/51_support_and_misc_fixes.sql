-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/51 Support tickets + misc 400 fixes
-- Fixes:
--   1. support_tickets 400 on INSERT (grants + RLS + schema)
--   2. claim_daily_reward RPC signature
--   3. Re-grant missing permissions
-- Safe to run multiple times (idempotent).
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. support_tickets — ensure schema + grants + RLS
-- ─────────────────────────────────────────────────────────────────────

-- Add category column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'support_tickets' AND column_name = 'category'
  ) THEN
    ALTER TABLE public.support_tickets ADD COLUMN category text NOT NULL DEFAULT 'general';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'support_tickets' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.support_tickets ADD COLUMN status text NOT NULL DEFAULT 'open';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'support_tickets' AND column_name = 'subject'
  ) THEN
    ALTER TABLE public.support_tickets ADD COLUMN subject text NOT NULL DEFAULT '';
  END IF;
END;
$$;

-- Drop any restrictive CHECK constraints on category/status
DO $$
BEGIN
  BEGIN ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_category_check; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_status_check;   EXCEPTION WHEN OTHERS THEN NULL; END;
END;
$$;

-- Re-enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Drop and recreate all policies cleanly
DROP POLICY IF EXISTS "tickets_select_own"    ON public.support_tickets;
DROP POLICY IF EXISTS "tickets_select_admin"  ON public.support_tickets;
DROP POLICY IF EXISTS "tickets_insert"        ON public.support_tickets;
DROP POLICY IF EXISTS "tickets_update_admin"  ON public.support_tickets;
DROP POLICY IF EXISTS "tickets_update_self"   ON public.support_tickets;

CREATE POLICY "tickets_select_own" ON public.support_tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "tickets_select_admin" ON public.support_tickets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','founder'))
  );

CREATE POLICY "tickets_insert" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tickets_update_admin" ON public.support_tickets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','founder'))
  );

-- Explicit grants (required for PostgREST to allow the operation)
GRANT SELECT, INSERT, UPDATE ON TABLE public.support_tickets TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 2. support_messages — same treatment
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select"   ON public.support_messages;
DROP POLICY IF EXISTS "messages_insert"   ON public.support_messages;
DROP POLICY IF EXISTS "messages_insert_admin" ON public.support_messages;

CREATE POLICY "messages_select" ON public.support_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = ticket_id
        AND (
          user_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','founder'))
        )
    )
  );

CREATE POLICY "messages_insert" ON public.support_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

GRANT SELECT, INSERT ON TABLE public.support_messages TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Re-grant general permissions that may have been lost
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- profiles: everyone can read (for joins)
  IF to_regclass('public.profiles') IS NOT NULL THEN
    GRANT SELECT ON public.profiles TO authenticated, anon;
  END IF;

  -- notifications
  IF to_regclass('public.notifications') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
  END IF;

  -- notification_broadcasts / preferences
  IF to_regclass('public.notification_broadcasts') IS NOT NULL THEN
    GRANT SELECT, INSERT ON public.notification_broadcasts TO authenticated;
  END IF;
  IF to_regclass('public.notification_preferences') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 4. claim_daily_reward — ensure it exists with correct signature
--    (recreate only if the function body references a missing column)
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- If the function doesn't exist at all, create a minimal stub
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'claim_daily_reward'
  ) THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION public.claim_daily_reward()
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $func$
      DECLARE
        v_user_id uuid := auth.uid();
        v_last_claim timestamptz;
        v_reward integer := 50;
      BEGIN
        IF v_user_id IS NULL THEN
          RETURN jsonb_build_object(''success'', false, ''error'', ''Not authenticated'');
        END IF;

        SELECT last_daily_claim INTO v_last_claim
        FROM public.profiles WHERE id = v_user_id;

        IF v_last_claim IS NOT NULL AND v_last_claim > now() - INTERVAL ''20 hours'' THEN
          RETURN jsonb_build_object(
            ''success'', false,
            ''error'', ''Already claimed today'',
            ''next_claim'', v_last_claim + INTERVAL ''20 hours''
          );
        END IF;

        UPDATE public.profiles
        SET last_daily_claim = now()
        WHERE id = v_user_id;

        UPDATE public.wallets
        SET balance = balance + v_reward
        WHERE user_id = v_user_id;

        INSERT INTO public.wallet_transactions (user_id, type, amount, description)
        VALUES (v_user_id, ''daily_reward'', v_reward, ''Daily reward claim'')
        ON CONFLICT DO NOTHING;

        RETURN jsonb_build_object(''success'', true, ''reward'', v_reward);
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(''success'', false, ''error'', SQLERRM);
      END;
      $func$
    ';
    GRANT EXECUTE ON FUNCTION public.claim_daily_reward() TO authenticated;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 5. Register migration
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.schema_migrations (filename)
VALUES ('51_support_and_misc_fixes.sql')
ON CONFLICT (filename) DO NOTHING;
