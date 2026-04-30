ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS visits_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.referral_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid REFERENCES public.referrals(id) ON DELETE CASCADE,
  code text NOT NULL,
  user_agent text,
  referer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a visit" ON public.referral_visits FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Admins view visits" ON public.referral_visits FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete visits" ON public.referral_visits FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.record_referral_visit(_code text, _user_agent text, _referer text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ref_id uuid;
BEGIN
  SELECT id INTO _ref_id FROM public.referrals WHERE code = _code LIMIT 1;
  IF _ref_id IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.referral_visits (referral_id, code, user_agent, referer) VALUES (_ref_id, _code, _user_agent, _referer);
  UPDATE public.referrals SET visits_count = COALESCE(visits_count, 0) + 1 WHERE id = _ref_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_referral_visit(text, text, text) TO anon, authenticated;