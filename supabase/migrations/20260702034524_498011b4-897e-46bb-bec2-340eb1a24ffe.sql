
-- =========================================================
-- 1) PRIME VIDEO TABLES (mirror netflix_accounts / netflix_profiles)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.prime_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_email text NOT NULL,
  account_password text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prime_accounts TO authenticated;
GRANT ALL ON public.prime_accounts TO service_role;

ALTER TABLE public.prime_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage prime accounts"
  ON public.prime_accounts FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_prime_accounts_updated_at
  BEFORE UPDATE ON public.prime_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.prime_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.prime_accounts(id) ON DELETE CASCADE,
  profile_index integer NOT NULL,
  profile_name text NOT NULL DEFAULT '',
  assigned_customer text,
  pin text,
  default_pin text,
  is_vulnerable boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prime_profiles TO authenticated;
GRANT ALL ON public.prime_profiles TO service_role;

ALTER TABLE public.prime_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage prime profiles"
  ON public.prime_profiles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_prime_profiles_updated_at
  BEFORE UPDATE ON public.prime_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create 5 profile slots on new prime_accounts insert
CREATE OR REPLACE FUNCTION public.create_prime_profile_slots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.prime_profiles (account_id, profile_index, profile_name, status)
  SELECT NEW.id, i, 'Profile ' || i, 'available' FROM generate_series(1,5) AS i;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_prime_profile_slots
  AFTER INSERT ON public.prime_accounts
  FOR EACH ROW EXECUTE FUNCTION public.create_prime_profile_slots();

-- =========================================================
-- 2) Drop unused account_inventory table
-- =========================================================
DROP TABLE IF EXISTS public.account_inventory CASCADE;

-- =========================================================
-- 3) UPDATES engagement tracking
-- =========================================================
ALTER TABLE public.updates
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS share_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS views_today integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS likes_today integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares_today integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_update_view(_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.updates SET view_count = view_count + 1, views_today = views_today + 1 WHERE id = _id;
$$;

CREATE OR REPLACE FUNCTION public.increment_update_like(_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.updates SET like_count = like_count + 1, likes_today = likes_today + 1 WHERE id = _id;
$$;

CREATE OR REPLACE FUNCTION public.increment_update_share(_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.updates SET share_count = share_count + 1, shares_today = shares_today + 1 WHERE id = _id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_update_view(uuid)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_update_like(uuid)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_update_share(uuid) TO anon, authenticated;

-- Daily reset at midnight Africa/Lusaka (UTC+2) => 22:00 UTC
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reset-updates-daily-counters') THEN
    PERFORM cron.unschedule('reset-updates-daily-counters');
  END IF;
END $$;

SELECT cron.schedule(
  'reset-updates-daily-counters',
  '0 22 * * *',
  $$UPDATE public.updates SET views_today = 0, likes_today = 0, shares_today = 0;$$
);

-- =========================================================
-- 4) Fix "Public full access" hazards on remaining tables
--    (mirrors admin-only + specific public policy pattern already used elsewhere)
-- =========================================================
DROP POLICY IF EXISTS "Public full access" ON public.orders;
DROP POLICY IF EXISTS "Public full access" ON public.referrals;
DROP POLICY IF EXISTS "Public full access" ON public.reservations;
DROP POLICY IF EXISTS "Public full access" ON public.services;
DROP POLICY IF EXISTS "Public full access" ON public.site_settings;
DROP POLICY IF EXISTS "Public full access" ON public.subscriptions;
DROP POLICY IF EXISTS "Public full access" ON public.testimonials;
DROP POLICY IF EXISTS "Public full access" ON public.updates;

-- Ensure specific public policies exist to keep the app working:
-- subscriptions: admin can already manage; app reads via admin panel only. Nothing to add.
-- testimonials: allow public insert (submit review)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='testimonials' AND policyname='Anyone can submit a testimonial') THEN
    CREATE POLICY "Anyone can submit a testimonial" ON public.testimonials FOR INSERT TO public WITH CHECK (true);
  END IF;
END $$;

-- reservations: public insert already exists; admin ALL already exists. OK.
-- referrals: public insert + lookup already exist. OK.
-- orders: public insert + admin manage already exist. OK.
-- services: admin manage + public select active already exist. OK.
-- site_settings: admin manage + public read already exist. OK.
-- updates: admin manage + public view published already exist. OK.
