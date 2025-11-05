-- ============================================
-- Script SQL FINAL pour push_subscriptions
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ============================================

-- ÉTAPE 1 : Ajouter la colonne 'locale' si elle n'existe pas
ALTER TABLE push_subscriptions 
ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'pt-BR';

-- ÉTAPE 2 : Ajouter 'last_seen_at' si nécessaire
ALTER TABLE push_subscriptions 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- ÉTAPE 3 : Créer les index manquants
CREATE INDEX IF NOT EXISTS idx_push_topics ON push_subscriptions USING GIN (topics);
CREATE INDEX IF NOT EXISTS idx_push_endpoint ON push_subscriptions (endpoint);
CREATE INDEX IF NOT EXISTS idx_push_locale ON push_subscriptions (locale);

-- ÉTAPE 4 : Nettoyer les policies en double
-- Supprimer les anciennes policies qui font doublon
DROP POLICY IF EXISTS "Allow insert push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Allow read push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Allow update push subscriptions" ON push_subscriptions;

-- S'assurer que les policies nécessaires existent
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy pour INSERT (si pas déjà créée par push_public_upsert_own_endpoint)
DROP POLICY IF EXISTS "Allow public insert" ON push_subscriptions;
CREATE POLICY "Allow public insert" ON push_subscriptions
  FOR INSERT
  WITH CHECK (true);

-- Policy pour SELECT (service role)
DROP POLICY IF EXISTS "Allow service role read" ON push_subscriptions;
CREATE POLICY "Allow service role read" ON push_subscriptions
  FOR SELECT
  USING (true);

-- Policy pour DELETE
DROP POLICY IF EXISTS "Allow public delete" ON push_subscriptions;
CREATE POLICY "Allow public delete" ON push_subscriptions
  FOR DELETE
  USING (true);

-- ÉTAPE 5 : Vérification finale
-- Vérifier les colonnes
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'push_subscriptions'
ORDER BY ordinal_position;

-- Vérifier les policies finales
SELECT 
    policyname,
    cmd as commande,
    roles
FROM pg_policies 
WHERE tablename = 'push_subscriptions'
ORDER BY policyname;

-- Résultat attendu :
-- Colonnes : id, endpoint, p256dh, auth, topics, locale, vapid_key_version, created_at, last_seen_at
-- Policies : ~6 policies (Allow public insert, Allow service role read, Allow public delete, 
--           push_public_upsert_own_endpoint, push_public_update_by_endpoint, et peut-être d'autres)

