
-- Prime Video: 6 profiles per account (not 5). Netflix stays at 5.
CREATE OR REPLACE FUNCTION public.create_prime_profile_slots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.prime_profiles (account_id, profile_index, profile_name, status)
  SELECT NEW.id, i, 'Profile ' || i, 'available' FROM generate_series(1,6) AS i;
  RETURN NEW;
END;
$function$;

-- Ensure triggers exist (they were previously dropped as duplicates and never re-added)
DROP TRIGGER IF EXISTS trg_create_prime_profile_slots ON public.prime_accounts;
CREATE TRIGGER trg_create_prime_profile_slots
AFTER INSERT ON public.prime_accounts
FOR EACH ROW EXECUTE FUNCTION public.create_prime_profile_slots();

DROP TRIGGER IF EXISTS trg_create_netflix_profiles ON public.netflix_accounts;
CREATE TRIGGER trg_create_netflix_profiles
AFTER INSERT ON public.netflix_accounts
FOR EACH ROW EXECUTE FUNCTION public.create_netflix_profile_slots();

-- Backfill: any prime account with fewer than 6 profile slots gets the missing ones
INSERT INTO public.prime_profiles (account_id, profile_index, profile_name, status)
SELECT a.id, i, 'Profile ' || i, 'available'
FROM public.prime_accounts a
CROSS JOIN generate_series(1,6) AS i
WHERE NOT EXISTS (
  SELECT 1 FROM public.prime_profiles p
  WHERE p.account_id = a.id AND p.profile_index = i
);

-- Backfill any netflix accounts missing slots too
INSERT INTO public.netflix_profiles (account_id, profile_index, profile_name, status)
SELECT a.id, i, 'Profile ' || i, 'available'
FROM public.netflix_accounts a
CROSS JOIN generate_series(1,5) AS i
WHERE NOT EXISTS (
  SELECT 1 FROM public.netflix_profiles p
  WHERE p.account_id = a.id AND p.profile_index = i
);
