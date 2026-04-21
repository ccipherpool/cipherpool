-- ═══════════════════════════════════════════════════════════════════
-- CipherPool · Supabase Schema Extensions
-- Run these in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────
-- FRIENDSHIPS TABLE
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friendships (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at   TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,

  -- Prevent duplicate relationships
  UNIQUE (requester_id, addressee_id),
  -- Prevent self-friendship
  CHECK (requester_id <> addressee_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);

-- RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Users can read friendships they're part of
CREATE POLICY "friendships_read" ON friendships
  FOR SELECT USING (
    auth.uid() = requester_id OR auth.uid() = addressee_id
  );

-- Users can insert (send friend requests)
CREATE POLICY "friendships_insert" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Users can update status of requests sent TO them
CREATE POLICY "friendships_update_addressee" ON friendships
  FOR UPDATE USING (auth.uid() = addressee_id)
  WITH CHECK (status IN ('accepted','rejected'));

-- Users can delete their own friendships (unfriend / cancel request)
CREATE POLICY "friendships_delete" ON friendships
  FOR DELETE USING (
    auth.uid() = requester_id OR auth.uid() = addressee_id
  );

-- ──────────────────────────────────────────────────────────────────
-- APP CONFIG TABLE (for maintenance mode, settings, etc.)
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_config (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);

-- Seed initial values
INSERT INTO app_config (key, value) VALUES
  ('maintenance_enabled',   'false'),
  ('maintenance_message',   NULL),
  ('maintenance_return_at', NULL)
ON CONFLICT (key) DO NOTHING;

-- RLS: anyone can read config (for maintenance check), only super_admin can write
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_config_read" ON app_config FOR SELECT USING (true);

CREATE POLICY "app_config_write" ON app_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ──────────────────────────────────────────────────────────────────
-- LAST SEEN — update on auth events (optional trigger)
-- ──────────────────────────────────────────────────────────────────
-- Add last_seen column to profiles if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now();

-- ──────────────────────────────────────────────────────────────────
-- NOTIFICATIONS TABLE (if not already created)
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'general',
  priority    TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  title       TEXT,
  body        TEXT NOT NULL,
  data        JSONB DEFAULT '{}',
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_read" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can insert notifications for any user
CREATE POLICY "notifications_insert_admin" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin','super_admin')
    )
  );

-- Users can insert notifications for themselves (e.g. system-side)
CREATE POLICY "notifications_insert_self" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
