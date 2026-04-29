
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "Admins can view roles" ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ SERVICES ============
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  price_kwacha NUMERIC(10,2) NOT NULL,
  billing_period TEXT NOT NULL DEFAULT 'month',
  description TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  accent_color TEXT,
  badge TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active services" ON public.services FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage services" ON public.services FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ ORDERS ============
CREATE TYPE public.order_status AS ENUM ('pending', 'approved', 'completed', 'rejected');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  service_name_snapshot TEXT NOT NULL,
  price_snapshot NUMERIC(10,2) NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  notes TEXT,
  admin_notes TEXT,
  referral_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an order" ON public.orders FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Admins view all orders" ON public.orders FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete orders" ON public.orders FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ SUBSCRIPTIONS ============
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  service_name TEXT NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage subscriptions" ON public.subscriptions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ TESTIMONIALS ============
CREATE TABLE public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  message TEXT NOT NULL,
  screenshot_url TEXT,
  rating INT DEFAULT 5,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public views approved testimonials" ON public.testimonials FOR SELECT
  USING (is_approved = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage testimonials" ON public.testimonials FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ PUBLIC MESSAGES (visitor-submitted) ============
CREATE TABLE public.public_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.public_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can post a message" ON public.public_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public sees approved messages" ON public.public_messages FOR SELECT
  USING (is_approved = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage messages" ON public.public_messages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ UPDATES / NEWS ============
CREATE TABLE public.updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public views published updates" ON public.updates FOR SELECT
  USING (is_published = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage updates" ON public.updates FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ REFERRALS ============
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_name TEXT NOT NULL,
  owner_phone TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  uses_count INT NOT NULL DEFAULT 0,
  reward_days_earned INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create a referral code" ON public.referrals FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can lookup referral by code" ON public.referrals FOR SELECT USING (true);
CREATE POLICY "Admins manage referrals" ON public.referrals FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete referrals" ON public.referrals FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ SITE SETTINGS ============
CREATE TABLE public.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage settings" ON public.site_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('intro-video', 'intro-video', true),
  ('testimonial-screenshots', 'testimonial-screenshots', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read intro video" ON storage.objects FOR SELECT
  USING (bucket_id = 'intro-video');
CREATE POLICY "Admins manage intro video" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'intro-video' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update intro video" ON storage.objects FOR UPDATE
  USING (bucket_id = 'intro-video' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete intro video" ON storage.objects FOR DELETE
  USING (bucket_id = 'intro-video' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public read testimonial screenshots" ON storage.objects FOR SELECT
  USING (bucket_id = 'testimonial-screenshots');
CREATE POLICY "Admins upload testimonial screenshots" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'testimonial-screenshots' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update testimonial screenshots" ON storage.objects FOR UPDATE
  USING (bucket_id = 'testimonial-screenshots' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete testimonial screenshots" ON storage.objects FOR DELETE
  USING (bucket_id = 'testimonial-screenshots' AND public.has_role(auth.uid(), 'admin'));

-- ============ SEED DATA ============
INSERT INTO public.services (name, slug, price_kwacha, description, features, accent_color, badge, sort_order) VALUES
  ('Spotify', 'spotify', 35, 'Ad-free music, podcasts & playlists on demand.',
   '["Ad-free listening","Offline downloads","Unlimited skips","High-quality audio"]'::jsonb,
   'spotify', NULL, 1),
  ('Netflix', 'netflix', 70, 'Stream blockbuster movies & binge-worthy series.',
   '["HD streaming","Movies & series","Watch on any device","New titles weekly"]'::jsonb,
   'red', 'Most Popular', 2),
  ('All Access', 'all-access', 100, 'Netflix + Spotify together. Best value bundle.',
   '["Netflix HD","Spotify ad-free","Save K5 vs separate","Premium support"]'::jsonb,
   'red', 'Best Value', 3);

INSERT INTO public.site_settings (key, value) VALUES
  ('whatsapp_primary', '260765101494'),
  ('whatsapp_secondary', '260762073206'),
  ('whatsapp_group_link', 'https://chat.whatsapp.com/your-group-link'),
  ('intro_video_url', '');

INSERT INTO public.testimonials (customer_name, message, is_approved, sort_order) VALUES
  ('Mwila K.', 'Got my Netflix in 5 minutes. Cheapest in Lusaka 🔥', true, 1),
  ('Chanda M.', 'Spotify works perfectly. Been using for 3 months no issues.', true, 2),
  ('Tasila B.', 'The All Access bundle saves me money. Customer support is fast on WhatsApp.', true, 3);

INSERT INTO public.updates (title, body) VALUES
  ('🎉 Launch Special', 'Get 10 days FREE on your next renewal when you refer a friend.'),
  ('New: All Access Bundle', 'Netflix + Spotify together for just K100/month. Save more, stream more.');
