DROP TRIGGER IF EXISTS trg_create_netflix_profiles ON public.netflix_accounts;
DROP TRIGGER IF EXISTS trg_create_prime_profile_slots ON public.prime_accounts;

-- Keep exactly one profile-slot trigger for each account table.
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