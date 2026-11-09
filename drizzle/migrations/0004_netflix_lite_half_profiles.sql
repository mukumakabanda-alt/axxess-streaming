CREATE OR REPLACE FUNCTION public.sync_profile_assignments()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE subscriptions SET is_active = false, updated_at = now()
   WHERE is_active AND end_date < current_date;

  -- Netflix: a Personal subscription fills a profile alone; Netflix Lite counts as half,
  -- so a profile with one Lite customer is 'half' and becomes 'active' (full) with two.
  WITH live AS (
    SELECT netflix_profile_id AS pid,
           string_agg(customer_name, ' & ' ORDER BY start_date, created_at) AS names,
           count(*) AS n,
           bool_and(service_name ILIKE '%lite%') AS all_lite
      FROM subscriptions
     WHERE netflix_profile_id IS NOT NULL AND end_date >= current_date
     GROUP BY netflix_profile_id
  )
  UPDATE netflix_profiles p
     SET status = CASE WHEN l.all_lite AND l.n < 2 THEN 'half' ELSE 'active' END,
         assigned_customer = l.names, is_vulnerable = false, updated_at = now()
    FROM live l
   WHERE p.id = l.pid
     AND (p.status IS DISTINCT FROM CASE WHEN l.all_lite AND l.n < 2 THEN 'half' ELSE 'active' END
          OR p.assigned_customer IS DISTINCT FROM l.names OR p.is_vulnerable);

  UPDATE prime_profiles p SET status='active', assigned_customer=s.customer_name, is_vulnerable=false, updated_at=now()
    FROM subscriptions s
   WHERE s.prime_profile_id = p.id AND s.end_date >= current_date
     AND (p.status <> 'active' OR p.assigned_customer IS DISTINCT FROM s.customer_name OR p.is_vulnerable);

  UPDATE netflix_profiles p SET status='available', assigned_customer=NULL, is_vulnerable=true, updated_at=now()
   WHERE p.status IN ('active','half')
     AND EXISTS (SELECT 1 FROM subscriptions s WHERE s.netflix_profile_id=p.id AND s.end_date < current_date)
     AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.netflix_profile_id=p.id AND s.end_date >= current_date);
  UPDATE prime_profiles p SET status='available', assigned_customer=NULL, is_vulnerable=true, updated_at=now()
   WHERE p.status='active'
     AND EXISTS (SELECT 1 FROM subscriptions s WHERE s.prime_profile_id=p.id AND s.end_date < current_date)
     AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.prime_profile_id=p.id AND s.end_date >= current_date);
END $$;
REVOKE ALL ON FUNCTION public.sync_profile_assignments() FROM PUBLIC, anon, authenticated;