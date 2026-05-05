-- Track which reward tiers have been notified to admin (to avoid duplicates)
CREATE TABLE public.reward_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text NOT NULL,
  customer_name text,
  tier_points integer NOT NULL,
  tier_label text NOT NULL,
  acknowledged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_phone, tier_points)
);

ALTER TABLE public.reward_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert reward unlocks"
  ON public.reward_unlocks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can read reward unlocks"
  ON public.reward_unlocks FOR SELECT
  USING (true);

CREATE POLICY "Admins manage reward unlocks"
  ON public.reward_unlocks FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can update reward unlocks"
  ON public.reward_unlocks FOR UPDATE
  USING (true) WITH CHECK (true);