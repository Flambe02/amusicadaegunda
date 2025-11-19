-- ============================================
-- SCRIPT DE NETTOYAGE ET CORRECTION RLS
-- Table: push_subscriptions
-- ============================================
-- Ce script nettoie les policies en double
-- et s'assure que les bonnes policies sont en place
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

-- 2. S'assurer que RLS est activé
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. SUPPRIMER TOUTES LES ANCIENNES POLICIES (nettoyage complet)
DROP POLICY IF EXISTS "Allow public insert access" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow public insert" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow public update access" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow public delete access" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow public delete" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow service role read" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_public_update_by_endpoint" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_public_upsert_own_endpoint" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_insert_policy" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_update_policy" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_delete_policy" ON public.push_subscriptions;

-- 4. CRÉER LES POLICIES OPTIMALES (une seule par opération)

-- Policy pour INSERT : Permettre à tous (anon + authenticated) d'insérer leur subscription
-- Condition WITH CHECK simple pour permettre l'upsert
CREATE POLICY "push_allow_insert"
ON public.push_subscriptions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy pour UPDATE : Permettre à tous de mettre à jour leur subscription
-- IMPORTANT: L'upsert nécessite à la fois USING et WITH CHECK
CREATE POLICY "push_allow_update"
ON public.push_subscriptions
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Policy pour DELETE : Permettre à tous de supprimer leur subscription
CREATE POLICY "push_allow_delete"
ON public.push_subscriptions
FOR DELETE
TO anon, authenticated
USING (true);

-- Policy pour SELECT : Permettre à tous de lire (pour le service role aussi)
CREATE POLICY "push_allow_select"
ON public.push_subscriptions
FOR SELECT
TO anon, authenticated, service_role
USING (true);

-- 5. Vérifier les policies créées
DO $$
DECLARE
  policy_count INTEGER;
  policy_names TEXT[];
BEGIN
  SELECT COUNT(*), array_agg(policyname ORDER BY policyname)
  INTO policy_count, policy_names
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'push_subscriptions';
  
  RAISE NOTICE '✅ Nombre de policies créées: %', policy_count;
  RAISE NOTICE '✅ Policies: %', array_to_string(policy_names, ', ');
  
  IF policy_count < 4 THEN
    RAISE WARNING '⚠️ Il devrait y avoir 4 policies (INSERT, UPDATE, DELETE, SELECT)';
  END IF;
END $$;

-- 6. Afficher les policies finales
SELECT 
  policyname as "Policy Name",
  cmd as "Command",
  roles as "Roles",
  qual as "USING",
  with_check as "WITH CHECK"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'push_subscriptions'
ORDER BY cmd, policyname;

-- ============================================
-- TEST DE VALIDATION
-- ============================================
-- Exécutez ces requêtes pour vérifier que tout fonctionne :

-- Test 1: Vérifier que RLS est activé
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename = 'push_subscriptions';
-- Résultat attendu: rowsecurity = true

-- Test 2: Tester un INSERT (doit fonctionner)
-- INSERT INTO public.push_subscriptions (endpoint, p256dh, auth, topics, locale)
-- VALUES ('test-endpoint-' || gen_random_uuid()::text, 'test-p256dh', 'test-auth', ARRAY['new-song'], 'pt-BR')
-- ON CONFLICT (endpoint) DO UPDATE SET last_seen_at = NOW();
-- Résultat attendu: INSERT 0 1

-- Test 3: Tester un UPDATE (doit fonctionner)
-- UPDATE public.push_subscriptions 
-- SET last_seen_at = NOW()
-- WHERE endpoint LIKE 'test-endpoint-%'
-- LIMIT 1;
-- Résultat attendu: UPDATE 1

-- Test 4: Nettoyer les tests
-- DELETE FROM public.push_subscriptions WHERE endpoint LIKE 'test-endpoint-%';
-- Résultat attendu: DELETE X (où X est le nombre de lignes de test)

-- ============================================
-- NOTES IMPORTANTES
-- ============================================
-- 1. Les policies utilisent 'anon, authenticated' pour permettre l'accès
--    aux utilisateurs non authentifiés (nécessaire pour les PWA)
-- 2. La policy UPDATE a USING (true) ET WITH CHECK (true) pour permettre
--    l'upsert qui fait à la fois INSERT et UPDATE
-- 3. La policy SELECT inclut aussi 'service_role' pour permettre aux
--    fonctions Edge de lire les subscriptions
-- ============================================

