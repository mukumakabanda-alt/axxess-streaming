DROP POLICY IF EXISTS "Public can read settings" ON public.site_settings;
CREATE POLICY "Public can read public settings" ON public.site_settings FOR SELECT TO anon, authenticated
USING (key IN ('whatsapp_primary','whatsapp_secondary','intro_video_url','whatsapp_group_link','whatsapp_number','mtn_payment_number','mtn_payment_name','airtel_payment_number','airtel_payment_name','news_banner_enabled','news_hero_enabled','news_cache_minutes','news_banner_message'));
DROP POLICY IF EXISTS "Public can read news engagement" ON public.news_engagement;
CREATE POLICY "Admins read news engagement" ON public.news_engagement FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));