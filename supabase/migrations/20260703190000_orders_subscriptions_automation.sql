-- =========================================================
-- ORDERS <-> SUBSCRIPTIONS <-> NETFLIX/PRIME PROFILE AUTOMATION
-- =========================================================
-- What this does:
--   1. Adds a name-based service classifier so "Netflix (3 months)",
--      "Prime Video", "All Access" etc. all classify consistently.
--   2. De-duplicates any existing active subscriptions that share the same
--      phone + service (keeping the one with the furthest end_date), then
--      enforces one active subscription per customer+service going forward.
--   3. Links orders & subscriptions to an actual netflix_profiles /
--      prime_profiles row, instead of that link only existing informally
--      in a profile's free-text "assigned_customer" field.
--   4. Best-effort backfills that link for existing subscriptions by
--      matching customer name <-> assigned_customer, but only where the
--      match is unambiguous. Anything it can't confidently match is left
--      NULL — nothing is guessed wrongly; the admin will be asked to
--      confirm a profile the next time that subscription renews.
--   5. Fixes subscriptions.order_id so deleting an old order can no longer
--      cascade-delete a live subscription record.
--   6. Auto-recomputes services.is_full straight from real profile
--      inventory, any time a Netflix/Prime profile's status changes.
--   7. Auto-expires subscriptions past end_date and frees their profile
--      (marking it vulnerable — same as the existing manual "mark
--      expired" action already does).
--   8. Cleans up orders older than 90 days automatically.
--   9. Adds a push_subscribers table so the admin can see who's actually
--      reachable by push, to avoid double-sending a renewal reminder.
-- =========================================================

-- 1) Service classifier ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.classify_streaming_service(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _name ILIKE '%all%' OR _name ILIKE '%bundle%'
      OR (_name ILIKE '%netflix%' AND _name ILIKE '%prime%') THEN 'all-access'
    WHEN _name ILIKE '%netflix%' THEN 'netflix'
    WHEN _name ILIKE '%prime%'   THEN 'prime'
    ELSE 'other'
  END;
$$;

-- 2) De-duplicate existing active subscriptions before locking this down ----
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY customer_phone, public.classify_streaming_service(service_name)
           ORDER BY end_date DESC, created_at DESC
         ) AS rn
  FROM public.subscriptions
  WHERE is_active = true
)
UPDATE public.subscriptions s
SET is_active = false
FROM ranked r
WHERE s.id = r.id AND r.rn > 1;

-- Generated column so the app can read the classification straight off the
-- row, and so we can index/enforce on it without repeating the ILIKE logic.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS service_type text
  GENERATED ALWAYS AS (public.classify_streaming_service(service_name)) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_subscription_per_customer_service
  ON public.subscriptions (customer_phone, service_type)
  WHERE is_active = true;

-- 3) Link orders & subscriptions to a real profile row -----------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS netflix_profile_id uuid REFERENCES public.netflix_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prime_profile_id   uuid REFERENCES public.prime_profiles(id)   ON DELETE SET NULL;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS netflix_profile_id uuid REFERENCES public.netflix_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prime_profile_id   uuid REFERENCES public.prime_profiles(id)   ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_netflix_profile ON public.subscriptions(netflix_profile_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_prime_profile   ON public.subscriptions(prime_profile_id);
CREATE INDEX IF NOT EXISTS idx_orders_netflix_profile        ON public.orders(netflix_profile_id);
CREATE INDEX IF NOT EXISTS idx_orders_prime_profile          ON public.orders(prime_profile_id);

-- 4) Best-effort backfill of that link for existing subscriptions -----------
WITH netflix_matches AS (
  SELECT s.id AS sub_id, p.id AS profile_id
  FROM public.subscriptions s
  JOIN public.netflix_profiles p
    ON lower(trim(p.assigned_customer)) = lower(trim(s.customer_name))
   AND p.status IN ('active', 'locked')
  WHERE s.netflix_profile_id IS NULL
    AND s.service_type IN ('netflix', 'all-access')
    AND (SELECT count(*) FROM public.subscriptions s2
         WHERE lower(trim(s2.customer_name)) = lower(trim(s.customer_name))
           AND s2.service_type IN ('netflix', 'all-access')) = 1
    AND (SELECT count(*) FROM public.netflix_profiles p2
         WHERE lower(trim(p2.assigned_customer)) = lower(trim(p.assigned_customer))
           AND p2.status IN ('active', 'locked')) = 1
)
UPDATE public.subscriptions s
SET netflix_profile_id = m.profile_id
FROM netflix_matches m
WHERE s.id = m.sub_id;

WITH prime_matches AS (
  SELECT s.id AS sub_id, p.id AS profile_id
  FROM public.subscriptions s
  JOIN public.prime_profiles p
    ON lower(trim(p.assigned_customer)) = lower(trim(s.customer_name))
   AND p.status IN ('active', 'locked')
  WHERE s.prime_profile_id IS NULL
    AND s.service_type IN ('prime', 'all-access')
    AND (SELECT count(*) FROM public.subscriptions s2
         WHERE lower(trim(s2.customer_name)) = lower(trim(s.customer_name))
           AND s2.service_type IN ('prime', 'all-access')) = 1
    AND (SELECT count(*) FROM public.prime_profiles p2
         WHERE lower(trim(p2.assigned_customer)) = lower(trim(p.assigned_customer))
           AND p2.status IN ('active', 'locked')) = 1
)
UPDATE public.subscriptions s
SET prime_profile_id = m.profile_id
FROM prime_matches m
WHERE s.id = m.sub_id;

