-- =========================================================
-- NEWS PAGE ENGAGEMENT TRACKING
-- =========================================================
-- The /news page (TMDB + NewsData.io powered) has never written to
-- Supabase — likes/saves/views only ever lived in each visitor's own
-- browser localStorage. That meant the admin dashboard had no real data
-- to show for "how the news page is performing." This table + the three
-- increment_news_* functions below are the missing link: routes/news.tsx
-- now calls these on view / like / share, and the admin Updates tab reads
-- straight from this table.
--
-- Mirrors the existing public.updates engagement-counter pattern
-- (view_count/like_count/share_count + *_today columns + nightly reset)
-- for consistency, but keyed by a stable "article_key" instead of a
-- Postgres-generated id, since /news articles are never actually rows in
-- our own database — they're fetched live from TMDB/NewsData.io and
-- identified by their own stable id (NewsData's article_id, or our own
-- slug for the hand-written static articles).
CREATE TABLE IF NOT EXISTS public.news_engagement (
  article_key   text PRIMARY KEY,
  headline      text NOT NULL DEFAULT '',
  category      text,
  view_count    integer NOT NULL DEFAULT 0,
  like_count    integer NOT NULL DEFAULT 0,
  share_count   integer NOT NULL DEFAULT 0,
  views_today   integer NOT NULL DEFAULT 0,
  likes_today   integer NOT NULL DEFAULT 0,
  shares_today  integer NOT NULL DEFAULT 0,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.news_engagement ENABLE ROW LEVEL SECURITY;

-- NOTE on this policy: every other admin table in this project is on a
-- "Public full access" policy (see 20260702034906) because /admin has no
-- login screen yet — there's no auth.uid() for has_role() to check, so an
-- admin-only policy would silently show the dashboard nothing. Until real
-- admin auth exists, this table follows the same reality, but scoped
-- tighter than the rest of the app: anon/authenticated can only SELECT
-- (read the aggregate stats for the admin dashboard) — there is no public
-- INSERT/UPDATE/DELETE grant. All writes go through the three
-- SECURITY DEFINER functions below, so a visitor can increment a view/
-- like/share counter but can never directly overwrite the numbers or
-- delete a row. Tighten this to has_role(auth.uid(),'admin'::app_role)
-- once admin login ships.
CREATE POLICY "Public can read news engagement"
  ON public.news_engagement FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.increment_news_view(_key text, _headline text, _category text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.news_engagement (article_key, headline, category, view_count, views_today, last_seen_at)
  VALUES (_key, COALESCE(_headline, ''), _category, 1, 1, now())
  ON CONFLICT (article_key) DO UPDATE
    SET view_count   = news_engagement.view_count + 1,
        views_today  = news_engagement.views_today + 1,
        headline     = COALESCE(NULLIF(EXCLUDED.headline, ''), news_engagement.headline),
        category     = COALESCE(EXCLUDED.category, news_engagement.category),
        last_seen_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_news_like(_key text, _headline text, _category text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.news_engagement (article_key, headline, category, like_count, likes_today, last_seen_at)
  VALUES (_key, COALESCE(_headline, ''), _category, 1, 1, now())
  ON CONFLICT (article_key) DO UPDATE
    SET like_count   = news_engagement.like_count + 1,
        likes_today  = news_engagement.likes_today + 1,
        headline     = COALESCE(NULLIF(EXCLUDED.headline, ''), news_engagement.headline),
        category     = COALESCE(EXCLUDED.category, news_engagement.category),
        last_seen_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_news_share(_key text, _headline text, _category text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.news_engagement (article_key, headline, category, share_count, shares_today, last_seen_at)
  VALUES (_key, COALESCE(_headline, ''), _category, 1, 1, now())
  ON CONFLICT (article_key) DO UPDATE
    SET share_count  = news_engagement.share_count + 1,
        shares_today = news_engagement.shares_today + 1,
        headline     = COALESCE(NULLIF(EXCLUDED.headline, ''), news_engagement.headline),
        category     = COALESCE(EXCLUDED.category, news_engagement.category),
        last_seen_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_news_view(text, text, text)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_news_like(text, text, text)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_news_share(text, text, text) TO anon, authenticated;

-- Same midnight Africa/Lusaka (UTC+2) => 22:00 UTC reset as the updates table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reset-news-engagement-daily') THEN
    PERFORM cron.unschedule('reset-news-engagement-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'reset-news-engagement-daily',
  '0 22 * * *',
  $$UPDATE public.news_engagement SET views_today = 0, likes_today = 0, shares_today = 0;$$
);
