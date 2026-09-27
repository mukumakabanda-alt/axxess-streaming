-- Lock inventory tables and reservations to signed-in admins.
DROP POLICY IF EXISTS "Public full access" ON public.netflix_accounts;
DROP POLICY IF EXISTS "Public full access" ON public.netflix_profiles;
DROP POLICY IF EXISTS "Public full access" ON public.prime_accounts;
DROP POLICY IF EXISTS "Public full access" ON public.prime_profiles;
DROP POLICY IF EXISTS "Public full access" ON public.reservations;
DROP POLICY IF EXISTS "Anyone can create a reservation" ON public.reservations;

-- Reservations: customers may still submit, only admins can read/manage.
CREATE POLICY "Anyone can submit a reservation" ON public.reservations
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(trim(customer_name)) BETWEEN 2 AND 80
    AND length(regexp_replace(customer_phone, '\D', '', 'g')) BETWEEN 9 AND 15
    AND length(trim(service_name)) BETWEEN 1 AND 120
    AND (note IS NULL OR length(note) <= 500)
    AND status = 'pending'
  );

REVOKE ALL ON public.netflix_accounts FROM anon;
REVOKE ALL ON public.netflix_profiles FROM anon;
REVOKE ALL ON public.prime_accounts FROM anon;
REVOKE ALL ON public.prime_profiles FROM anon;
REVOKE ALL ON public.reservations FROM anon;
GRANT INSERT ON public.reservations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.netflix_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.netflix_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prime_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prime_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;