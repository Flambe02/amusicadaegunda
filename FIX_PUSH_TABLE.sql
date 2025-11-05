-- ============================================
-- Script SQL pour CORRIGER la table push_subscriptions existante
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ============================================

-- ÉTAPE 1 : Vérifier la structure actuelle de la table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'push_subscriptions'
ORDER BY ordinal_position;

-- ÉTAPE 2 : Ajouter la colonne 'locale' si elle n'existe pas
ALTER TABLE push_subscriptions 
ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'pt-BR';

-- ÉTAPE 3 : Ajouter la colonne 'last_seen_at' si elle n'existe pas
ALTER TABLE push_subscriptions 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- ÉTAPE 4 : S'assurer que toutes les colonnes nécessaires existent
DO $$
BEGIN
    -- Vérifier et ajouter 'topics' si nécessaire
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'push_subscriptions' AND column_name = 'topics'
    ) THEN
        ALTER TABLE push_subscriptions 
        ADD COLUMN topics TEXT[] DEFAULT ARRAY['new-song']::TEXT[];
    END IF;

    -- Vérifier et ajouter 'vapid_key_version' si nécessaire
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'push_subscriptions' AND column_name = 'vapid_key_version'
    ) THEN
        ALTER TABLE push_subscriptions 
        ADD COLUMN vapid_key_version TEXT DEFAULT 'v1';
    END IF;

    -- Vérifier et ajouter 'created_at' si nécessaire
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'push_subscriptions' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE push_subscriptions 
        ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- ÉTAPE 5 : Créer les index manquants
CREATE INDEX IF NOT EXISTS idx_push_topics ON push_subscriptions USING GIN (topics);
CREATE INDEX IF NOT EXISTS idx_push_endpoint ON push_subscriptions (endpoint);
CREATE INDEX IF NOT EXISTS idx_push_locale ON push_subscriptions (locale);

-- ÉTAPE 6 : Activer RLS et créer les policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Allow public insert" ON push_subscriptions;
DROP POLICY IF EXISTS "Allow service role read" ON push_subscriptions;
DROP POLICY IF EXISTS "Allow public read" ON push_subscriptions;
DROP POLICY IF EXISTS "Allow public delete" ON push_subscriptions;

-- Créer les policies nécessaires
CREATE POLICY "Allow public insert" ON push_subscriptions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow service role read" ON push_subscriptions
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public delete" ON push_subscriptions
  FOR DELETE
  USING (true);

-- ÉTAPE 7 : Vérification finale
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
-- - Au moins 9 colonnes (id, endpoint, p256dh, auth, topics, locale, vapid_key_version, created_at, last_seen_at)
-- - 3 policies RLS activées

