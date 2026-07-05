
-- Remove overly-permissive "Public full access" ALL policies
DROP POLICY IF EXISTS "Public full access" ON public.services;
DROP POLICY IF EXISTS "Public full access" ON public.site_settings;
DROP POLICY IF EXISTS "Public full access" ON public.updates;
DROP POLICY IF EXISTS "Public full access" ON public.subscriptions;
DROP POLICY IF EXISTS "Public full access" ON public.testimonials;

-- Lock down reward_unlocks: no public SELECT / UPDATE; admins only
DROP POLICY IF EXISTS "Public can read reward unlocks" ON public.reward_unlocks;
DROP POLICY IF EXISTS "Public can update reward unlocks" ON public.reward_unlocks;

-- Prevent listing files in public storage buckets (direct URL access still works)
DROP POLICY IF EXISTS "Public read intro video" ON storage.objects;
DROP POLICY IF EXISTS "Public read testimonial screenshots" ON storage.objects;

-- Harden SECURITY DEFINER functions: revoke EXECUTE on functions that are
-- not intended to be called from the client (trigger-only / admin-only).
REVOKE EXECUTE ON FUNCTION public.trigger_notify_news() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_prime_profile_slots() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_netflix_profile_slots() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_points(text, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_points(text, text, integer, text) TO authenticated;
