-- ============================================
-- Script SQL pour NETTOYER les policies RLS en double
-- À exécuter APRÈS avoir vérifié que la colonne locale existe
-- ============================================

-- Supprimer les policies en double (garder seulement les plus simples)
-- On garde : "Allow public insert", "Allow service role read", "Allow public delete"

-- Supprimer les anciennes policies qui font doublon
DROP POLICY IF EXISTS "Allow insert push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Allow read push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Allow update push subscriptions" ON push_subscriptions;

-- Garder les policies modernes :
-- - "Allow public insert" (pour les abonnements)
-- - "Allow service role read" (pour l'API)
-- - "Allow public delete" (pour le désabonnement)
-- - "push_public_upsert_own_endpoint" (pour upsert avec validation)
-- - "push_public_update_by_endpoint" (pour update)

-- Vérification finale
SELECT 
    policyname,
    cmd as commande,
    roles
FROM pg_policies 
WHERE tablename = 'push_subscriptions'
ORDER BY policyname;

-- Si tout est OK, vous devriez voir environ 5 policies :
-- - Allow public delete
-- - Allow public insert
-- - Allow service role read
-- - push_public_update_by_endpoint
-- - push_public_upsert_own_endpoint

