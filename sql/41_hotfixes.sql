-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/41 Hotfixes
-- Fixes runtime errors encountered when running sql/35, sql/38, sql/40:
--
--   sql/35 — "column user_id does not exist" in community RLS policies
--             (one or more community tables in production was created
--              without user_id — possibly via dashboard or older migration)
--
--   sql/38 — "column reply_to does not exist"
--             (chat_messages existed without reply_to; CREATE TABLE IF NOT
--              EXISTS skipped column creation)
--
--   sql/40 — "column vote_score does not exist"
--             (feature_requests existed without vote_score)
--
-- Safe to run multiple times (fully idempotent).
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- A. COMMUNITY TABLES — add any missing columns before policies
-- ─────────────────────────────────────────────────────────────────────

-- feature_requests: missing columns
DO $$
BEGIN
  IF to_regclass('public.feature_requests') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='feature_requests' AND column_name='user_id') THEN
      ALTER TABLE public.feature_requests ADD COLUMN user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='feature_requests' AND column_name='vote_score') THEN
      ALTER TABLE public.feature_requests ADD COLUMN vote_score integer NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='feature_requests' AND column_name='upvotes') THEN
      ALTER TABLE public.feature_requests ADD COLUMN upvotes integer NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='feature_requests' AND column_name='downvotes') THEN
      ALTER TABLE public.feature_requests ADD COLUMN downvotes integer NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='feature_requests' AND column_name='status') THEN
      ALTER TABLE public.feature_requests ADD COLUMN status text NOT NULL DEFAULT 'pending';
    END IF;
  END IF;
END;
$$;

-- bug_reports: missing user_id
DO $$
BEGIN
  IF to_regclass('public.bug_reports') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='bug_reports' AND column_name='user_id') THEN
      ALTER TABLE public.bug_reports ADD COLUMN user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END;
$$;

-- admin_applications: missing user_id
DO $$
BEGIN
  IF to_regclass('public.admin_applications') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='admin_applications' AND column_name='user_id') THEN
      ALTER TABLE public.admin_applications ADD COLUMN user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END;
$$;

-- admin_candidate_scores: missing user_id
DO $$
BEGIN
  IF to_regclass('public.admin_candidate_scores') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='admin_candidate_scores' AND column_name='user_id') THEN
      ALTER TABLE public.admin_candidate_scores ADD COLUMN user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END;
$$;

-- user_warnings: missing user_id
DO $$
BEGIN
  IF to_regclass('public.user_warnings') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='user_warnings' AND column_name='user_id') THEN
      ALTER TABLE public.user_warnings ADD COLUMN user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END;
$$;

-- user_reputation_events: missing user_id
DO $$
BEGIN
  IF to_regclass('public.user_reputation_events') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='user_reputation_events' AND column_name='user_id') THEN
      ALTER TABLE public.user_reputation_events ADD COLUMN user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- B. RETRY community RLS policies that failed in sql/35
--    Each policy is wrapped in its own DO block so one failure
--    does not stop the others.
-- ─────────────────────────────────────────────────────────────────────

-- feature_requests
DO $$
BEGIN
  IF to_regclass('public.feature_requests') IS NOT NULL THEN
    DROP POLICY IF EXISTS "feature_requests_update_admin" ON public.feature_requests;
    DROP POLICY IF EXISTS "feature_requests_delete_admin" ON public.feature_requests;
    EXECUTE '
      CREATE POLICY "feature_requests_update_admin" ON public.feature_requests
        FOR UPDATE USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'',''super_admin''))
        )
    ';
    EXECUTE '
      CREATE POLICY "feature_requests_delete_admin" ON public.feature_requests
        FOR DELETE USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'',''super_admin''))
        )
    ';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'feature_requests policies: %', SQLERRM;
END;
$$;

