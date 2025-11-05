-- ============================================
-- Script SQL SIMPLE : Ajouter la colonne locale
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ============================================

-- Ajouter la colonne 'locale' si elle n'existe pas
ALTER TABLE push_subscriptions 
ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'pt-BR';

-- Ajouter 'last_seen_at' si nécessaire
ALTER TABLE push_subscriptions 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- Créer l'index pour locale si nécessaire
CREATE INDEX IF NOT EXISTS idx_push_locale ON push_subscriptions (locale);

-- Vérification : Afficher toutes les colonnes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'push_subscriptions'
ORDER BY ordinal_position;

-- Si vous voyez 'locale' dans la liste, c'est bon ! ✅

