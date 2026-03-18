-- Web Push subscriptions for admin push notifications
create table if not exists web_push_subscriptions (
  id         uuid        primary key default gen_random_uuid(),
  endpoint   text        not null unique,
  p256dh     text        not null,
  auth       text        not null,
  created_at timestamptz default now()
);

alter table web_push_subscriptions enable row level security;

-- No direct client access — all operations via service role key from edge functions
create policy "deny_all_direct_access" on web_push_subscriptions
  using (false);