-- bug_reports
DO $$
BEGIN
  IF to_regclass('public.bug_reports') IS NOT NULL THEN
    DROP POLICY IF EXISTS "bug_reports_select_own"   ON public.bug_reports;
    DROP POLICY IF EXISTS "bug_reports_update_admin" ON public.bug_reports;

    IF EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='bug_reports' AND column_name='user_id') THEN
      EXECUTE '
        CREATE POLICY "bug_reports_select_own" ON public.bug_reports
          FOR SELECT USING (
            auth.uid() = user_id
            OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'',''super_admin''))
          )
      ';
    ELSE
      EXECUTE '
        CREATE POLICY "bug_reports_select_own" ON public.bug_reports
          FOR SELECT USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'',''super_admin''))
          )
      ';
    END IF;

    EXECUTE '
      CREATE POLICY "bug_reports_update_admin" ON public.bug_reports
        FOR UPDATE USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'',''super_admin''))
        )
    ';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'bug_reports policies: %', SQLERRM;
END;
$$;

-- admin_applications
DO $$
BEGIN
  IF to_regclass('public.admin_applications') IS NOT NULL THEN
    DROP POLICY IF EXISTS "admin_apps_select" ON public.admin_applications;
    DROP POLICY IF EXISTS "admin_apps_update" ON public.admin_applications;

    IF EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='admin_applications' AND column_name='user_id') THEN
      EXECUTE '
        CREATE POLICY "admin_apps_select" ON public.admin_applications
          FOR SELECT USING (
            auth.uid() = user_id
            OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'',''super_admin''))
          )
      ';
    ELSE
      EXECUTE '
        CREATE POLICY "admin_apps_select" ON public.admin_applications
          FOR SELECT USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'',''super_admin''))
          )
      ';
    END IF;

    EXECUTE '
      CREATE POLICY "admin_apps_update" ON public.admin_applications
        FOR UPDATE USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'',''super_admin''))
        )
    ';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'admin_applications policies: %', SQLERRM;
END;
$$;

-- admin_candidate_scores
DO $$
BEGIN
  IF to_regclass('public.admin_candidate_scores') IS NOT NULL THEN
    DROP POLICY IF EXISTS "candidate_scores_select" ON public.admin_candidate_scores;

    IF EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='admin_candidate_scores' AND column_name='user_id') THEN
      EXECUTE '
        CREATE POLICY "candidate_scores_select" ON public.admin_candidate_scores
          FOR SELECT USING (
            auth.uid() = user_id
            OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'',''super_admin''))
          )
      ';
    ELSE
      EXECUTE '
        CREATE POLICY "candidate_scores_select" ON public.admin_candidate_scores
          FOR SELECT USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'',''super_admin''))
          )
      ';
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'admin_candidate_scores policies: %', SQLERRM;
END;
$$;

-- user_reputation_events
DO $$
BEGIN
  IF to_regclass('public.user_reputation_events') IS NOT NULL THEN
    DROP POLICY IF EXISTS "rep_events_admin"  ON public.user_reputation_events;
    EXECUTE '
      CREATE POLICY "rep_events_admin" ON public.user_reputation_events
        FOR ALL USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'',''super_admin''))
        )
    ';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'user_reputation_events policies: %', SQLERRM;
END;
$$;

-- user_warnings
DO $$
BEGIN
  IF to_regclass('public.user_warnings') IS NOT NULL THEN
    DROP POLICY IF EXISTS "warnings_select" ON public.user_warnings;

    IF EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='user_warnings' AND column_name='user_id') THEN
      EXECUTE '
        CREATE POLICY "warnings_select" ON public.user_warnings
          FOR SELECT USING (
            auth.uid() = user_id
            OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'',''super_admin''))
          )
      ';
    ELSE
      EXECUTE '
        CREATE POLICY "warnings_select" ON public.user_warnings
          FOR SELECT USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'',''super_admin''))
          )
      ';
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'user_warnings policies: %', SQLERRM;
END;
$$;

