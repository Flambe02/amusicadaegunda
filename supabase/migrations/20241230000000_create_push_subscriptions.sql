-- Create push_subscriptions table for Web Push notifications
-- Migration: 20241230000000_create_push_subscriptions

-- Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT ARRAY['new-song']::TEXT[],
  locale TEXT,
  vapid_key_version TEXT DEFAULT 'v1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient topic-based queries
CREATE INDEX IF NOT EXISTS idx_push_topics ON push_subscriptions USING GIN (topics);

-- Create index for endpoint lookups
CREATE INDEX IF NOT EXISTS idx_push_endpoint ON push_subscriptions (endpoint);

-- Create index for locale-based queries
CREATE INDEX IF NOT EXISTS idx_push_locale ON push_subscriptions (locale);

-- Add comment to table
COMMENT ON TABLE push_subscriptions IS 'Web Push notification subscriptions for Música da Segunda PWA';

-- Add comments to columns
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Unique push service endpoint URL';
COMMENT ON COLUMN push_subscriptions.p256dh IS 'ECDH public key for encryption';
COMMENT ON COLUMN push_subscriptions.auth IS 'Authentication secret for push service';
COMMENT ON COLUMN push_subscriptions.topics IS 'Array of topics this subscription is interested in';
COMMENT ON COLUMN push_subscriptions.locale IS 'User locale preference (pt-BR, fr, en)';
COMMENT ON COLUMN push_subscriptions.vapid_key_version IS 'VAPID key version for rotation support';
