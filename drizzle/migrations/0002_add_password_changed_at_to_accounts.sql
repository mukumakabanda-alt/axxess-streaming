ALTER TABLE public.netflix_accounts ADD COLUMN password_changed_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.prime_accounts ADD COLUMN password_changed_at timestamptz NOT NULL DEFAULT now();
GRANT SELECT, INSERT, UPDATE, DELETE ON public.netflix_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prime_accounts TO authenticated;