-- ============================================
-- SCRIPT DE VÉRIFICATION ET CORRECTION RLS
-- Table: push_subscriptions
-- ============================================
-- Ce script vérifie et corrige les RLS policies
-- pour permettre l'activation des notifications push
-- ============================================

-- 1. Vérifier que la table existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'push_subscriptions'
  ) THEN
    RAISE EXCEPTION 'La table push_subscriptions n''existe pas. Exécutez d''abord le script complete_push_setup.sql';
  END IF;
END $$;

-- 2. Vérifier que RLS est activé
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'push_subscriptions'
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE 'RLS n''est pas activé. Activation...';
    ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
  ELSE
    RAISE NOTICE '✅ RLS est déjà activé';
  END IF;
END $$;

-- 3. Supprimer les anciennes policies (si elles existent)
DROP POLICY IF EXISTS "Allow public insert access" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow public update access" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow public delete access" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_insert_policy" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_update_policy" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_delete_policy" ON public.push_subscriptions;

-- 4. Créer la policy pour INSERT (permettre à tous d'insérer leur propre subscription)
CREATE POLICY "Allow public insert access"
ON public.push_subscriptions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 5. Créer la policy pour UPDATE (permettre à tous de mettre à jour leur subscription)
-- IMPORTANT: L'upsert nécessite à la fois USING et WITH CHECK
CREATE POLICY "Allow public update access"
ON public.push_subscriptions
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 6. Créer la policy pour DELETE (permettre à tous de supprimer leur subscription)
CREATE POLICY "Allow public delete access"
ON public.push_subscriptions
FOR DELETE
TO anon, authenticated
USING (true);

-- 7. Vérifier les policies créées
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'push_subscriptions';
  
  RAISE NOTICE '✅ Nombre de policies créées: %', policy_count;
  
  IF policy_count < 3 THEN
    RAISE WARNING '⚠️ Il devrait y avoir au moins 3 policies (INSERT, UPDATE, DELETE)';
  END IF;
END $$;

-- 8. Afficher les policies créées
SELECT 
  policyname as "Policy Name",
  cmd as "Command",
  roles as "Roles",
  qual as "USING",
  with_check as "WITH CHECK"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'push_subscriptions'
ORDER BY policyname;

-- ============================================
-- VÉRIFICATIONS FINALES
-- ============================================
-- Exécutez ces requêtes pour vérifier que tout fonctionne :

-- 1. Vérifier que RLS est activé
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename = 'push_subscriptions';

-- 2. Lister toutes les policies
-- SELECT * FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename = 'push_subscriptions';

-- 3. Tester un INSERT (doit fonctionner)
-- INSERT INTO public.push_subscriptions (endpoint, p256dh, auth, topics, locale)
-- VALUES ('test-endpoint', 'test-p256dh', 'test-auth', ARRAY['new-song'], 'pt-BR')
-- ON CONFLICT (endpoint) DO UPDATE SET last_seen_at = NOW();

-- 4. Nettoyer le test
-- DELETE FROM public.push_subscriptions WHERE endpoint = 'test-endpoint';

-- ============================================
-- FIN DU SCRIPT
-- ============================================

