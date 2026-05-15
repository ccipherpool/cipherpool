-- ================================================================
-- CIPHERPOOL — Admin Recruitment & Reports System v2
-- File: sql/20_admin_recruitment_reports.sql
-- Run in Supabase SQL Editor as service-role / postgres
-- Requires: 06_base_schema.sql, 18_community_system.sql
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1. EXTEND admin_applications
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.admin_applications
  ADD COLUMN IF NOT EXISTS requested_role       text        DEFAULT 'moderator',
  ADD COLUMN IF NOT EXISTS vote_score           integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vote_count           integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assigned_reviewer    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS final_decision_by    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS final_decision_at    timestamptz,
  ADD COLUMN IF NOT EXISTS final_note           text,
  ADD COLUMN IF NOT EXISTS blacklist_until      timestamptz,
  ADD COLUMN IF NOT EXISTS eligibility_snapshot jsonb       NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS risk_snapshot        jsonb       NOT NULL DEFAULT '{}';

-- ────────────────────────────────────────────────────────────────
-- 2. ADMIN APPLICATION VOTES
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_application_votes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid        NOT NULL REFERENCES public.admin_applications(id) ON DELETE CASCADE,
  voter_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote           text        NOT NULL CHECK (vote IN ('approve','reject','neutral','request_info')),
  comment        text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, voter_id)
);

ALTER TABLE public.admin_application_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_votes_select_staff" ON public.admin_application_votes;
DROP POLICY IF EXISTS "app_votes_insert_staff" ON public.admin_application_votes;
DROP POLICY IF EXISTS "app_votes_update_own"   ON public.admin_application_votes;

CREATE POLICY "app_votes_select_staff" ON public.admin_application_votes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );
CREATE POLICY "app_votes_insert_staff" ON public.admin_application_votes
  FOR INSERT WITH CHECK (
    auth.uid() = voter_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );
CREATE POLICY "app_votes_update_own" ON public.admin_application_votes
  FOR UPDATE USING (auth.uid() = voter_id);

-- ────────────────────────────────────────────────────────────────
-- 3. ADMIN APPLICATION NOTES (internal staff notes)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_application_notes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid        NOT NULL REFERENCES public.admin_applications(id) ON DELETE CASCADE,
  author_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content        text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  is_internal    boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_application_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_notes_select_staff" ON public.admin_application_notes;
DROP POLICY IF EXISTS "app_notes_insert_staff" ON public.admin_application_notes;

CREATE POLICY "app_notes_select_staff" ON public.admin_application_notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );
CREATE POLICY "app_notes_insert_staff" ON public.admin_application_notes
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

-- ────────────────────────────────────────────────────────────────
-- 4. ADMIN APPLICATION AUDIT LOG
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_application_audit (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid        NOT NULL REFERENCES public.admin_applications(id) ON DELETE CASCADE,
  actor_id       uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  action         text        NOT NULL,
  old_value      text,
  new_value      text,
  details        jsonb       NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_application_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_audit_select_staff" ON public.admin_application_audit;
DROP POLICY IF EXISTS "app_audit_insert_any"   ON public.admin_application_audit;

CREATE POLICY "app_audit_select_staff" ON public.admin_application_audit
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );
CREATE POLICY "app_audit_insert_any" ON public.admin_application_audit
  FOR INSERT WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────
-- 5. EXTEND reports TABLE (non-destructive column additions)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS title         text,
  ADD COLUMN IF NOT EXISTS severity      text        DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS evidence_urls text[],
  ADD COLUMN IF NOT EXISTS assigned_to   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at    timestamptz DEFAULT now();

-- Add CHECK constraint safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'reports_severity_check'
      AND constraint_schema = 'public'
  ) THEN
    ALTER TABLE public.reports
      ADD CONSTRAINT reports_severity_check
      CHECK (severity IN ('low','medium','high','critical'));
  END IF;
END;
$$;

UPDATE public.reports SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE public.reports SET severity = 'medium' WHERE severity IS NULL;

CREATE INDEX IF NOT EXISTS reports_assigned_idx  ON public.reports(assigned_to);
CREATE INDEX IF NOT EXISTS reports_severity_idx  ON public.reports(severity);
CREATE INDEX IF NOT EXISTS reports_type_idx      ON public.reports(type);

-- ────────────────────────────────────────────────────────────────
-- 6. REPORT ACTIONS (staff action log per report)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.report_actions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   uuid        NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  actor_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action      text        NOT NULL
    CHECK (action IN ('assign','status_change','warn_user','ban_user','dismiss','escalate','note','resolve')),
  old_status  text,
  new_status  text,
  note        text,
  metadata    jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.report_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_actions_select_staff" ON public.report_actions;
