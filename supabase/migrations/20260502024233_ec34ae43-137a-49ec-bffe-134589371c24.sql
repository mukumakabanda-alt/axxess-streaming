
-- Shared updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1. Account inventory
CREATE TABLE public.account_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  account_email text NOT NULL,
  account_password text NOT NULL,
  profile_slot text,
  status text NOT NULL DEFAULT 'available',
  assigned_order_id uuid,
  assigned_customer_name text,
  assigned_customer_phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.account_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage inventory"
ON public.account_inventory
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_account_inventory_updated
BEFORE UPDATE ON public.account_inventory
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Page visits
CREATE TABLE public.page_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL DEFAULT '/',
  referer text,
  user_agent text,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_page_visits_created_at ON public.page_visits (created_at DESC);

ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a visit"
ON public.page_visits
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins read visits"
ON public.page_visits
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.log_page_visit(_path text, _session text, _ua text, _referer text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.page_visits (path, session_id, user_agent, referer)
  VALUES (COALESCE(_path, '/'), _session, _ua, _referer);
END;
$$;

-- 3. Order duration
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS duration_days integer,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_orders_updated') THEN
    CREATE TRIGGER trg_orders_updated
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;
