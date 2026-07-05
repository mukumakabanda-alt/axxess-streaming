
-- 1. Drop overly-permissive RLS policies
DROP POLICY IF EXISTS "Public full access" ON public.orders;
DROP POLICY IF EXISTS "Public full access" ON public.referrals;
DROP POLICY IF EXISTS "Public can delete messages" ON public.public_messages;
DROP POLICY IF EXISTS "Public can update messages" ON public.public_messages;

-- Storage: drop the ALL-verb public policy on intro-video
DROP POLICY IF EXISTS "intro_video_public_all" ON storage.objects;

-- 2. Restrict public read on customer_points / point_events
DROP POLICY IF EXISTS "Anyone can read points by phone" ON public.customer_points;
DROP POLICY IF EXISTS "Anyone can read own events" ON public.point_events;

-- 3. Scoped lookup RPC replaces the public SELECT on customer_points
CREATE OR REPLACE FUNCTION public.get_customer_points(_phone text)
RETURNS TABLE(points integer, customer_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT points, customer_name
  FROM public.customer_points
  WHERE customer_phone = _phone
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_customer_points(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_customer_points(text) TO anon, authenticated;

-- 4. Input validation — length caps and format checks
ALTER TABLE public.orders
  ADD CONSTRAINT orders_customer_name_len   CHECK (char_length(customer_name) BETWEEN 1 AND 120),
  ADD CONSTRAINT orders_customer_phone_len  CHECK (char_length(customer_phone) BETWEEN 6 AND 20),
  ADD CONSTRAINT orders_customer_email_len  CHECK (customer_email IS NULL OR char_length(customer_email) <= 254),
  ADD CONSTRAINT orders_notes_len           CHECK (notes IS NULL OR char_length(notes) <= 1000),
  ADD CONSTRAINT orders_service_name_len    CHECK (char_length(service_name_snapshot) <= 200),
  ADD CONSTRAINT orders_referral_code_len   CHECK (referral_code IS NULL OR char_length(referral_code) <= 40);

ALTER TABLE public.public_messages
  ADD CONSTRAINT public_messages_name_len    CHECK (char_length(name) BETWEEN 1 AND 80),
  ADD CONSTRAINT public_messages_message_len CHECK (char_length(message) BETWEEN 1 AND 2000),
  ADD CONSTRAINT public_messages_phone_len   CHECK (phone IS NULL OR char_length(phone) <= 20);

ALTER TABLE public.referrals
  ADD CONSTRAINT referrals_owner_name_len   CHECK (char_length(owner_name) BETWEEN 1 AND 120),
  ADD CONSTRAINT referrals_owner_phone_len  CHECK (char_length(owner_phone) BETWEEN 6 AND 20),
  ADD CONSTRAINT referrals_code_format      CHECK (code ~ '^AXX-[A-Z0-9]{3,12}$');

-- 5. Revoke EXECUTE on trigger-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.trigger_notify_news()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_prime_profile_slots()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_netflix_profile_slots() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()     FROM PUBLIC, anon, authenticated;