DROP POLICY IF EXISTS "report_actions_insert_staff" ON public.report_actions;

CREATE POLICY "report_actions_select_staff" ON public.report_actions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );
CREATE POLICY "report_actions_insert_staff" ON public.report_actions
  FOR INSERT WITH CHECK (
    auth.uid() = actor_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

-- INDEXES
CREATE INDEX IF NOT EXISTS app_votes_app_idx  ON public.admin_application_votes(application_id);
CREATE INDEX IF NOT EXISTS app_notes_app_idx  ON public.admin_application_notes(application_id);
CREATE INDEX IF NOT EXISTS app_audit_app_idx  ON public.admin_application_audit(application_id);
CREATE INDEX IF NOT EXISTS report_actions_idx ON public.report_actions(report_id);

-- ────────────────────────────────────────────────────────────────
-- 7. RPC: vote_admin_application
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.vote_admin_application(
  p_app_id  uuid,
  p_vote    text,
  p_comment text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_caller_id   uuid := auth.uid();
  v_app         record;
  v_old_vote    text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
  IF v_caller_role NOT IN ('admin','super_admin') THEN
    RETURN jsonb_build_object('success',false,'error','Staff only');
  END IF;

  IF p_vote NOT IN ('approve','reject','neutral','request_info') THEN
    RETURN jsonb_build_object('success',false,'error','Invalid vote value');
  END IF;

  SELECT * INTO v_app FROM public.admin_applications WHERE id = p_app_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Application not found'); END IF;

  IF v_app.user_id = v_caller_id THEN
    RETURN jsonb_build_object('success',false,'error','Cannot vote on own application');
  END IF;

  IF v_app.status NOT IN ('pending','under_review') THEN
    RETURN jsonb_build_object('success',false,'error','Application is no longer active');
  END IF;

  SELECT vote INTO v_old_vote FROM public.admin_application_votes
  WHERE application_id = p_app_id AND voter_id = v_caller_id;

  IF FOUND THEN
    UPDATE public.admin_application_votes
    SET vote = p_vote, comment = p_comment, updated_at = now()
    WHERE application_id = p_app_id AND voter_id = v_caller_id;
  ELSE
    INSERT INTO public.admin_application_votes (application_id, voter_id, vote, comment)
    VALUES (p_app_id, v_caller_id, p_vote, p_comment);
  END IF;

  -- Recompute aggregate vote fields
  UPDATE public.admin_applications
  SET
    vote_score = (
      SELECT COALESCE(SUM(CASE vote WHEN 'approve' THEN 1 WHEN 'reject' THEN -1 ELSE 0 END), 0)
      FROM public.admin_application_votes WHERE application_id = p_app_id
    ),
    vote_count = (
      SELECT COUNT(*) FROM public.admin_application_votes WHERE application_id = p_app_id
    ),
    status = CASE WHEN status = 'pending' THEN 'under_review' ELSE status END,
    updated_at = now()
  WHERE id = p_app_id;

  INSERT INTO public.admin_application_audit (application_id, actor_id, action, old_value, new_value, details)
  VALUES (p_app_id, v_caller_id, 'voted', v_old_vote, p_vote,
    jsonb_build_object('comment', p_comment));

  RETURN jsonb_build_object('success',true,'vote',p_vote);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success',false,'error',SQLERRM,'detail',SQLSTATE);
END;
$$;

-- ────────────────────────────────────────────────────────────────
-- 8. RPC: final_review_admin_application (super_admin only)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.final_review_admin_application(
  p_app_id         uuid,
  p_status         text,
  p_note           text    DEFAULT NULL,
  p_blacklist_days integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_caller_id   uuid := auth.uid();
  v_app         record;
  v_old_status  text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
  IF v_caller_role IS DISTINCT FROM 'super_admin' THEN
    RETURN jsonb_build_object('success',false,'error','super_admin only');
  END IF;

  IF p_status NOT IN ('approved','rejected','on_hold') THEN
    RETURN jsonb_build_object('success',false,'error','Invalid status: use approved / rejected / on_hold');
  END IF;

  SELECT * INTO v_app FROM public.admin_applications WHERE id = p_app_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Not found'); END IF;

  v_old_status := v_app.status;

  UPDATE public.admin_applications SET
    status            = p_status,
    final_note        = p_note,
    final_decision_by = v_caller_id,
    final_decision_at = now(),
    reviewed_by       = v_caller_id,
    reviewed_at       = now(),
    admin_note        = COALESCE(p_note, admin_note),
    blacklist_until   = CASE
      WHEN p_blacklist_days IS NOT NULL
      THEN now() + (p_blacklist_days || ' days')::interval
      ELSE blacklist_until
    END,
    updated_at = now()
  WHERE id = p_app_id;

  IF p_status = 'approved' THEN
    INSERT INTO public.notifications (user_id, sender_id, type, title, message, metadata)
    VALUES (v_app.user_id, v_caller_id, 'achievement',
      'Application Approved!',
      'Your admin application has been approved. Welcome to the CipherPool team!',
      jsonb_build_object('app_id', p_app_id));

    INSERT INTO public.user_reputation_events (user_id, event_type, delta, note, created_by)
    VALUES (v_app.user_id, 'admin_approved', 20, 'Admin application approved', v_caller_id);

  ELSIF p_status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, sender_id, type, title, message, metadata)
    VALUES (v_app.user_id, v_caller_id, 'system',
      'Application Update',
      COALESCE(p_note, 'Your admin application was reviewed. Thank you for your interest.'),
      jsonb_build_object('app_id', p_app_id, 'status', p_status));

    INSERT INTO public.user_reputation_events (user_id, event_type, delta, note, created_by)
    VALUES (v_app.user_id, 'application_rejected', 0, 'Application rejected', v_caller_id);
  END IF;

  INSERT INTO public.admin_application_audit (application_id, actor_id, action, old_value, new_value, details)
  VALUES (p_app_id, v_caller_id, 'final_decision', v_old_status, p_status,
    jsonb_build_object('note', p_note, 'blacklist_days', p_blacklist_days));

  RETURN jsonb_build_object('success',true,'status',p_status);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success',false,'error',SQLERRM,'detail',SQLSTATE);
END;
$$;

-- ────────────────────────────────────────────────────────────────
-- 9. RPC: assign_application_reviewer
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.assign_application_reviewer(
  p_app_id      uuid,
  p_reviewer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_caller_id   uuid := auth.uid();
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
  IF v_caller_role NOT IN ('admin','super_admin') THEN
    RETURN jsonb_build_object('success',false,'error','Staff only');
  END IF;

  UPDATE public.admin_applications
  SET assigned_reviewer = p_reviewer_id, status = 'under_review', updated_at = now()
  WHERE id = p_app_id;

  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Not found'); END IF;

  INSERT INTO public.admin_application_audit (application_id, actor_id, action, new_value, details)
  VALUES (p_app_id, v_caller_id, 'assigned', p_reviewer_id::text,
    jsonb_build_object('reviewer_id', p_reviewer_id));

  RETURN jsonb_build_object('success',true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success',false,'error',SQLERRM);
END;
$$;

-- ────────────────────────────────────────────────────────────────
-- 10. RPC: add_application_note
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.add_application_note(
  p_app_id   uuid,
  p_content  text,
  p_internal boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_caller_id   uuid := auth.uid();
  v_note_id     uuid;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
  IF v_caller_role NOT IN ('admin','super_admin') THEN
    RETURN jsonb_build_object('success',false,'error','Staff only');
  END IF;

  INSERT INTO public.admin_application_notes (application_id, author_id, content, is_internal)
  VALUES (p_app_id, v_caller_id, p_content, p_internal)
  RETURNING id INTO v_note_id;

  INSERT INTO public.admin_application_audit (application_id, actor_id, action, details)
  VALUES (p_app_id, v_caller_id, 'note_added',
    jsonb_build_object('note_id', v_note_id, 'internal', p_internal));

  RETURN jsonb_build_object('success',true,'id',v_note_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success',false,'error',SQLERRM);
END;
$$;

-- ────────────────────────────────────────────────────────────────
-- 11. RPC: submit_report_v2 (enhanced report submission)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_report_v2(
  p_title            text,
  p_type             text,
  p_description      text,
  p_reported_user_id uuid   DEFAULT NULL,
  p_severity         text   DEFAULT 'medium',
  p_tournament_id    uuid   DEFAULT NULL,
  p_evidence_urls    text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_count   integer;
  v_id      uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','Not authenticated');
  END IF;

  IF p_type NOT IN ('cheat','toxic','fraud','bug','other') THEN
    RETURN jsonb_build_object('success',false,'error','Invalid report type');
  END IF;

  IF p_severity NOT IN ('low','medium','high','critical') THEN
    RETURN jsonb_build_object('success',false,'error','Invalid severity');
  END IF;

  IF p_reported_user_id = v_user_id THEN
    RETURN jsonb_build_object('success',false,'error','Cannot report yourself');
  END IF;

  -- Rate limit: 10 reports per 24 hours
  SELECT COUNT(*) INTO v_count FROM public.reports
  WHERE reporter_id = v_user_id AND created_at > now() - INTERVAL '24 hours';
  IF v_count >= 10 THEN
    RETURN jsonb_build_object('success',false,'error','Report limit reached (10 per 24h)');
  END IF;

  INSERT INTO public.reports (
    reporter_id, reported_user_id, tournament_id,
    title, type, description, severity, evidence_urls,
    evidence_url
  ) VALUES (
    v_user_id, p_reported_user_id, p_tournament_id,
    p_title, p_type, p_description, p_severity, p_evidence_urls,
    CASE WHEN p_evidence_urls IS NOT NULL AND array_length(p_evidence_urls,1) > 0
         THEN p_evidence_urls[1] ELSE NULL END
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('success',true,'id',v_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success',false,'error',SQLERRM,'detail',SQLSTATE);
END;
$$;

-- ────────────────────────────────────────────────────────────────
-- 12. RPC: apply_report_action
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.apply_report_action(
  p_report_id  uuid,
  p_action     text,
  p_note       text  DEFAULT NULL,
  p_new_status text  DEFAULT NULL,
  p_assign_to  uuid  DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_caller_id   uuid := auth.uid();
  v_report      record;
  v_old_status  text;
  v_effective_status text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
  IF v_caller_role NOT IN ('admin','super_admin') THEN
    RETURN jsonb_build_object('success',false,'error','Staff only');
  END IF;

  SELECT * INTO v_report FROM public.reports WHERE id = p_report_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Report not found'); END IF;

  v_old_status := v_report.status;

  CASE p_action
    WHEN 'assign' THEN
      IF p_assign_to IS NULL THEN
        RETURN jsonb_build_object('success',false,'error','assign_to required for assign action');
      END IF;
      UPDATE public.reports SET assigned_to = p_assign_to, updated_at = now() WHERE id = p_report_id;
      v_effective_status := v_old_status;

    WHEN 'resolve' THEN
      UPDATE public.reports SET
        status = 'resolved', resolved_by = v_caller_id, resolved_at = now(),
        resolved_action = p_note, updated_at = now()
      WHERE id = p_report_id;
      v_effective_status := 'resolved';

    WHEN 'dismiss' THEN
      UPDATE public.reports SET
        status = 'dismissed', resolved_by = v_caller_id, resolved_at = now(),
        resolved_action = p_note, updated_at = now()
      WHERE id = p_report_id;
      v_effective_status := 'dismissed';

    WHEN 'status_change' THEN
      IF p_new_status NOT IN ('pending','resolved','dismissed') THEN
        RETURN jsonb_build_object('success',false,'error','Invalid status');
      END IF;
      UPDATE public.reports SET
        status = p_new_status,
        resolved_by = CASE WHEN p_new_status IN ('resolved','dismissed') THEN v_caller_id ELSE resolved_by END,
        resolved_at = CASE WHEN p_new_status IN ('resolved','dismissed') THEN now() ELSE resolved_at END,
        resolved_action = p_note,
        updated_at = now()
      WHERE id = p_report_id;
      v_effective_status := p_new_status;

    WHEN 'warn_user' THEN
      IF v_report.reported_user_id IS NULL THEN
        RETURN jsonb_build_object('success',false,'error','No reported user on this report');
      END IF;
      PERFORM public.issue_warning(
        v_report.reported_user_id,
        COALESCE(p_note, 'Community report: ' || v_report.type),
        'minor'
      );
      v_effective_status := v_old_status;

    WHEN 'escalate' THEN
      UPDATE public.reports SET severity = 'critical', updated_at = now() WHERE id = p_report_id;
      v_effective_status := v_old_status;

    ELSE
      v_effective_status := v_old_status;
  END CASE;

  INSERT INTO public.report_actions (report_id, actor_id, action, old_status, new_status, note, metadata)
  VALUES (p_report_id, v_caller_id, p_action, v_old_status, v_effective_status, p_note,
    jsonb_build_object('assign_to', p_assign_to));

  RETURN jsonb_build_object('success',true,'action',p_action,'new_status',v_effective_status);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success',false,'error',SQLERRM,'detail',SQLSTATE);
END;
$$;

-- ────────────────────────────────────────────────────────────────
-- 13. RPC: get_governance_dashboard
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_governance_dashboard()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin') THEN
    RETURN jsonb_build_object('success',false,'error','Staff only');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'applications', jsonb_build_object(
      'total',        (SELECT COUNT(*) FROM public.admin_applications),
      'pending',      (SELECT COUNT(*) FROM public.admin_applications WHERE status = 'pending'),
      'under_review', (SELECT COUNT(*) FROM public.admin_applications WHERE status = 'under_review'),
      'approved',     (SELECT COUNT(*) FROM public.admin_applications WHERE status = 'approved'),
      'rejected',     (SELECT COUNT(*) FROM public.admin_applications WHERE status = 'rejected'),
      'on_hold',      (SELECT COUNT(*) FROM public.admin_applications WHERE status = 'on_hold'),
      'this_week',    (SELECT COUNT(*) FROM public.admin_applications WHERE created_at > now() - INTERVAL '7 days')
    ),
    'reports', jsonb_build_object(
      'total',        (SELECT COUNT(*) FROM public.reports),
      'pending',      (SELECT COUNT(*) FROM public.reports WHERE status = 'pending'),
      'resolved',     (SELECT COUNT(*) FROM public.reports WHERE status = 'resolved'),
      'dismissed',    (SELECT COUNT(*) FROM public.reports WHERE status = 'dismissed'),
      'this_week',    (SELECT COUNT(*) FROM public.reports WHERE created_at > now() - INTERVAL '7 days'),
      'critical_open',(SELECT COUNT(*) FROM public.reports WHERE severity = 'critical' AND status = 'pending'),
      'high_open',    (SELECT COUNT(*) FROM public.reports WHERE severity = 'high' AND status = 'pending'),
      'by_type', (
        SELECT jsonb_object_agg(type, cnt) FROM (
          SELECT type, COUNT(*) AS cnt FROM public.reports GROUP BY type
        ) t
      )
    ),
    'warnings', jsonb_build_object(
      'total_active', (SELECT COUNT(*) FROM public.user_warnings WHERE resolved = false),
      'this_week',    (SELECT COUNT(*) FROM public.user_warnings WHERE created_at > now() - INTERVAL '7 days'),
      'critical',     (SELECT COUNT(*) FROM public.user_warnings WHERE severity = 'critical' AND resolved = false)
    ),
    'votes', jsonb_build_object(
      'total',     (SELECT COUNT(*) FROM public.admin_application_votes),
      'this_week', (SELECT COUNT(*) FROM public.admin_application_votes WHERE created_at > now() - INTERVAL '7 days'),
      'approve',   (SELECT COUNT(*) FROM public.admin_application_votes WHERE vote = 'approve'),
      'reject',    (SELECT COUNT(*) FROM public.admin_application_votes WHERE vote = 'reject')
    ),
    'recent_decisions', (
      SELECT COALESCE(jsonb_agg(row_to_json(d) ORDER BY d.final_decision_at DESC), '[]') FROM (
        SELECT
          aa.id,
          aa.status,
          aa.final_decision_at,
          aa.final_note,
          aa.readiness_score,
          p.username  AS applicant,
          p.avatar_url AS applicant_avatar,
          r.username  AS decided_by
        FROM public.admin_applications aa
        JOIN public.profiles p ON p.id = aa.user_id
        LEFT JOIN public.profiles r ON r.id = aa.final_decision_by
        WHERE aa.final_decision_at IS NOT NULL
        ORDER BY aa.final_decision_at DESC
        LIMIT 8
      ) d
    ),
    'recent_reports', (
      SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.created_at DESC), '[]') FROM (
        SELECT
          rp.id, rp.type, rp.severity, rp.status, rp.title, rp.created_at,
          p.username AS reporter
        FROM public.reports rp
        JOIN public.profiles p ON p.id = rp.reporter_id
        ORDER BY rp.created_at DESC
        LIMIT 8
      ) r
    )
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success',false,'error',SQLERRM,'detail',SQLSTATE);
END;
$$;

-- ────────────────────────────────────────────────────────────────
-- 14. REALTIME
-- ────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_application_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_application_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.report_actions;

-- ────────────────────────────────────────────────────────────────
-- 15. GRANTS
-- ────────────────────────────────────────────────────────────────
GRANT SELECT ON public.admin_application_votes TO authenticated;
GRANT SELECT ON public.admin_application_notes TO authenticated;
GRANT SELECT ON public.admin_application_audit TO authenticated;
GRANT SELECT ON public.report_actions          TO authenticated;

GRANT EXECUTE ON FUNCTION public.vote_admin_application(uuid, text, text)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.final_review_admin_application(uuid, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_application_reviewer(uuid, uuid)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_application_note(uuid, text, boolean)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_report_v2(text, text, text, uuid, text, uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_report_action(uuid, text, text, text, uuid)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_governance_dashboard()                             TO authenticated;
