-- Notification log: tracks every automated push reminder/news send so the
-- same message is never sent twice. One row = one specific reminder for one
-- specific entity (a subscription, an order, or a news post).

create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('subscription', 'order', 'update')),
  entity_id uuid not null,
  reminder_key text not null,
  customer_phone text,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  onesignal_response jsonb,
  sent_at timestamptz not null default now(),
  unique (entity_type, entity_id, reminder_key)
);

create index if not exists idx_notification_log_entity
  on public.notification_log (entity_type, entity_id);

create index if not exists idx_notification_log_sent_at
  on public.notification_log (sent_at desc);

alter table public.notification_log enable row level security;

-- Edge functions use the service role key and bypass RLS entirely, so this
-- policy only matters for the admin dashboard, matching this project's
-- existing no-login-required admin pattern.
create policy "Public can view notification log"
  on public.notification_log for select
  to anon, authenticated
  using (true);
