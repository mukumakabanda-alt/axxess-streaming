
CREATE POLICY "Public full access" ON public.orders        FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON public.reservations  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON public.referrals     FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON public.services      FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON public.site_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON public.subscriptions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON public.testimonials  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON public.updates       FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
