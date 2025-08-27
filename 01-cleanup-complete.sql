-- 🗑️ SCRIPT DE NETTOYAGE COMPLET - Música da Segunda
-- Exécutez ce script EN PREMIER pour tout effacer
-- ATTENTION : Ce script supprime TOUTES les données existantes !

-- ===== 1. SUPPRIMER TOUS LES TRIGGERS =====
DROP TRIGGER IF EXISTS update_songs_updated_at ON songs;
DROP TRIGGER IF EXISTS update_albums_updated_at ON albums;
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;

-- ===== 2. SUPPRIMER TOUTES LES FONCTIONS =====
DROP FUNCTION IF EXISTS update_updated_at_column();

-- ===== 3. SUPPRIMER TOUTES LES POLITIQUES RLS =====
DROP POLICY IF EXISTS "Chansons publiques visibles par tous" ON songs;
DROP POLICY IF EXISTS "Gestion complète des chansons" ON songs;
DROP POLICY IF EXISTS "Gestion complète des albums" ON albums;
DROP POLICY IF EXISTS "Gestion complète des paramètres" ON settings;

-- ===== 4. SUPPRIMER TOUTES LES TABLES =====
-- CASCADE supprime aussi les index et contraintes
DROP TABLE IF EXISTS songs CASCADE;
DROP TABLE IF EXISTS albums CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- ===== 5. VÉRIFICATION DU NETTOYAGE =====
-- Vérifier qu'il ne reste plus rien
SELECT 'Tables restantes:' as info;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

SELECT 'Triggers restants:' as info;
SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = 'public';

SELECT 'Fonctions restantes:' as info;
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';

SELECT 'Politiques RLS restantes:' as info;
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- ===== 6. MESSAGE DE CONFIRMATION =====
SELECT '✅ NETTOYAGE TERMINÉ - Base vide et prête pour la création' as status;
