
-- 1. Drop overly permissive INSERT / SELECT policies
DROP POLICY IF EXISTS "Anyone can upsert points (server-validated via RPC)" ON public.customer_points;
DROP POLICY IF EXISTS "Anyone can insert point events" ON public.point_events;
DROP POLICY IF EXISTS "Public can insert reward unlocks" ON public.reward_unlocks;
DROP POLICY IF EXISTS "Anyone can record a visit" ON public.page_visits;
DROP POLICY IF EXISTS "Public read visits" ON public.page_visits;

-- 2. SECURITY DEFINER RPC for reward unlocks (replaces direct INSERT)
CREATE OR REPLACE FUNCTION public.record_reward_unlock(
  _phone text,
  _name text,
  _tier_points integer,
  _tier_label text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _phone IS NULL OR length(trim(_phone)) < 6 THEN
    RETURN;
  END IF;
  IF _tier_points IS NULL OR _tier_points <= 0 THEN
    RETURN;
  END IF;
  INSERT INTO public.reward_unlocks (customer_phone, customer_name, tier_points, tier_label)
  VALUES (_phone, _name, _tier_points, _tier_label);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_reward_unlock(text, text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_reward_unlock(text, text, integer, text) TO anon, authenticated;

-- 3. Generate + store a shared secret for the notify-news webhook (idempotent)
DO $$
DECLARE
  _existing uuid;
BEGIN
  SELECT id INTO _existing FROM vault.secrets WHERE name = 'notify_news_secret';
  IF _existing IS NULL THEN
    PERFORM vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'notify_news_secret');
  END IF;
END;
$$;

-- 4. Rewire trigger to send the shared secret in a custom header (not anon key)
CREATE OR REPLACE FUNCTION public.trigger_notify_news()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _url    text;
  _key    text;
  _secret text;
BEGIN
  IF NEW.is_published IS NOT TRUE THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_published IS TRUE THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO _url    FROM vault.decrypted_secrets WHERE name='project_url';
  SELECT decrypted_secret INTO _key    FROM vault.decrypted_secrets WHERE name='edge_auth_key';
  SELECT decrypted_secret INTO _secret FROM vault.decrypted_secrets WHERE name='notify_news_secret';

  PERFORM net.http_post(
    url     := _url || '/functions/v1/notify-news',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || _key,
      'apikey', _key,
      'x-notify-secret', _secret
    ),
    body    := jsonb_build_object(
      'type',       TG_OP,
      'record',     row_to_json(NEW),
      'old_record', CASE WHEN TG_OP='UPDATE' THEN row_to_json(OLD) ELSE NULL END
    )
  );
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.trigger_notify_news() FROM PUBLIC, anon, authenticated;
