-- WARNING: User explicitly requested no-auth admin access.
-- Open RLS so the admin dashboard works without login.

-- Helper: drop & recreate permissive policies on a table
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['services','orders','subscriptions','testimonials','updates','referrals','site_settings']) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public full access" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Public full access" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- Storage: allow public read + write on intro-video bucket
DROP POLICY IF EXISTS "intro_video_public_all" ON storage.objects;
CREATE POLICY "intro_video_public_all"
  ON storage.objects FOR ALL
  TO anon, authenticated
  USING (bucket_id = 'intro-video')
  WITH CHECK (bucket_id = 'intro-video');

-- Make sure bucket is public for reading the video on the site
UPDATE storage.buckets SET public = true WHERE id = 'intro-video';