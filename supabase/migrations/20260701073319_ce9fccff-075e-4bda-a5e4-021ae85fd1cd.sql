
-- 1) Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2) Store URL + edge-fn auth key in Vault (idempotent).
--    Note: SUPABASE_SERVICE_ROLE_KEY is not accessible from migrations on
--    Lovable Cloud. The edge functions themselves already read it via
--    Deno.env internally; for invoking the edge function endpoint we only
--    need a valid apikey (publishable/anon key is sufficient and safe to
--    store since it is a public key).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'project_url') THEN
    PERFORM vault.create_secret('https://wtdsudcxjthmolfypexc.supabase.co', 'project_url', 'Supabase project base URL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'edge_auth_key') THEN
    PERFORM vault.create_secret(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0ZHN1ZGN4anRobW9sZnlwZXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NTA4MjgsImV4cCI6MjA5MzAyNjgyOH0.qHmHmokWDmrgRnPoYk_JGSk9h634qTxbQCoH3bAFHoE',
      'edge_auth_key',
      'API key used by pg_net to invoke edge functions'
    );
  END IF;
END $$;

-- 3) Daily reminder job at 08:00 UTC (10:00 CAT)
SELECT cron.unschedule('send-reminders-daily') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='send-reminders-daily');

SELECT cron.schedule(
  'send-reminders-daily',
  '0 8 * * *',
  $CRON$
  SELECT net.http_post(
    url     := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='project_url') || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='edge_auth_key'),
      'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='edge_auth_key')
    ),
    body    := '{}'::jsonb
  );
  $CRON$
);

-- 4) Auto-fire notify-news when a row in public.updates is newly published
CREATE OR REPLACE FUNCTION public.trigger_notify_news()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _url text;
  _key text;
BEGIN
  -- Only fire for the transition into is_published = true
  IF NEW.is_published IS NOT TRUE THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_published IS TRUE THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO _url FROM vault.decrypted_secrets WHERE name='project_url';
  SELECT decrypted_secret INTO _key FROM vault.decrypted_secrets WHERE name='edge_auth_key';

  PERFORM net.http_post(
    url     := _url || '/functions/v1/notify-news',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || _key,
      'apikey', _key
    ),
    body    := jsonb_build_object(
      'type',       TG_OP,
      'record',     row_to_json(NEW),
      'old_record', CASE WHEN TG_OP='UPDATE' THEN row_to_json(OLD) ELSE NULL END
    )
  );
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_updates_notify_news ON public.updates;
CREATE TRIGGER trg_updates_notify_news
AFTER INSERT OR UPDATE OF is_published ON public.updates
FOR EACH ROW EXECUTE FUNCTION public.trigger_notify_news();

-- 5) Security: remove public full-access policies on sensitive tables
DROP POLICY IF EXISTS "Public full access"                         ON public.account_inventory;
DROP POLICY IF EXISTS "Public full access netflix accounts"        ON public.netflix_accounts;
DROP POLICY IF EXISTS "Public full access netflix profiles"        ON public.netflix_profiles;

-- account_inventory already has an "Admins manage inventory" policy — keep it.
-- Add matching admin-only policies for the other two tables.
CREATE POLICY "Admins manage netflix accounts"
ON public.netflix_accounts
FOR ALL
TO authenticated
USING      (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage netflix profiles"
ON public.netflix_profiles
FOR ALL
TO authenticated
USING      (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
