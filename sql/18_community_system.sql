-- ============================================================
-- CipherPool Community Governance System
-- sql/18_community_system.sql
-- ============================================================

-- ─── FEATURE REQUESTS (Ideas / Voting) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.feature_requests (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           text        NOT NULL CHECK (char_length(title) BETWEEN 10 AND 150),
  description     text        NOT NULL CHECK (char_length(description) BETWEEN 30 AND 2000),
  category        text        NOT NULL DEFAULT 'general'
                              CHECK (category IN ('gameplay','ui_ux','rewards','social','security','performance','other','general')),
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','under_review','planned','approved','rejected','completed')),
  vote_score      integer     NOT NULL DEFAULT 0,
  upvotes         integer     NOT NULL DEFAULT 0,
  downvotes       integer     NOT NULL DEFAULT 0,
  comment_count   integer     NOT NULL DEFAULT 0,
  reward_given    boolean     NOT NULL DEFAULT false,
  admin_note      text,
  reviewed_by     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feature_votes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid        NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote       smallint    NOT NULL CHECK (vote IN (1, -1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.feature_comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid        NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  is_deleted boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── BUG REPORTS ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bug_reports (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           text        NOT NULL CHECK (char_length(title) BETWEEN 10 AND 150),
  description     text        NOT NULL CHECK (char_length(description) BETWEEN 30 AND 3000),
  steps_to_repro  text,
  category        text        NOT NULL DEFAULT 'other'
                              CHECK (category IN ('ui','payment_wallet','tournament','chat_abuse','security','login_auth','database','performance','other')),
  severity        text        NOT NULL DEFAULT 'low'
                              CHECK (severity IN ('low','medium','high','critical')),
  status          text        NOT NULL DEFAULT 'open'
                              CHECK (status IN ('open','acknowledged','in_progress','fixed','rejected','duplicate','wont_fix')),
  screenshot_url  text,
  affected_page   text,
  device_info     text,
  browser_info    text,
  reward_given    boolean     NOT NULL DEFAULT false,
  reward_amount   integer     NOT NULL DEFAULT 0,
  admin_note      text,
  reviewed_by     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bug_report_rewards (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  uuid        NOT NULL REFERENCES public.bug_reports(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount     integer     NOT NULL,
  severity   text        NOT NULL,
  paid_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id)
);

-- ─── ADMIN CANDIDATE SYSTEM ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_applications (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level               smallint    NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 6),
  -- Level labels: 1=Trusted User, 2=Helper, 3=Moderator Candidate, 4=Trial Moderator, 5=Admin Candidate, 6=Admin

  -- Screening questions
  q_why_join          text        NOT NULL CHECK (char_length(q_why_join) BETWEEN 50 AND 1000),
  q_experience        text        NOT NULL CHECK (char_length(q_experience) BETWEEN 50 AND 1000),
  q_conflict_scenario text        NOT NULL CHECK (char_length(q_conflict_scenario) BETWEEN 50 AND 1000),
  q_availability      text        NOT NULL CHECK (char_length(q_availability) BETWEEN 10 AND 200),
  q_languages         text        NOT NULL CHECK (char_length(q_languages) BETWEEN 3 AND 200),
  q_extra             text,

  -- Review outcome
  status              text        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','under_review','approved','rejected','on_hold')),
  readiness_score     smallint    NOT NULL DEFAULT 0 CHECK (readiness_score BETWEEN 0 AND 100),
  admin_note          text,
  reviewed_by         uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, level)
);

CREATE TABLE IF NOT EXISTS public.admin_candidate_scores (
  user_id           uuid    PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_age_ok    boolean NOT NULL DEFAULT false,  -- account >= 1 month
  email_verified    boolean NOT NULL DEFAULT false,
  no_active_bans    boolean NOT NULL DEFAULT true,
  fair_play_ok      boolean NOT NULL DEFAULT false,  -- fair_play_score >= 80
  tournament_played boolean NOT NULL DEFAULT false,  -- participated in >= 1 tournament
  ideas_accepted    integer NOT NULL DEFAULT 0,
  bugs_valid        integer NOT NULL DEFAULT 0,
  warnings_count    integer NOT NULL DEFAULT 0,
  readiness_score   smallint NOT NULL DEFAULT 0,     -- 0-100%, computed
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── REPUTATION / MODERATION ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_reputation_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type  text        NOT NULL
              CHECK (event_type IN ('idea_accepted','idea_rejected','bug_valid','bug_invalid','bug_duplicate','vote_spam','false_report','toxic_comment','helpful_comment','warn_issued','warn_expired','admin_approved','application_rejected')),
  delta       integer     NOT NULL DEFAULT 0,
  note        text,
  created_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_warnings (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason      text        NOT NULL,
  severity    text        NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor','major','critical')),
  issued_by   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at  timestamptz,
  resolved    boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.moderation_reviews (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type   text        NOT NULL CHECK (target_type IN ('feature_request','bug_report','admin_application','comment')),
  target_id     uuid        NOT NULL,
  reviewer_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action        text        NOT NULL CHECK (action IN ('approved','rejected','flagged','warned','on_hold','completed')),
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_feature_requests_user     ON public.feature_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_requests_status   ON public.feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_votes    ON public.feature_requests(vote_score DESC);
CREATE INDEX IF NOT EXISTS idx_feature_votes_request     ON public.feature_votes(request_id);
CREATE INDEX IF NOT EXISTS idx_feature_comments_request  ON public.feature_comments(request_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_user          ON public.bug_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status        ON public.bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_severity      ON public.bug_reports(severity);
CREATE INDEX IF NOT EXISTS idx_admin_applications_user   ON public.admin_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_reputation_events_user    ON public.user_reputation_events(user_id);
CREATE INDEX IF NOT EXISTS idx_warnings_user             ON public.user_warnings(user_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.feature_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_votes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_reports           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_report_rewards    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_applications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_candidate_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reputation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_warnings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_reviews    ENABLE ROW LEVEL SECURITY;

-- feature_requests: public read, own write
CREATE POLICY "feature_requests_select" ON public.feature_requests FOR SELECT USING (true);
CREATE POLICY "feature_requests_insert" ON public.feature_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "feature_requests_update_admin" ON public.feature_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin'))
);

-- feature_votes: own
CREATE POLICY "feature_votes_select"  ON public.feature_votes FOR SELECT USING (true);
CREATE POLICY "feature_votes_insert"  ON public.feature_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "feature_votes_delete"  ON public.feature_votes FOR DELETE USING (auth.uid() = user_id);

-- feature_comments: public read, own insert
CREATE POLICY "feature_comments_select" ON public.feature_comments FOR SELECT USING (true);
CREATE POLICY "feature_comments_insert" ON public.feature_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "feature_comments_update" ON public.feature_comments FOR UPDATE USING (auth.uid() = user_id);

-- bug_reports: own + admin
CREATE POLICY "bug_reports_select_own"   ON public.bug_reports FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin'))
);
CREATE POLICY "bug_reports_insert"       ON public.bug_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bug_reports_update_admin" ON public.bug_reports FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin'))
);

-- bug_report_rewards: public read
CREATE POLICY "bug_rewards_select" ON public.bug_report_rewards FOR SELECT USING (true);

-- admin_applications: own + admin
CREATE POLICY "admin_apps_select" ON public.admin_applications FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin'))
);
CREATE POLICY "admin_apps_insert" ON public.admin_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin_apps_update" ON public.admin_applications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin'))
);

-- candidate scores: own + admin
CREATE POLICY "candidate_scores_select" ON public.admin_candidate_scores FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin'))
);

-- reputation events: own
CREATE POLICY "rep_events_select" ON public.user_reputation_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rep_events_admin"  ON public.user_reputation_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin'))
);

