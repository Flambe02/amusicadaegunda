# 🚀 Push Function - Supabase Edge Function

## 📋 Overview
Web Push notification backend for Música da Segunda PWA with Brazilian Portuguese (pt-BR) defaults.

## 🌐 Routes
- **POST** `/push/subscribe` - Subscribe to push notifications
- **DELETE** `/push/unsubscribe` - Unsubscribe from push notifications  
- **POST/GET** `/push/send` - Send push notifications (with pt-BR defaults)

## 🔧 Deployment
```bash
# Deploy without JWT verification (public endpoints)
supabase functions deploy push --no-verify-jwt
```

## 🔑 Required Environment Variables
```bash
supabase secrets set SUPABASE_URL=https://<project>.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
supabase secrets set ALLOWED_ORIGIN=https://amusicadasegunda.com
supabase secrets set VAPID_PUBLIC_KEY=<publicKey>
supabase secrets set VAPID_PRIVATE_KEY=<privateKey>
supabase secrets set PUSH_DEFAULT_LOCALE=pt-BR
```

## 🗄️ Database Schema
```sql
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
```

## 🧪 Testing
```bash
# Test send (uses pt-BR defaults)
curl -X POST "https://<PROJECT-REF>.functions.supabase.co/push/send" \
  -H "Content-Type: application/json" \
  -d '{"topic":"new-song","locale":"pt-BR","url":"/playlist"}'
```

## 🌍 Localization
- **pt-BR** (default): "Nova música no ar 🎶"
- **fr**: "Nouvelle chanson en ligne 🎶"  
- **en**: "New song is live 🎶"
