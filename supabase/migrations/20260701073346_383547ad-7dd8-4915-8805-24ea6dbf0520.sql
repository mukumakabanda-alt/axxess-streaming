
ALTER TABLE public.netflix_profiles
  ADD COLUMN IF NOT EXISTS default_pin   text,
  ADD COLUMN IF NOT EXISTS is_vulnerable boolean NOT NULL DEFAULT false;

ALTER TABLE public.public_messages
  ADD COLUMN IF NOT EXISTS phone text;
