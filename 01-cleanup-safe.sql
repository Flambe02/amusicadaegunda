-- 🗑️ SCRIPT DE NETTOYAGE SÉCURISÉ - Música da Segunda
-- Exécutez ce script EN PREMIER pour tout effacer
-- Ce script vérifie l'existence avant de supprimer

-- ===== 1. VÉRIFICATION DE L'ÉTAT ACTUEL =====
SELECT '🔍 ÉTAT ACTUEL DE LA BASE' as info;

SELECT 'Tables existantes:' as info;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

SELECT 'Triggers existants:' as info;
SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = 'public';

SELECT 'Fonctions existantes:' as info;
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';

SELECT 'Politiques RLS existantes:' as info;
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- ===== 2. NETTOYAGE SÉCURISÉ =====
SELECT '🧹 DÉBUT DU NETTOYAGE' as info;

-- Supprimer les triggers seulement s'ils existent
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_songs_updated_at') THEN
        DROP TRIGGER IF EXISTS update_songs_updated_at ON songs;
        RAISE NOTICE 'Trigger update_songs_updated_at supprimé';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_albums_updated_at') THEN
        DROP TRIGGER IF EXISTS update_albums_updated_at ON albums;
        RAISE NOTICE 'Trigger update_albums_updated_at supprimé';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_settings_updated_at') THEN
        DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
        RAISE NOTICE 'Trigger update_settings_updated_at supprimé';
    END IF;
END $$;

-- Supprimer la fonction seulement si elle existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'update_updated_at_column') THEN
        DROP FUNCTION IF EXISTS update_updated_at_column();
        RAISE NOTICE 'Fonction update_updated_at_column supprimée';
    END IF;
END $$;

-- Supprimer les politiques RLS seulement si elles existent
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Chansons publiques visibles par tous') THEN
        DROP POLICY IF EXISTS "Chansons publiques visibles par tous" ON songs;
        RAISE NOTICE 'Politique Chansons publiques visibles par tous supprimée';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Gestion complète des chansons') THEN
        DROP POLICY IF EXISTS "Gestion complète des chansons" ON songs;
        RAISE NOTICE 'Politique Gestion complète des chansons supprimée';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Gestion complète des albums') THEN
        DROP POLICY IF EXISTS "Gestion complète des albums" ON albums;
        RAISE NOTICE 'Politique Gestion complète des albums supprimée';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Gestion complète des paramètres') THEN
        DROP POLICY IF EXISTS "Gestion complète des paramètres" ON settings;
        RAISE NOTICE 'Politique Gestion complète des paramètres supprimée';
    END IF;
END $$;

-- Supprimer les tables seulement si elles existent
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'songs') THEN
        DROP TABLE IF EXISTS songs CASCADE;
        RAISE NOTICE 'Table songs supprimée';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'albums') THEN
        DROP TABLE IF EXISTS albums CASCADE;
        RAISE NOTICE 'Table albums supprimée';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
        DROP TABLE IF EXISTS settings CASCADE;
        RAISE NOTICE 'Table settings supprimée';
    END IF;
END $$;

-- ===== 3. VÉRIFICATION FINALE =====
SELECT '✅ NETTOYAGE TERMINÉ' as info;

SELECT 'Tables restantes:' as info;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

SELECT 'Triggers restants:' as info;
SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = 'public';

SELECT 'Fonctions restantes:' as info;
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';

SELECT 'Politiques RLS restantes:' as info;
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- ===== 4. MESSAGE DE CONFIRMATION =====
SELECT '🎯 BASE VIDE ET PRÊTE POUR LA CRÉATION' as final_status;
SELECT '📋 Exécutez maintenant le script 02-create-tables.sql' as next_step;
