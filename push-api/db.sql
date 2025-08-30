create extension if not exists pgcrypto;

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  topics text[] not null default array['new-song']::text[],
  locale text,
  vapid_key_version text default 'v1',
  created_at timestamptz default now(),
  last_seen_at timestamptz default now()
);

create index if not exists idx_push_topics on push_subscriptions using gin (topics);
