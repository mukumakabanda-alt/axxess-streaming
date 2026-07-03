-- Prime Video accounts should get 6 profile slots, not 5 (Netflix stays at 5).
-- This only touches the Prime Video trigger function — the Netflix one
-- (create_netflix_profile_slots) is untouched.

CREATE OR REPLACE FUNCTION public.create_prime_profile_slots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.prime_profiles (account_id, profile_index, profile_name, status)
  SELECT NEW.id, i, 'Profile ' || i, 'available' FROM generate_series(1,6) AS i;
  RETURN NEW;
END;
$$;

-- Backfill: any Prime Video account created before this migration only has
-- profile_index 1-5. Add the missing 6th slot for those without touching
-- any of their existing 5 profiles (assignments, PINs, vulnerable flags
-- all stay exactly as they are).
INSERT INTO public.prime_profiles (account_id, profile_index, profile_name, status)
SELECT a.id, 6, 'Profile 6', 'available'
FROM public.prime_accounts a
WHERE NOT EXISTS (
  SELECT 1 FROM public.prime_profiles p
  WHERE p.account_id = a.id AND p.profile_index = 6
);