-- warnings: own + admin
CREATE POLICY "warnings_select" ON public.user_warnings FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin'))
);

-- moderation_reviews: admin only
CREATE POLICY "mod_reviews_select" ON public.moderation_reviews FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin'))
);

-- ─── HELPER: compute admin readiness score ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.compute_readiness_score(p_user_id uuid)
RETURNS smallint
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_profile       record;
  v_score         integer := 0;
  v_ideas         integer;
  v_bugs          integer;
  v_tournaments   integer;
  v_warnings      integer;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- Account age >= 1 month (10 pts)
  IF v_profile.created_at <= now() - INTERVAL '1 month' THEN v_score := v_score + 10; END IF;

  -- Email verified (10 pts)
  IF v_profile.is_verified THEN v_score := v_score + 10; END IF;

  -- No active bans (10 pts)
  IF NOT EXISTS (
    SELECT 1 FROM public.user_warnings
    WHERE user_id = p_user_id AND severity = 'critical' AND resolved = false
  ) THEN v_score := v_score + 10; END IF;

  -- Fair-play score >= 80 (15 pts)
  IF COALESCE(v_profile.fair_play_score, 100) >= 80 THEN v_score := v_score + 15; END IF;

  -- Participated in at least 1 tournament (15 pts)
  SELECT COUNT(*) INTO v_tournaments
  FROM public.tournament_players WHERE user_id = p_user_id;
  IF v_tournaments >= 1 THEN v_score := v_score + 15; END IF;
  IF v_tournaments >= 5  THEN v_score := v_score + 5; END IF;
  IF v_tournaments >= 20 THEN v_score := v_score + 5; END IF;

  -- Accepted ideas (5 pts each, max 20)
  SELECT COUNT(*) INTO v_ideas
  FROM public.feature_requests WHERE user_id = p_user_id AND status IN ('approved','completed');
  v_score := v_score + LEAST(v_ideas * 5, 20);

  -- Valid bug reports (5 pts each, max 15)
  SELECT COUNT(*) INTO v_bugs
  FROM public.bug_reports WHERE user_id = p_user_id AND status IN ('fixed','acknowledged','in_progress');
  v_score := v_score + LEAST(v_bugs * 5, 15);

  -- Active warnings penalty (-10 per major, -20 per critical)
  SELECT COUNT(*) INTO v_warnings
  FROM public.user_warnings WHERE user_id = p_user_id AND resolved = false AND severity = 'major';
  v_score := v_score - (v_warnings * 10);

  RETURN GREATEST(0, LEAST(100, v_score));
