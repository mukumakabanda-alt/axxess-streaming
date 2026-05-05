ALTER TABLE public.public_messages
  ADD COLUMN IF NOT EXISTS rating integer CHECK (rating BETWEEN 1 AND 5);