-- ══════════════════════════════════════════════════════════════════════
-- sql/83 — WhatsApp Broadcast history table
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.whatsapp_broadcasts (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by        uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  message        text        NOT NULL,
  target_type    text        NOT NULL,
  target_filters jsonb       NOT NULL DEFAULT '{}',
  total_count    int         NOT NULL DEFAULT 0,
  sent_count     int         NOT NULL DEFAULT 0,
  failed_count   int         NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wb_created_at_idx ON public.whatsapp_broadcasts(created_at DESC);
CREATE INDEX IF NOT EXISTS wb_sent_by_idx    ON public.whatsapp_broadcasts(sent_by);

GRANT ALL ON TABLE public.whatsapp_broadcasts TO postgres, anon, authenticated, service_role;

ALTER TABLE public.whatsapp_broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_wa_broadcasts"   ON public.whatsapp_broadcasts;
DROP POLICY IF EXISTS "staff_insert_wa_broadcasts"  ON public.whatsapp_broadcasts;

CREATE POLICY "staff_read_wa_broadcasts" ON public.whatsapp_broadcasts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','super_admin','founder','fondateur')
    )
  );

CREATE POLICY "staff_insert_wa_broadcasts" ON public.whatsapp_broadcasts
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);
