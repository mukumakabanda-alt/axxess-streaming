ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS netflix_profile_id uuid REFERENCES public.netflix_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prime_profile_id uuid REFERENCES public.prime_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS netflix_profile_id uuid REFERENCES public.netflix_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prime_profile_id uuid REFERENCES public.prime_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_netflix_profile ON public.subscriptions(netflix_profile_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_prime_profile ON public.subscriptions(prime_profile_id);