END;
$$;

-- ─── RPC: submit_feature_request ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_feature_request(
  p_title       text,
  p_description text,
  p_category    text DEFAULT 'general'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_count   integer;
  v_id      uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Rate limit: max 3 ideas per 7 days
  SELECT COUNT(*) INTO v_count
  FROM public.feature_requests
  WHERE user_id = v_user_id AND created_at > now() - INTERVAL '7 days';
  IF v_count >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Limit: 3 ideas per 7 days');
  END IF;

  INSERT INTO public.feature_requests (user_id, title, description, category)
  VALUES (v_user_id, p_title, p_description, p_category)
  RETURNING id INTO v_id;

  -- Reputation event
  INSERT INTO public.user_reputation_events (user_id, event_type, delta, note)
  VALUES (v_user_id, 'idea_accepted', 0, 'Submitted idea');

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

-- ─── RPC: vote_feature ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.vote_feature(
  p_request_id uuid,
  p_vote       smallint  -- 1 or -1
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_existing   smallint;
  v_owner_id   uuid;
  v_vote_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_vote NOT IN (1, -1) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid vote');
  END IF;

  -- Cannot vote own idea
  SELECT user_id INTO v_owner_id FROM public.feature_requests WHERE id = p_request_id;
  IF v_owner_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot vote on your own idea');
  END IF;

  -- Anti-spam: max 50 votes per 24h per user
  SELECT COUNT(*) INTO v_vote_count
  FROM public.feature_votes
  WHERE user_id = v_user_id AND created_at > now() - INTERVAL '24 hours';
  IF v_vote_count >= 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vote limit reached for today');
  END IF;

  SELECT vote INTO v_existing FROM public.feature_votes
  WHERE request_id = p_request_id AND user_id = v_user_id;

  IF FOUND THEN
    IF v_existing = p_vote THEN
      -- Toggle off (remove vote)
      DELETE FROM public.feature_votes WHERE request_id = p_request_id AND user_id = v_user_id;
      UPDATE public.feature_requests SET
        upvotes   = upvotes   - CASE WHEN p_vote = 1 THEN 1 ELSE 0 END,
        downvotes = downvotes - CASE WHEN p_vote = -1 THEN 1 ELSE 0 END,
        vote_score = vote_score - p_vote,
        updated_at = now()
      WHERE id = p_request_id;
      RETURN jsonb_build_object('success', true, 'action', 'removed');
    ELSE
      -- Change vote
      UPDATE public.feature_votes SET vote = p_vote WHERE request_id = p_request_id AND user_id = v_user_id;
      UPDATE public.feature_requests SET
        upvotes   = upvotes   + CASE WHEN p_vote = 1 THEN 1 ELSE -1 END,
        downvotes = downvotes + CASE WHEN p_vote = -1 THEN 1 ELSE -1 END,
        vote_score = vote_score + (p_vote * 2),
        updated_at = now()
      WHERE id = p_request_id;
      RETURN jsonb_build_object('success', true, 'action', 'changed');
    END IF;
  ELSE
    -- New vote
    INSERT INTO public.feature_votes (request_id, user_id, vote) VALUES (p_request_id, v_user_id, p_vote);
    UPDATE public.feature_requests SET
      upvotes   = upvotes   + CASE WHEN p_vote = 1 THEN 1 ELSE 0 END,
      downvotes = downvotes + CASE WHEN p_vote = -1 THEN 1 ELSE 0 END,
      vote_score = vote_score + p_vote,
      updated_at = now()
    WHERE id = p_request_id;
    RETURN jsonb_build_object('success', true, 'action', 'voted');
  END IF;
END;
$$;

-- ─── RPC: comment_feature ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.comment_feature(
  p_request_id uuid,
  p_content    text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id  uuid := auth.uid();
  v_count    integer;
  v_id       uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Anti-spam: max 10 comments per hour
  SELECT COUNT(*) INTO v_count FROM public.feature_comments
  WHERE user_id = v_user_id AND created_at > now() - INTERVAL '1 hour';
  IF v_count >= 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Too many comments. Wait a bit.');
  END IF;

  INSERT INTO public.feature_comments (request_id, user_id, content)
  VALUES (p_request_id, v_user_id, p_content)
  RETURNING id INTO v_id;

  UPDATE public.feature_requests SET comment_count = comment_count + 1, updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

-- ─── RPC: submit_bug_report ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_bug_report(
  p_title          text,
  p_description    text,
  p_category       text DEFAULT 'other',
  p_severity       text DEFAULT 'low',
  p_steps          text DEFAULT NULL,
  p_screenshot_url text DEFAULT NULL,
  p_affected_page  text DEFAULT NULL,
  p_device_info    text DEFAULT NULL,
  p_browser_info   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_count   integer;
  v_id      uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Rate limit: max 5 bug reports per 7 days
  SELECT COUNT(*) INTO v_count FROM public.bug_reports
  WHERE user_id = v_user_id AND created_at > now() - INTERVAL '7 days';
  IF v_count >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Limit: 5 bug reports per week');
  END IF;

  -- Anti-abuse: check for active warnings
  IF EXISTS (
    SELECT 1 FROM public.user_warnings
    WHERE user_id = v_user_id AND resolved = false AND severity = 'critical'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account restricted from submitting reports');
  END IF;

  INSERT INTO public.bug_reports (
    user_id, title, description, category, severity,
    steps_to_repro, screenshot_url, affected_page, device_info, browser_info
  ) VALUES (
    v_user_id, p_title, p_description, p_category, p_severity,
    p_steps, p_screenshot_url, p_affected_page, p_device_info, p_browser_info
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

-- ─── RPC: submit_admin_application ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_admin_application(
  p_why_join          text,
  p_experience        text,
  p_conflict_scenario text,
  p_availability      text,
  p_languages         text,
  p_extra             text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id       uuid := auth.uid();
  v_profile       record;
  v_readiness     smallint;
  v_existing      record;
  v_id            uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;

  -- Account must be >= 1 month old
  IF v_profile.created_at > now() - INTERVAL '1 month' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account must be at least 1 month old');
  END IF;

  -- Fair play >= 70
  IF COALESCE(v_profile.fair_play_score, 100) < 70 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fair-play score must be at least 70');
  END IF;

  -- No critical warnings
  IF EXISTS (
    SELECT 1 FROM public.user_warnings
    WHERE user_id = v_user_id AND resolved = false AND severity = 'critical'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account has active critical warnings');
  END IF;

  -- Cannot reapply within 30 days if previously rejected
  SELECT * INTO v_existing FROM public.admin_applications
  WHERE user_id = v_user_id ORDER BY created_at DESC LIMIT 1;
  IF FOUND AND v_existing.status = 'rejected' AND v_existing.reviewed_at > now() - INTERVAL '30 days' THEN
    RETURN jsonb_build_object('success', false, 'error', 'You can reapply 30 days after rejection');
  END IF;
  IF FOUND AND v_existing.status = 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have a pending application');
  END IF;

  v_readiness := public.compute_readiness_score(v_user_id);

  IF v_readiness < 40 THEN
    RETURN jsonb_build_object('success', false, 'error',
      format('Admin Readiness Score too low (%s%%). Need at least 40%%.', v_readiness));
  END IF;

  INSERT INTO public.admin_applications (
    user_id, level, q_why_join, q_experience, q_conflict_scenario,
    q_availability, q_languages, q_extra, readiness_score
  ) VALUES (
    v_user_id, 1, p_why_join, p_experience, p_conflict_scenario,
    p_availability, p_languages, p_extra, v_readiness
  ) RETURNING id INTO v_id;

  -- Upsert candidate scores
  INSERT INTO public.admin_candidate_scores (
    user_id, readiness_score, updated_at
  ) VALUES (v_user_id, v_readiness, now())
  ON CONFLICT (user_id) DO UPDATE SET readiness_score = v_readiness, updated_at = now();

  RETURN jsonb_build_object('success', true, 'id', v_id, 'readiness_score', v_readiness);
END;
$$;

-- ─── RPC: get_my_readiness ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_readiness()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id   uuid := auth.uid();
  v_profile   record;
  v_score     smallint;
  v_ideas     integer;
  v_bugs      integer;
  v_tourn     integer;
  v_warnings  integer;
  v_has_app   boolean;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Not found'); END IF;

  v_score := public.compute_readiness_score(v_user_id);

  SELECT COUNT(*) INTO v_ideas  FROM public.feature_requests WHERE user_id = v_user_id AND status IN ('approved','completed');
  SELECT COUNT(*) INTO v_bugs   FROM public.bug_reports WHERE user_id = v_user_id AND status IN ('fixed','acknowledged','in_progress');
  SELECT COUNT(*) INTO v_tourn  FROM public.tournament_players WHERE user_id = v_user_id;
  SELECT COUNT(*) INTO v_warnings FROM public.user_warnings WHERE user_id = v_user_id AND resolved = false;
  SELECT EXISTS (SELECT 1 FROM public.admin_applications WHERE user_id = v_user_id AND status IN ('pending','under_review'))
  INTO v_has_app;

  RETURN jsonb_build_object(
    'readiness_score',   v_score,
    'account_age_ok',    v_profile.created_at <= now() - INTERVAL '1 month',
    'email_verified',    v_profile.is_verified,
    'fair_play_ok',      COALESCE(v_profile.fair_play_score, 100) >= 80,
    'fair_play_score',   COALESCE(v_profile.fair_play_score, 100),
    'tournament_played', v_tourn >= 1,
    'tournament_count',  v_tourn,
    'ideas_accepted',    v_ideas,
    'bugs_valid',        v_bugs,
    'active_warnings',   v_warnings,
    'has_pending_app',   v_has_app
  );
END;
$$;

-- ─── RPC: admin_review_idea ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_review_idea(
  p_request_id uuid,
  p_status     text,
  p_note       text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_admin_id  uuid := auth.uid();
  v_request   record;
  v_reward_cp integer := 100;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_admin_id AND role IN ('admin','superadmin')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_request FROM public.feature_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Not found'); END IF;

  UPDATE public.feature_requests SET
    status      = p_status,
    admin_note  = p_note,
    reviewed_by = v_admin_id,
    reviewed_at = now(),
    updated_at  = now()
  WHERE id = p_request_id;

  -- Reward for approved ideas
  IF p_status IN ('approved','completed') AND NOT v_request.reward_given THEN
    PERFORM public.admin_adjust_coins(v_request.user_id, v_reward_cp, 'idea_reward',
      format('Your idea "%s" was approved! 💡 +%s CP', left(v_request.title, 40), v_reward_cp));

    UPDATE public.feature_requests SET reward_given = true WHERE id = p_request_id;

    INSERT INTO public.user_reputation_events (user_id, event_type, delta, note, created_by)
    VALUES (v_request.user_id, 'idea_accepted', 10, 'Idea approved by admin', v_admin_id);

    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (v_request.user_id, 'achievement',
      '💡 Idea Approved!',
      format('Your idea "%s" was approved! You earned %s CP', v_request.title, v_reward_cp),
      jsonb_build_object('reward_cp', v_reward_cp, 'idea_id', p_request_id));
  ELSIF p_status = 'rejected' THEN
    INSERT INTO public.user_reputation_events (user_id, event_type, delta, note, created_by)
    VALUES (v_request.user_id, 'idea_rejected', 0, 'Idea not approved', v_admin_id);

    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (v_request.user_id, 'system',
      'Idea Update',
      format('Your idea "%s" was reviewed. Status: %s', v_request.title, p_status),
      jsonb_build_object('idea_id', p_request_id, 'status', p_status));
  END IF;

  INSERT INTO public.moderation_reviews (target_type, target_id, reviewer_id, action, note)
  VALUES ('feature_request', p_request_id, v_admin_id, p_status, p_note);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─── RPC: admin_review_bug ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_review_bug(
  p_report_id uuid,
  p_status    text,
  p_note      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_admin_id  uuid := auth.uid();
  v_report    record;
  v_reward    integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_admin_id AND role IN ('admin','superadmin')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_report FROM public.bug_reports WHERE id = p_report_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Not found'); END IF;

  UPDATE public.bug_reports SET
    status      = p_status,
    admin_note  = p_note,
    reviewed_by = v_admin_id,
    reviewed_at = now(),
    updated_at  = now()
  WHERE id = p_report_id;

  IF p_status IN ('acknowledged','in_progress','fixed') AND NOT v_report.reward_given THEN
    v_reward := CASE v_report.severity
      WHEN 'low'      THEN 25
      WHEN 'medium'   THEN 100
      WHEN 'high'     THEN 300
      WHEN 'critical' THEN 1000
      ELSE 25
    END;

    PERFORM public.admin_adjust_coins(v_report.user_id, v_reward, 'bug_bounty',
      format('Bug bounty reward — %s severity', v_report.severity));

    UPDATE public.bug_reports SET reward_given = true, reward_amount = v_reward WHERE id = p_report_id;

    INSERT INTO public.bug_report_rewards (report_id, user_id, amount, severity)
    VALUES (p_report_id, v_report.user_id, v_reward, v_report.severity);

    INSERT INTO public.user_reputation_events (user_id, event_type, delta, note, created_by)
    VALUES (v_report.user_id, 'bug_valid', 5, format('%s severity bug confirmed', v_report.severity), v_admin_id);

    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (v_report.user_id, 'coins_received',
      '🐛 Bug Bounty Reward!',
      format('Your %s severity bug report was confirmed. You earned %s CP!', v_report.severity, v_reward),
      jsonb_build_object('reward_cp', v_reward, 'report_id', p_report_id, 'severity', v_report.severity));
  ELSIF p_status IN ('rejected','duplicate','wont_fix') THEN
    INSERT INTO public.user_reputation_events (user_id, event_type, delta, note, created_by)
    VALUES (v_report.user_id, 'bug_invalid', 0, format('Bug report %s', p_status), v_admin_id);
  END IF;

  INSERT INTO public.moderation_reviews (target_type, target_id, reviewer_id, action, note)
  VALUES ('bug_report', p_report_id, v_admin_id, p_status, p_note);

  RETURN jsonb_build_object('success', true, 'reward', v_reward);
END;
$$;

-- ─── RPC: admin_review_application ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_review_application(
  p_app_id uuid,
  p_status text,
  p_note   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_app      record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_admin_id AND role IN ('admin','superadmin')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_app FROM public.admin_applications WHERE id = p_app_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Not found'); END IF;

  UPDATE public.admin_applications SET
    status      = p_status,
    admin_note  = p_note,
    reviewed_by = v_admin_id,
    reviewed_at = now(),
    updated_at  = now()
  WHERE id = p_app_id;

  IF p_status = 'approved' THEN
    INSERT INTO public.user_reputation_events (user_id, event_type, delta, note, created_by)
    VALUES (v_app.user_id, 'admin_approved', 20, 'Admin application approved', v_admin_id);

    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (v_app.user_id, 'achievement',
      '⭐ Application Approved!',
      'Your admin application has been approved! Welcome to the team.',
      jsonb_build_object('app_id', p_app_id));
  ELSIF p_status = 'rejected' THEN
    INSERT INTO public.user_reputation_events (user_id, event_type, delta, note, created_by)
    VALUES (v_app.user_id, 'application_rejected', 0, 'Admin application rejected', v_admin_id);

    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (v_app.user_id, 'system',
      'Application Update',
      COALESCE(p_note, 'Your admin application was reviewed. Thank you for your interest.'),
      jsonb_build_object('app_id', p_app_id, 'status', p_status));
  END IF;

  INSERT INTO public.moderation_reviews (target_type, target_id, reviewer_id, action, note)
  VALUES ('admin_application', p_app_id, v_admin_id, p_status, p_note);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─── RPC: issue_warning ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.issue_warning(
  p_user_id  uuid,
  p_reason   text,
  p_severity text DEFAULT 'minor'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_expires  timestamptz;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_admin_id AND role IN ('admin','superadmin')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  v_expires := CASE p_severity
    WHEN 'minor'    THEN now() + INTERVAL '7 days'
    WHEN 'major'    THEN now() + INTERVAL '30 days'
    WHEN 'critical' THEN NULL  -- permanent until resolved manually
    ELSE now() + INTERVAL '7 days'
  END;

  INSERT INTO public.user_warnings (user_id, reason, severity, issued_by, expires_at)
  VALUES (p_user_id, p_reason, p_severity, v_admin_id, v_expires);

  INSERT INTO public.user_reputation_events (user_id, event_type, delta, note, created_by)
  VALUES (p_user_id, 'warn_issued', CASE p_severity WHEN 'minor' THEN -5 WHEN 'major' THEN -15 ELSE -30 END,
    format('%s warning: %s', p_severity, p_reason), v_admin_id);

  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (p_user_id, 'warning',
    format('⚠️ %s Warning', initcap(p_severity)),
    format('You received a %s warning: %s', p_severity, p_reason));

  -- Fair-play penalty
  UPDATE public.profiles SET
    fair_play_score = GREATEST(0, COALESCE(fair_play_score, 100) -
      CASE p_severity WHEN 'minor' THEN 3 WHEN 'major' THEN 10 ELSE 20 END)
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─── VIEW: community_ideas_feed ──────────────────────────────────────────────

CREATE OR REPLACE VIEW public.community_ideas_feed AS
SELECT
  fr.id,
  fr.title,
  fr.description,
  fr.category,
  fr.status,
  fr.vote_score,
  fr.upvotes,
  fr.downvotes,
  fr.comment_count,
  fr.reward_given,
  fr.admin_note,
  fr.created_at,
  fr.updated_at,
  p.username   AS author_username,
  p.avatar_url AS author_avatar,
  p.is_verified AS author_verified,
  p.fair_play_score AS author_fp
FROM public.feature_requests fr
JOIN public.profiles p ON p.id = fr.user_id
ORDER BY fr.vote_score DESC, fr.created_at DESC;

-- ─── VIEW: bug_reports_admin_view ────────────────────────────────────────────

CREATE OR REPLACE VIEW public.bug_reports_admin_view AS
SELECT
  br.id,
  br.title,
  br.description,
  br.steps_to_repro,
  br.category,
  br.severity,
  br.status,
  br.screenshot_url,
  br.affected_page,
  br.device_info,
  br.browser_info,
  br.reward_given,
  br.reward_amount,
  br.admin_note,
  br.reviewed_at,
  br.created_at,
  p.username    AS reporter_username,
  p.avatar_url  AS reporter_avatar,
  p.is_verified AS reporter_verified,
  p.fair_play_score AS reporter_fp,
  rv.username   AS reviewer_username
FROM public.bug_reports br
JOIN public.profiles p ON p.id = br.user_id
LEFT JOIN public.profiles rv ON rv.id = br.reviewed_by
ORDER BY
  CASE br.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
  br.created_at DESC;
