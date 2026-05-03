-- ═══════════════════════════════════════════════════════════════════
-- CipherPool · Clans System Schema
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────
-- CLANS
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clans (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT NOT NULL,
  tag          TEXT NOT NULL CHECK (char_length(tag) <= 5),
  description  TEXT,
  rules        TEXT,
  requirements TEXT,
  logo_url     TEXT,
  accent_color TEXT DEFAULT '#00c49a',
  leader_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_open      BOOLEAN DEFAULT true,
  points       INTEGER DEFAULT 0,
  wins         INTEGER DEFAULT 0,
  losses       INTEGER DEFAULT 0,
  discord_link   TEXT,
  whatsapp_link  TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (name),
  UNIQUE (tag)
);

CREATE INDEX IF NOT EXISTS idx_clans_leader ON clans(leader_id);
CREATE INDEX IF NOT EXISTS idx_clans_points ON clans(points DESC);

ALTER TABLE clans ENABLE ROW LEVEL SECURITY;

-- Anyone can read clans
CREATE POLICY "clans_read" ON clans FOR SELECT USING (true);

-- Only authenticated users can create clans
CREATE POLICY "clans_insert" ON clans
  FOR INSERT WITH CHECK (auth.uid() = leader_id);

-- Only leader can update their clan
CREATE POLICY "clans_update" ON clans
  FOR UPDATE USING (auth.uid() = leader_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')
  ));

-- Only leader or admin can delete
CREATE POLICY "clans_delete" ON clans
  FOR DELETE USING (auth.uid() = leader_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')
  ));

-- ──────────────────────────────────────────────────────────────────
-- CLAN MEMBERS
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clan_members (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clan_id   UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'recruit'
              CHECK (role IN ('leader','co_leader','elite','member','recruit')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id)  -- one clan per user
);

CREATE INDEX IF NOT EXISTS idx_clan_members_clan  ON clan_members(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_members_user  ON clan_members(user_id);

ALTER TABLE clan_members ENABLE ROW LEVEL SECURITY;

-- Anyone can read members
CREATE POLICY "clan_members_read" ON clan_members FOR SELECT USING (true);

-- Leaders and co-leaders can add members
CREATE POLICY "clan_members_insert" ON clan_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM clan_members cm
      WHERE cm.clan_id = clan_id AND cm.user_id = auth.uid()
        AND cm.role IN ('leader','co_leader')
    )
  );

-- Leaders can update roles
CREATE POLICY "clan_members_update" ON clan_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM clan_members cm
      WHERE cm.clan_id = clan_id AND cm.user_id = auth.uid()
        AND cm.role IN ('leader','co_leader')
    )
  );

-- Members can leave (delete their own row), leaders can kick
CREATE POLICY "clan_members_delete" ON clan_members
  FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM clan_members cm
      WHERE cm.clan_id = clan_id AND cm.user_id = auth.uid()
        AND cm.role IN ('leader','co_leader')
    )
  );

-- ──────────────────────────────────────────────────────────────────
-- CLAN MESSAGES (chat)
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clan_messages (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clan_id    UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clan_messages_clan ON clan_messages(clan_id, created_at DESC);

ALTER TABLE clan_messages ENABLE ROW LEVEL SECURITY;

-- Only clan members can read messages
CREATE POLICY "clan_messages_read" ON clan_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clan_members cm
      WHERE cm.clan_id = clan_id AND cm.user_id = auth.uid()
    )
  );

-- Only clan members can write messages
CREATE POLICY "clan_messages_insert" ON clan_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM clan_members cm
      WHERE cm.clan_id = clan_id AND cm.user_id = auth.uid()
    )
  );

-- Users can delete their own messages
CREATE POLICY "clan_messages_delete" ON clan_messages
  FOR DELETE USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────
-- CLAN APPLICATIONS
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clan_applications (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clan_id    UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message    TEXT,
  status     TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','accepted','rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE (clan_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_clan_applications_clan ON clan_applications(clan_id, status);
CREATE INDEX IF NOT EXISTS idx_clan_applications_user ON clan_applications(user_id);

ALTER TABLE clan_applications ENABLE ROW LEVEL SECURITY;

-- Applicant and clan leaders can read
CREATE POLICY "clan_applications_read" ON clan_applications
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM clan_members cm
      WHERE cm.clan_id = clan_id AND cm.user_id = auth.uid()
        AND cm.role IN ('leader','co_leader')
    )
  );

-- Any authenticated user can apply
CREATE POLICY "clan_applications_insert" ON clan_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Leaders can accept/reject
CREATE POLICY "clan_applications_update" ON clan_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM clan_members cm
      WHERE cm.clan_id = clan_id AND cm.user_id = auth.uid()
        AND cm.role IN ('leader','co_leader')
    )
  );

-- Applicant can withdraw
CREATE POLICY "clan_applications_delete" ON clan_applications
  FOR DELETE USING (auth.uid() = user_id);
