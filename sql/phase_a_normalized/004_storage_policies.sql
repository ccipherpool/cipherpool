-- CipherPool Phase A normalized migration set
-- 004_storage_policies.sql
-- Purpose: safe storage bucket definitions and object policies.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('screenshots', 'screenshots', true, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('tournament-banners', 'tournament-banners', true, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('store-items', 'store-items', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "avatars_read_public" ON storage.objects;
DROP POLICY IF EXISTS "avatars_write_owner" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_owner" ON storage.objects;
DROP POLICY IF EXISTS "screenshots_read_public" ON storage.objects;
DROP POLICY IF EXISTS "screenshots_insert_owner" ON storage.objects;
DROP POLICY IF EXISTS "tournament_banners_read_public" ON storage.objects;
DROP POLICY IF EXISTS "tournament_banners_staff_write" ON storage.objects;
DROP POLICY IF EXISTS "store_items_read_public" ON storage.objects;
DROP POLICY IF EXISTS "store_items_designer_write" ON storage.objects;

CREATE POLICY "avatars_read_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_write_owner" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_update_owner" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "screenshots_read_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'screenshots');

CREATE POLICY "screenshots_insert_owner" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'screenshots'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "tournament_banners_read_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'tournament-banners');

CREATE POLICY "tournament_banners_staff_write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tournament-banners'
    AND public.is_role(ARRAY['founder','fondateur','admin','super_admin'])
  );

CREATE POLICY "store_items_read_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'store-items');

CREATE POLICY "store_items_designer_write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'store-items'
    AND public.is_role(ARRAY['designer','admin','super_admin'])
  );
