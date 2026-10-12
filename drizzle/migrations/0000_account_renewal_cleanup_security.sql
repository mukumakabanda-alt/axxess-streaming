ALTER TABLE public.netflix_accounts ADD COLUMN IF NOT EXISTS renewal_date date;
ALTER TABLE public.prime_accounts ADD COLUMN IF NOT EXISTS renewal_date date;

CREATE OR REPLACE FUNCTION public.cleanup_old_customer_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  DELETE FROM public.subscriptions
   WHERE created_at < now() - interval '90 days' AND end_date < current_date;
  DELETE FROM public.orders o
   WHERE o.created_at < now() - interval '90 days'
     AND NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.order_id = o.id);
END; $$;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_customer_data() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule('cleanup-old-orders-daily') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='cleanup-old-orders-daily');
SELECT cron.schedule('cleanup-old-orders-daily', '30 1 * * *', $$SELECT public.cleanup_old_customer_data();$$);

DROP POLICY IF EXISTS "Anyone can lookup referral by code" ON public.referrals;
CREATE POLICY "Admins view referrals" ON public.referrals FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Anyone can create a referral code" ON public.referrals;
CREATE POLICY "Anyone can create a referral code" ON public.referrals FOR INSERT TO anon, authenticated
  WITH CHECK (length(trim(owner_name)) BETWEEN 1 AND 100 AND length(trim(owner_phone)) BETWEEN 6 AND 20
    AND length(code) BETWEEN 3 AND 32 AND uses_count = 0 AND reward_days_earned = 0 AND visits_count = 0);

DROP POLICY IF EXISTS "Anyone can submit an order" ON public.orders;
CREATE POLICY "Anyone can submit an order" ON public.orders FOR INSERT TO anon, authenticated
  WITH CHECK (length(trim(customer_name)) BETWEEN 1 AND 100 AND length(trim(customer_phone)) BETWEEN 6 AND 20
    AND price_snapshot >= 0 AND price_snapshot < 100000
    AND (status = 'pending' OR public.has_role(auth.uid(),'admin'))
    AND (admin_notes IS NULL OR public.has_role(auth.uid(),'admin')));