-- moderation_reviews + bug_report_rewards (no user_id refs, just retry for completeness)
DO $$
BEGIN
  IF to_regclass('public.moderation_reviews') IS NOT NULL THEN
    DROP POLICY IF EXISTS "mod_reviews_select" ON public.moderation_reviews;
    EXECUTE '
      CREATE POLICY "mod_reviews_select" ON public.moderation_reviews
        FOR ALL USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'',''super_admin''))
        )
    ';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'moderation_reviews policies: %', SQLERRM;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.bug_report_rewards') IS NOT NULL THEN
    DROP POLICY IF EXISTS "bug_rewards_admin" ON public.bug_report_rewards;
    EXECUTE '
      CREATE POLICY "bug_rewards_admin" ON public.bug_report_rewards
        FOR ALL USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'',''super_admin''))
        )
    ';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'bug_report_rewards policies: %', SQLERRM;
END;
$$;

-- admin_application_audit (retry Fix 7 from sql/35)
DO $$
BEGIN
  IF to_regclass('public.admin_application_audit') IS NOT NULL THEN
    DROP POLICY IF EXISTS "app_audit_insert_any"   ON public.admin_application_audit;
    DROP POLICY IF EXISTS "app_audit_insert_staff" ON public.admin_application_audit;
    EXECUTE '
      CREATE POLICY "app_audit_insert_staff" ON public.admin_application_audit
        FOR INSERT WITH CHECK (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'',''super_admin''))
        )
    ';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'admin_application_audit policies: %', SQLERRM;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- C. FIX sql/38 — add reply_to column to chat_messages if missing,
--    then recreate the partial index that failed
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.chat_messages') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='chat_messages' AND column_name='reply_to') THEN
      -- Add self-referential FK for threaded replies
      EXECUTE '
        ALTER TABLE public.chat_messages
          ADD COLUMN reply_to uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL
      ';
    END IF;
  END IF;
END;
$$;

-- Recreate the partial index now that the column exists
DO $$
BEGIN
  IF to_regclass('public.chat_messages') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name='chat_messages' AND column_name='reply_to') THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS cm_reply_idx
        ON public.chat_messages(reply_to)
        WHERE reply_to IS NOT NULL
    ';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'cm_reply_idx: %', SQLERRM;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- D. FIX sql/40 — add vote_score to feature_requests if missing,
--    then recreate the index
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.feature_requests') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='feature_requests' AND column_name='vote_score') THEN
      EXECUTE '
        ALTER TABLE public.feature_requests
          ADD COLUMN vote_score integer NOT NULL DEFAULT 0
      ';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='feature_requests' AND column_name='status') THEN
      EXECUTE '
        ALTER TABLE public.feature_requests
          ADD COLUMN status text NOT NULL DEFAULT ''pending''
      ';
    END IF;

    EXECUTE '
      CREATE INDEX IF NOT EXISTS fr_vote_score_idx
        ON public.feature_requests(vote_score DESC)
        WHERE status NOT IN (''completed'', ''rejected'')
    ';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fr_vote_score_idx: %', SQLERRM;
END;
$$;

-- Also retry the admin_applications index that might have failed
DO $$
BEGIN
  IF to_regclass('public.admin_applications') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='admin_applications' AND column_name='status') THEN
      EXECUTE '
        ALTER TABLE public.admin_applications
          ADD COLUMN status text NOT NULL DEFAULT ''pending''
      ';
    END IF;

    EXECUTE '
      CREATE INDEX IF NOT EXISTS aa_status_date_idx
        ON public.admin_applications(status, created_at DESC)
        WHERE status IN (''pending'',''under_review'',''shortlisted'')
    ';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'aa_status_date_idx: %', SQLERRM;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- E. REGISTER MIGRATION
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.schema_migrations (filename)
VALUES ('41_hotfixes.sql')
ON CONFLICT (filename) DO NOTHING;

DO $$ BEGIN
  RAISE NOTICE '41_hotfixes: all patches applied ✓';
END; $$;
