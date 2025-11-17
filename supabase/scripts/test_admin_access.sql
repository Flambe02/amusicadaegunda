-- ===== TEST ADMIN ACCESS =====
-- Ce script permet de tester l'accès admin pour un utilisateur spécifique

-- 1. Vérifier que la table admins existe et contient des données
SELECT 'Admins table check:' as info;
SELECT COUNT(*) as total_admins FROM public.admins;

-- 2. Afficher tous les admins avec leurs emails
SELECT 'Current admins:' as info;
SELECT a.user_id, u.email, a.created_at
FROM public.admins a
JOIN auth.users u ON u.id = a.user_id
ORDER BY a.created_at DESC;

-- 3. Vérifier les RLS policies sur la table admins
SELECT 'RLS Policies on admins table:' as info;
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='admins'
ORDER BY policyname;

-- 4. Tester la requête qui sera utilisée par l'application
-- (Remplacez 'USER-UUID-HERE' par un UUID réel pour tester)
SELECT 'Test query (remplacez USER-UUID-HERE par un UUID réel):' as info;
SELECT 'SELECT user_id FROM public.admins WHERE user_id = ''USER-UUID-HERE'';' as test_query;

-- 5. Vérifier que les admins peuvent accéder à la table songs
SELECT 'RLS Policies on songs table (pour vérifier l\'accès admin):' as info;
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='songs'
ORDER BY policyname;

-- 6. Vérifier que les admins peuvent créer/modifier des chansons
-- Cette requête simule ce que fait l'application pour vérifier l'accès admin
SELECT 'Admin access test (remplacez USER-UUID-HERE):' as info;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.admins 
      WHERE user_id = 'USER-UUID-HERE'::uuid
    ) THEN '✅ User IS admin'
    ELSE '❌ User is NOT admin'
  END as admin_status;

