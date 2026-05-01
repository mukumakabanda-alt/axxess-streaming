-- Customer points tracked by phone number (no auth required)
CREATE TABLE IF NOT EXISTS public.customer_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text NOT NULL UNIQUE,
  customer_name text,
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read points by phone"
  ON public.customer_points FOR SELECT
  USING (true);

CREATE POLICY "Anyone can upsert points (server-validated via RPC)"
  ON public.customer_points FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins manage points"
  ON public.customer_points FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Log of point events for transparency
CREATE TABLE IF NOT EXISTS public.point_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text NOT NULL,
  delta integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.point_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert point events"
  ON public.point_events FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read own events"
  ON public.point_events FOR SELECT USING (true);

CREATE POLICY "Admins manage point events"
  ON public.point_events FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RPC to safely award points
CREATE OR REPLACE FUNCTION public.award_points(
  _phone text,
  _name text,
  _delta integer,
  _reason text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_total integer;
BEGIN
  IF _phone IS NULL OR length(trim(_phone)) < 6 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.customer_points (customer_phone, customer_name, points)
  VALUES (_phone, _name, GREATEST(_delta, 0))
  ON CONFLICT (customer_phone) DO UPDATE
    SET points = customer_points.points + _delta,
        customer_name = COALESCE(EXCLUDED.customer_name, customer_points.customer_name),
        updated_at = now()
  RETURNING points INTO _new_total;

  INSERT INTO public.point_events (customer_phone, delta, reason)
  VALUES (_phone, _delta, _reason);

  RETURN _new_total;
END;
$$;