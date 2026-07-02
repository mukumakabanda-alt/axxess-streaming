-- Fix admin inventory access for the current unauthenticated admin page pattern.
-- The tables still have RLS enabled; these policies match the existing public-admin access pattern.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.netflix_accounts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.netflix_profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prime_accounts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prime_profiles TO anon, authenticated;
GRANT ALL ON public.netflix_accounts TO service_role;
GRANT ALL ON public.netflix_profiles TO service_role;
GRANT ALL ON public.prime_accounts TO service_role;
GRANT ALL ON public.prime_profiles TO service_role;

DROP POLICY IF EXISTS "Public full access" ON public.netflix_accounts;
DROP POLICY IF EXISTS "Public full access" ON public.netflix_profiles;
DROP POLICY IF EXISTS "Public full access" ON public.prime_accounts;
DROP POLICY IF EXISTS "Public full access" ON public.prime_profiles;

CREATE POLICY "Public full access"
ON public.netflix_accounts
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Public full access"
ON public.netflix_profiles
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Public full access"
ON public.prime_accounts
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Public full access"
ON public.prime_profiles
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Ensure profile slots are created automatically for both streaming inventory types.
DROP TRIGGER IF EXISTS create_netflix_profile_slots_trigger ON public.netflix_accounts;
CREATE TRIGGER create_netflix_profile_slots_trigger
AFTER INSERT ON public.netflix_accounts
FOR EACH ROW
EXECUTE FUNCTION public.create_netflix_profile_slots();

DROP TRIGGER IF EXISTS create_prime_profile_slots_trigger ON public.prime_accounts;
CREATE TRIGGER create_prime_profile_slots_trigger
AFTER INSERT ON public.prime_accounts
FOR EACH ROW
EXECUTE FUNCTION public.create_prime_profile_slots();

-- Ensure updated_at stays current when admin records are edited.
DROP TRIGGER IF EXISTS update_netflix_accounts_updated_at ON public.netflix_accounts;
CREATE TRIGGER update_netflix_accounts_updated_at
BEFORE UPDATE ON public.netflix_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_netflix_profiles_updated_at ON public.netflix_profiles;
CREATE TRIGGER update_netflix_profiles_updated_at
BEFORE UPDATE ON public.netflix_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_prime_accounts_updated_at ON public.prime_accounts;
CREATE TRIGGER update_prime_accounts_updated_at
BEFORE UPDATE ON public.prime_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_prime_profiles_updated_at ON public.prime_profiles;
CREATE TRIGGER update_prime_profiles_updated_at
BEFORE UPDATE ON public.prime_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();