
-- Fix: allow admin UI to delete/hide visitor messages even without authenticated admin role
DROP POLICY IF EXISTS "Public can delete messages" ON public.public_messages;
CREATE POLICY "Public can delete messages" ON public.public_messages
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public can update messages" ON public.public_messages;
CREATE POLICY "Public can update messages" ON public.public_messages
  FOR UPDATE USING (true) WITH CHECK (true);

-- Netflix accounts
CREATE TABLE IF NOT EXISTS public.netflix_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_email TEXT NOT NULL,
  account_password TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.netflix_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access netflix accounts" ON public.netflix_accounts
  FOR ALL USING (true) WITH CHECK (true);

-- Netflix profiles (5 per account)
CREATE TABLE IF NOT EXISTS public.netflix_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.netflix_accounts(id) ON DELETE CASCADE,
  profile_index INT NOT NULL CHECK (profile_index BETWEEN 1 AND 5),
  profile_name TEXT NOT NULL DEFAULT '',
  assigned_customer TEXT,
  pin TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, profile_index)
);

ALTER TABLE public.netflix_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access netflix profiles" ON public.netflix_profiles
  FOR ALL USING (true) WITH CHECK (true);

-- Auto-create 5 profile slots when an account is added
CREATE OR REPLACE FUNCTION public.create_netflix_profile_slots()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.netflix_profiles (account_id, profile_index, profile_name, status)
  SELECT NEW.id, i, 'Profile ' || i, 'available' FROM generate_series(1,5) AS i;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_netflix_profiles ON public.netflix_accounts;
CREATE TRIGGER trg_create_netflix_profiles
  AFTER INSERT ON public.netflix_accounts
  FOR EACH ROW EXECUTE FUNCTION public.create_netflix_profile_slots();
