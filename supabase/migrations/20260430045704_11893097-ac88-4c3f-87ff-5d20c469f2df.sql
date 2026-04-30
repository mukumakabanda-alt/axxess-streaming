
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS is_full boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  service_id uuid,
  service_name text NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create a reservation"
  ON public.reservations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins manage reservations"
  ON public.reservations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
