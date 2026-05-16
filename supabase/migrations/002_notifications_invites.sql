 -- ================================================================
-- CIPHERPOOL — NOTIFICATIONS & INVITATIONS EXTENSION
-- Extends the base social system (001_social_system.sql)
-- ================================================================

-- ----------------------------------------------------------------
-- NOTIFICATIONS TABLE (if not already exists)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_select_self"  ON notifications FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "notif_insert_any"   ON notifications FOR INSERT  WITH CHECK (true);
CREATE POLICY "notif_update_self"  ON notifications FOR UPDATE  USING (auth.uid() = user_id);
CREATE POLICY "notif_delete_self"  ON notifications FOR DELETE  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- INVITATIONS TABLE (clan / team / tournament)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT NOT NULL CHECK (type IN ('clan','team','tournament')),
  resource_id   UUID NOT NULL,
  sender_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  UNIQUE (type, resource_id, receiver_id)
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_select_parties"  ON invitations FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "inv_insert_sender"   ON invitations FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "inv_update_receiver" ON invitations FOR UPDATE
  USING (auth.uid() = receiver_id OR auth.uid() = sender_id);
CREATE POLICY "inv_delete_sender"   ON invitations FOR DELETE
  USING (auth.uid() = sender_id);

-- ----------------------------------------------------------------
-- FUNCTION: Send an invitation + create notification
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION send_invitation(
  p_type        TEXT,
  p_resource_id UUID,
  p_receiver_id UUID
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  inv_id UUID;
  sender_name TEXT;
BEGIN
  -- Blocked check: cannot invite someone who blocked you or vice versa
  IF EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = p_receiver_id AND blocked_id = auth.uid())
       OR (blocker_id = auth.uid() AND blocked_id = p_receiver_id)
  ) THEN
    RAISE EXCEPTION 'Cannot invite a blocked user';
  END IF;

  SELECT username INTO sender_name FROM profiles WHERE id = auth.uid();

  INSERT INTO invitations (type, resource_id, sender_id, receiver_id)
  VALUES (p_type, p_resource_id, auth.uid(), p_receiver_id)
  RETURNING id INTO inv_id;

  INSERT INTO notifications (user_id, sender_id, type, title, message, metadata)
  VALUES (
    p_receiver_id,
    auth.uid(),
    p_type || '_invite',
    sender_name || ' invited you to a ' || p_type,
    'Tap to view the invitation.',
    jsonb_build_object('invitation_id', inv_id, 'resource_id', p_resource_id, 'type', p_type)
  );

  RETURN inv_id;
END;
$$;

-- ----------------------------------------------------------------
-- FUNCTION: Accept invitation
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION accept_invitation(p_inv_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  inv RECORD;
BEGIN
  SELECT * INTO inv FROM invitations
  WHERE id = p_inv_id AND receiver_id = auth.uid() AND status = 'pending' AND expires_at > now();

  IF NOT FOUND THEN RETURN FALSE; END IF;

  UPDATE invitations SET status = 'accepted' WHERE id = p_inv_id;
  RETURN TRUE;
END;
$$;

-- ----------------------------------------------------------------
-- FUNCTION: Mark all notifications read for current user
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION mark_notifications_read()
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
AS $$
  UPDATE notifications SET is_read = true WHERE user_id = auth.uid() AND is_read = false;
$$;

-- ----------------------------------------------------------------
-- REALTIME
-- ----------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE invitations;
