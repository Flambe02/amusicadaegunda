-- ===== DIAGNOSTIC COMPLET - PROBLÈME D'ÉCRITURE ADMIN =====
-- Ce script diagnostique pourquoi l'écriture sur la table songs ne fonctionne pas

-- 1. Vérifier que RLS est activé
SELECT 'RLS Status:' as info;
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'songs';

-- 2. Lister TOUTES les policies sur la table songs
SELECT 'All RLS Policies on songs:' as info;
SELECT 
  policyname, 
  cmd as command, 
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'songs'
ORDER BY policyname;

-- 3. Vérifier les admins actuels
SELECT 'Current admins:' as info;
SELECT 
  a.user_id, 
  u.email, 
  u.created_at as user_created,
  a.created_at as admin_created
FROM public.admins a
JOIN auth.users u ON u.id = a.user_id
ORDER BY a.created_at DESC;

-- 4. Vérifier la session actuelle (si exécuté en tant qu'utilisateur connecté)
SELECT 'Current session user:' as info;
SELECT current_user, session_user;

-- 5. Tester les permissions pour un admin spécifique (remplacer USER_ID)
-- SELECT 'Testing permissions for admin:' as info;
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claim.sub = 'USER_ID_HERE';
-- SELECT * FROM public.songs LIMIT 1;

-- 6. Vérifier s'il y a des contraintes qui bloquent
SELECT 'Constraints on songs table:' as info;
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.songs'::regclass
ORDER BY conname;

-- 7. Vérifier les indexes (peuvent affecter les performances)
SELECT 'Indexes on songs table:' as info;
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'songs'
ORDER BY indexname;

-- 8. Compter les chansons par statut (pour vérifier l'accès)
SELECT 'Songs count by status:' as info;
SELECT status, COUNT(*) as count
FROM public.songs
GROUP BY status
ORDER BY status;

-- 9. Vérifier les dernières chansons créées
SELECT 'Last 5 songs created:' as info;
SELECT id, title, status, created_at, updated_at
FROM public.songs
ORDER BY created_at DESC
LIMIT 5;

-- 10. Vérifier si la policy admin permet bien INSERT, UPDATE, DELETE
SELECT 'Admin policy details:' as info;
SELECT 
  p.policyname,
  p.cmd,
  p.roles,
  CASE 
    WHEN p.cmd = 'ALL' THEN '✅ Permet INSERT, UPDATE, DELETE, SELECT'
    WHEN p.cmd = 'INSERT' THEN '✅ Permet INSERT'
    WHEN p.cmd = 'UPDATE' THEN '✅ Permet UPDATE'
    WHEN p.cmd = 'DELETE' THEN '✅ Permet DELETE'
    WHEN p.cmd = 'SELECT' THEN '✅ Permet SELECT'
    ELSE '⚠️ Commande inconnue'
  END as permissions
FROM pg_policies p
WHERE p.schemaname = 'public' 
  AND p.tablename = 'songs'
  AND p.policyname LIKE '%admin%'
ORDER BY p.policyname;

