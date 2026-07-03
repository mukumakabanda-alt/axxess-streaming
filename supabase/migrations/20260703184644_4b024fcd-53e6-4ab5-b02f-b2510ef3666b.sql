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

GRANT SELECT ON public.news_engagement TO anon, authenticated;
GRANT ALL ON public.news_engagement TO service_role;

ALTER TABLE public.news_engagement ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read news engagement" ON public.news_engagement;
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