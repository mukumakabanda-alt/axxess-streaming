-- Add screenshot column to public_messages
ALTER TABLE public.public_messages ADD COLUMN IF NOT EXISTS screenshot_url text;

-- Auto-approve new public messages so they appear immediately
ALTER TABLE public.public_messages ALTER COLUMN is_approved SET DEFAULT true;

-- Allow anyone to upload to testimonial-screenshots bucket (public feedback)
CREATE POLICY "Public can upload testimonial screenshots"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'testimonial-screenshots');