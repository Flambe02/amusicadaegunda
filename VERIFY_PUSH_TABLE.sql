-- ============================================
-- Script SQL pour VÉRIFIER la table push_subscriptions
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ============================================

-- Vérifier la structure de la table (colonnes)
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'push_subscriptions'
ORDER BY ordinal_position;

-- Vérifier que la colonne 'locale' existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'push_subscriptions' 
            AND column_name = 'locale'
        ) THEN '✅ Colonne locale existe'
        ELSE '❌ Colonne locale MANQUANTE'
    END as status_locale;

-- Vérifier que la colonne 'last_seen_at' existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'push_subscriptions' 
            AND column_name = 'last_seen_at'
        ) THEN '✅ Colonne last_seen_at existe'
        ELSE '❌ Colonne last_seen_at MANQUANTE'
    END as status_last_seen_at;

-- Compter les policies RLS
SELECT 
    COUNT(*) as nombre_policies,
    COUNT(DISTINCT policyname) as policies_uniques
FROM pg_policies 
WHERE tablename = 'push_subscriptions';

-- Lister toutes les policies
SELECT 
    policyname,
    cmd as commande,
    roles,
    CASE 
        WHEN qual IS NULL THEN 'Pas de condition'
        ELSE qual
    END as condition_qual,
    CASE 
        WHEN with_check IS NULL THEN 'Pas de check'
        ELSE with_check
    END as condition_check
FROM pg_policies 
WHERE tablename = 'push_subscriptions'
ORDER BY policyname;

