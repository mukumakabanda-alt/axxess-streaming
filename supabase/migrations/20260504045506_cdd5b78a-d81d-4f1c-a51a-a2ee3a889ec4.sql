
-- Allow admin page (currently un-gated, matching existing 'orders' pattern) to read these tables.
CREATE POLICY "Public full access" ON public.reservations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON public.account_inventory FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read visits" ON public.page_visits FOR SELECT TO anon, authenticated USING (true);
