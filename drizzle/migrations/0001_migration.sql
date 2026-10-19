CREATE OR REPLACE FUNCTION public.get_active_subscriber_count()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT GREATEST(
    (SELECT count(*) FROM public.orders WHERE status='completed' AND expires_at > now()),
    (SELECT count(*) FROM public.subscriptions WHERE is_active AND end_date >= current_date)
  )::int;
$$;
GRANT EXECUTE ON FUNCTION public.get_active_subscriber_count() TO anon, authenticated;