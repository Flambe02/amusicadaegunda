-- ============================================
-- Script SQL pour créer la table push_subscriptions
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ============================================

-- Activer l'extension pour UUID (si pas déjà fait)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Créer la table push_subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT ARRAY['new-song']::TEXT[],
  locale TEXT DEFAULT 'pt-BR',
  vapid_key_version TEXT DEFAULT 'v1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_push_topics ON push_subscriptions USING GIN (topics);
CREATE INDEX IF NOT EXISTS idx_push_endpoint ON push_subscriptions (endpoint);
CREATE INDEX IF NOT EXISTS idx_push_locale ON push_subscriptions (locale);

-- RLS (Row Level Security) - Permettre l'insertion publique
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Allow public insert" ON push_subscriptions;
DROP POLICY IF EXISTS "Allow service role read" ON push_subscriptions;
DROP POLICY IF EXISTS "Allow public read" ON push_subscriptions;
DROP POLICY IF EXISTS "Allow public delete" ON push_subscriptions;

-- Policy pour permettre l'insertion publique (pour les abonnements)
CREATE POLICY "Allow public insert" ON push_subscriptions
  FOR INSERT
  WITH CHECK (true);

-- Policy pour permettre la lecture par le service role (pour l'API)
CREATE POLICY "Allow service role read" ON push_subscriptions
  FOR SELECT
  USING (true);

-- Policy pour permettre la suppression publique (pour le désabonnement)
CREATE POLICY "Allow public delete" ON push_subscriptions
  FOR DELETE
  USING (true);

-- Commentaires pour documentation
COMMENT ON TABLE push_subscriptions IS 'Web Push notification subscriptions for Música da Segunda PWA';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Unique push service endpoint URL';
COMMENT ON COLUMN push_subscriptions.p256dh IS 'ECDH public key for encryption';
COMMENT ON COLUMN push_subscriptions.auth IS 'Authentication secret for push service';
COMMENT ON COLUMN push_subscriptions.topics IS 'Array of topics this subscription is interested in';
COMMENT ON COLUMN push_subscriptions.locale IS 'User locale preference (pt-BR, fr, en)';
COMMENT ON COLUMN push_subscriptions.vapid_key_version IS 'VAPID key version for rotation support';

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Vérifier que la table existe
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'push_subscriptions'
ORDER BY ordinal_position;

-- Vérifier les policies RLS
SELECT * 
FROM pg_policies 
WHERE tablename = 'push_subscriptions';

-- Si tout est OK, vous devriez voir :
-- - 9 colonnes dans la table
-- - 3 policies RLS activées

