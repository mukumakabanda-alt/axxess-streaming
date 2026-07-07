-- Clean up duplicate profile slot rows before enforcing uniqueness.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY account_id, profile_index
      ORDER BY
        CASE WHEN assigned_customer IS NOT NULL THEN 0 ELSE 1 END,
        CASE WHEN status <> 'available' THEN 0 ELSE 1 END,
        created_at ASC,
        id ASC
    ) AS rn
  FROM public.prime_profiles
)
DELETE FROM public.prime_profiles p
USING ranked r
WHERE p.id = r.id
  AND r.rn > 1;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY account_id, profile_index
      ORDER BY
        CASE WHEN assigned_customer IS NOT NULL THEN 0 ELSE 1 END,
        CASE WHEN status <> 'available' THEN 0 ELSE 1 END,
        created_at ASC,
        id ASC
    ) AS rn
  FROM public.netflix_profiles
)
DELETE FROM public.netflix_profiles p
USING ranked r
WHERE p.id = r.id
  AND r.rn > 1;

-- Enforce one slot per profile number per account.
ALTER TABLE public.prime_profiles
  ADD CONSTRAINT prime_profiles_account_profile_index_key
  UNIQUE (account_id, profile_index);

ALTER TABLE public.netflix_profiles
  ADD CONSTRAINT netflix_profiles_account_profile_index_key
  UNIQUE (account_id, profile_index);

-- Make slot creation idempotent as a second line of defense.
CREATE OR REPLACE FUNCTION public.create_prime_profile_slots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.prime_profiles (account_id, profile_index, profile_name, status)
  SELECT NEW.id, i, 'Profile ' || i, 'available'
  FROM generate_series(1,6) AS i
  ON CONFLICT (account_id, profile_index) DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_netflix_profile_slots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.netflix_profiles (account_id, profile_index, profile_name, status)
  SELECT NEW.id, i, 'Profile ' || i, 'available'
  FROM generate_series(1,5) AS i
  ON CONFLICT (account_id, profile_index) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Remove duplicate legacy trigger names and recreate one canonical trigger per account table.
DROP TRIGGER IF EXISTS create_prime_profile_slots_trigger ON public.prime_accounts;
DROP TRIGGER IF EXISTS trg_create_prime_profile_slots ON public.prime_accounts;
CREATE TRIGGER create_prime_profile_slots_trigger
AFTER INSERT ON public.prime_accounts
FOR EACH ROW EXECUTE FUNCTION public.create_prime_profile_slots();

DROP TRIGGER IF EXISTS create_netflix_profile_slots_trigger ON public.netflix_accounts;
DROP TRIGGER IF EXISTS trg_create_netflix_profiles ON public.netflix_accounts;
CREATE TRIGGER create_netflix_profile_slots_trigger
AFTER INSERT ON public.netflix_accounts
FOR EACH ROW EXECUTE FUNCTION public.create_netflix_profile_slots();

-- Keep these trigger helper functions non-callable from the public API.
REVOKE EXECUTE ON FUNCTION public.create_prime_profile_slots() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_netflix_profile_slots() FROM PUBLIC, anon, authenticated;