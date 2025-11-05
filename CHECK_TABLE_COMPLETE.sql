-- ============================================
-- Script SQL pour VÉRIFIER que tout est correct
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ============================================

-- Vérifier toutes les colonnes de la table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'push_subscriptions'
ORDER BY ordinal_position;

-- Vérifier spécifiquement la colonne 'locale'
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'push_subscriptions' 
            AND column_name = 'locale'
        ) THEN '✅ Colonne locale existe'
        ELSE '❌ Colonne locale MANQUANTE - Exécutez: ALTER TABLE push_subscriptions ADD COLUMN locale TEXT DEFAULT ''pt-BR'';'
    END as status_locale;

-- Vérifier les index
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'push_subscriptions'
ORDER BY indexname;

-- Vérifier les policies RLS (devrait montrer 5 policies)
SELECT 
    policyname,
    cmd as commande,
    roles,
    CASE 
        WHEN qual IS NULL THEN 'Pas de condition'
        ELSE substring(qual, 1, 50) || '...'
    END as condition_qual
FROM pg_policies 
WHERE tablename = 'push_subscriptions'
ORDER BY policyname;

-- Test d'insertion (ne sera pas réellement inséré à cause de la validation)
-- Juste pour vérifier que la structure est correcte
SELECT 
    'Test structure OK' as status,
    COUNT(*) as nombre_policies,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'push_subscriptions') as nombre_colonnes
FROM pg_policies 
WHERE tablename = 'push_subscriptions';

