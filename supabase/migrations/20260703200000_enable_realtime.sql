-- =========================================================
-- ENABLE REALTIME — NETFLIX/PRIME ADMIN TABS + PRICING PAGE
-- =========================================================
-- Lets the Netflix tab, Prime Video tab, and the public Pricing page
-- reflect database changes the moment they happen — no tab switch, no
-- page refresh. Covers both directions Stan asked about:
--   • Admin side:  netflix_accounts, netflix_profiles,
--                  prime_accounts,   prime_profiles
--   • Public side: services (drives the "Full" badge on Pricing)
--
-- Nothing else needed on the RLS side — every one of these tables already
-- has a "Public full access" SELECT-permissive policy, and Realtime
-- respects existing RLS, so the same policy that lets the anon client read
-- these tables today already lets it receive change events for them.
-- =========================================================

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'netflix_accounts', 'netflix_profiles',
    'prime_accounts',   'prime_profiles',
    'services'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
