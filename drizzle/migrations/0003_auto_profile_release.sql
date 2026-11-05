CREATE OR REPLACE FUNCTION public.sync_profile_assignments()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Expired subscriptions become inactive
  UPDATE subscriptions SET is_active = false, updated_at = now()
   WHERE is_active AND end_date < current_date;

  -- Renewed / active subscriptions: put the customer back on their profile
  UPDATE netflix_profiles p SET status='active', assigned_customer=s.customer_name, is_vulnerable=false, updated_at=now()
    FROM subscriptions s
   WHERE s.netflix_profile_id = p.id AND s.end_date >= current_date
     AND (p.status <> 'active' OR p.assigned_customer IS DISTINCT FROM s.customer_name OR p.is_vulnerable);
  UPDATE prime_profiles p SET status='active', assigned_customer=s.customer_name, is_vulnerable=false, updated_at=now()
    FROM subscriptions s
   WHERE s.prime_profile_id = p.id AND s.end_date >= current_date
     AND (p.status <> 'active' OR p.assigned_customer IS DISTINCT FROM s.customer_name OR p.is_vulnerable);

  -- Expired with no running subscription: free the profile and flag the PIN as vulnerable until changed
  UPDATE netflix_profiles p SET status='available', assigned_customer=NULL, is_vulnerable=true, updated_at=now()
   WHERE p.status='active'
     AND EXISTS (SELECT 1 FROM subscriptions s WHERE s.netflix_profile_id=p.id AND s.end_date < current_date)
     AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.netflix_profile_id=p.id AND s.end_date >= current_date);
  UPDATE prime_profiles p SET status='available', assigned_customer=NULL, is_vulnerable=true, updated_at=now()
   WHERE p.status='active'
     AND EXISTS (SELECT 1 FROM subscriptions s WHERE s.prime_profile_id=p.id AND s.end_date < current_date)
     AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.prime_profile_id=p.id AND s.end_date >= current_date);
END $$;
REVOKE ALL ON FUNCTION public.sync_profile_assignments() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_sync_profiles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF pg_trigger_depth() = 1 THEN PERFORM public.sync_profile_assignments(); END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.trg_sync_profiles() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS subscriptions_sync_profiles ON public.subscriptions;
CREATE TRIGGER subscriptions_sync_profiles AFTER INSERT OR UPDATE OF end_date, netflix_profile_id, prime_profile_id ON public.subscriptions
FOR EACH STATEMENT EXECUTE FUNCTION public.trg_sync_profiles();