-- 5) Stop order cleanup from ever cascading into live subscriptions ---------
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_order_id_fkey;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

-- 6) Auto-sync services.is_full from real profile inventory ------------------
CREATE OR REPLACE FUNCTION public.recompute_service_fullness()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _netflix_full boolean;
  _prime_full   boolean;
BEGIN
  SELECT NOT EXISTS (
    SELECT 1 FROM public.netflix_profiles WHERE status = 'available' AND is_vulnerable = false
  ) INTO _netflix_full;

  SELECT NOT EXISTS (
    SELECT 1 FROM public.prime_profiles WHERE status = 'available' AND is_vulnerable = false
  ) INTO _prime_full;

  UPDATE public.services
  SET is_full = _netflix_full
  WHERE (name ILIKE '%netflix%' OR slug ILIKE '%netflix%')
    AND NOT (name ILIKE '%all%' OR slug ILIKE '%all%' OR name ILIKE '%bundle%' OR slug ILIKE '%bundle%');

  UPDATE public.services
  SET is_full = _prime_full
  WHERE (name ILIKE '%prime%' OR slug ILIKE '%prime%')
    AND NOT (name ILIKE '%all%' OR slug ILIKE '%all%' OR name ILIKE '%bundle%' OR slug ILIKE '%bundle%');

  UPDATE public.services
  SET is_full = (_netflix_full OR _prime_full)
  WHERE (name ILIKE '%all%' OR slug ILIKE '%all%' OR name ILIKE '%bundle%' OR slug ILIKE '%bundle%');
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recompute_service_fullness()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.recompute_service_fullness();
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_netflix_profiles_sync_fullness ON public.netflix_profiles;
CREATE TRIGGER trg_netflix_profiles_sync_fullness
AFTER INSERT OR UPDATE OR DELETE ON public.netflix_profiles
FOR EACH STATEMENT EXECUTE FUNCTION public.trg_recompute_service_fullness();

DROP TRIGGER IF EXISTS trg_prime_profiles_sync_fullness ON public.prime_profiles;
CREATE TRIGGER trg_prime_profiles_sync_fullness
AFTER INSERT OR UPDATE OR DELETE ON public.prime_profiles
FOR EACH STATEMENT EXECUTE FUNCTION public.trg_recompute_service_fullness();

-- 7) Auto-expire subscriptions & free their profile ---------------------------
CREATE OR REPLACE FUNCTION public.expire_subscriptions_and_free_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.netflix_profiles p
  SET assigned_customer = NULL, status = 'available', is_vulnerable = true
  FROM public.subscriptions s
  WHERE s.netflix_profile_id = p.id
    AND s.is_active = true
    AND s.end_date < CURRENT_DATE;

  UPDATE public.prime_profiles p
  SET assigned_customer = NULL, status = 'available', is_vulnerable = true
  FROM public.subscriptions s
  WHERE s.prime_profile_id = p.id
    AND s.is_active = true
    AND s.end_date < CURRENT_DATE;

  UPDATE public.subscriptions
  SET is_active = false, netflix_profile_id = NULL, prime_profile_id = NULL
  WHERE is_active = true
    AND end_date < CURRENT_DATE;
END;
$$;

-- Runs just after the existing midnight-Lusaka resets (22:00 UTC = 00:00
-- CAT), so profiles are freed before anyone opens the dashboard next morning.
SELECT cron.unschedule('expire-subscriptions-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-subscriptions-daily');

SELECT cron.schedule(
  'expire-subscriptions-daily',
  '5 22 * * *',
  $$SELECT public.expire_subscriptions_and_free_profiles();$$
);

-- Run once now so anything already overdue is cleaned up immediately,
-- instead of waiting for tonight's run.
SELECT public.expire_subscriptions_and_free_profiles();
SELECT public.recompute_service_fullness();

-- 8) Auto-clean old orders ----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

-- 90 days is a judgement call, not a hard requirement — long enough to
-- cover a payment dispute or a "did I already order this" question, short
-- enough that the Orders tab doesn't accumulate months of dead history.
-- Change the interval below if a different window suits better.
SELECT cron.unschedule('cleanup-old-orders-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-orders-daily');

SELECT cron.schedule(
  'cleanup-old-orders-daily',
  '15 22 * * *',
  $$DELETE FROM public.orders WHERE created_at < now() - interval '90 days';$$
);

-- 9) Push opt-in tracking ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_subscribers (
  customer_phone text PRIMARY KEY,
  onesignal_id   text,
  subscribed_at  timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscribers ENABLE ROW LEVEL SECURITY;

-- Same "Public full access" pattern every other table in this project uses
-- (see 20260702034906) because /admin has no login screen yet — there's no
-- auth.uid() for an admin-only policy to check.
DROP POLICY IF EXISTS "Public full access" ON public.push_subscribers;
CREATE POLICY "Public full access" ON public.push_subscribers
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscribers TO anon, authenticated;
