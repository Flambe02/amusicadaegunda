-- ===== VÉRIFICATION DE LA POLICY ADMIN =====
-- Ce script vérifie que la policy admin est correctement configurée

-- 1. Vérifier les détails complets de la policy "Allow admins full access"
SELECT 'Détails de la policy "Allow admins full access":' as info;
SELECT 
  policyname,
  cmd as command,
  roles,
  qual as using_expression,
  with_check as with_check_expression,
  CASE 
    WHEN cmd = 'ALL' THEN '✅ Permet toutes les opérations'
    ELSE '⚠️ Opération limitée'
  END as status
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'songs'
  AND policyname LIKE '%admin%'
ORDER BY policyname;

-- 2. Vérifier que la policy vérifie bien la table admins
SELECT 'Vérification de la condition USING:' as info;
SELECT 
  policyname,
  qual as using_condition,
  CASE 
    WHEN qual LIKE '%admins%' AND qual LIKE '%auth.uid()%' THEN '✅ Condition correcte - vérifie la table admins'
    WHEN qual LIKE '%auth.uid()%' THEN '⚠️ Vérifie auth.uid() mais pas la table admins'
    ELSE '❌ Condition incorrecte ou manquante'
  END as validation
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'songs'
  AND policyname LIKE '%admin%';

-- 3. Vérifier que la policy a bien WITH CHECK
SELECT 'Vérification de la condition WITH CHECK:' as info;
SELECT 
  policyname,
  with_check as with_check_condition,
  CASE 
    WHEN with_check LIKE '%admins%' AND with_check LIKE '%auth.uid()%' THEN '✅ WITH CHECK correcte'
    WHEN with_check IS NULL THEN '⚠️ WITH CHECK manquante (peut bloquer INSERT/UPDATE)'
    ELSE '❌ WITH CHECK incorrecte'
  END as validation
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'songs'
  AND policyname LIKE '%admin%';

-- 4. Tester si un admin peut voir toutes les chansons (pas seulement published)
SELECT 'Test: Un admin devrait voir toutes les chansons (draft, published, etc.)' as info;
SELECT 
  'Si cette requête retourne des chansons avec status != published, la policy fonctionne' as note;

-- 5. Vérifier les admins actuels
SELECT 'Admins configurés:' as info;
SELECT 
  a.user_id, 
  u.email,
  a.created_at
FROM public.admins a
JOIN auth.users u ON u.id = a.user_id
ORDER BY a.created_at DESC;

-- 6. Vérifier la session actuelle (si exécuté en tant qu'utilisateur connecté)
SELECT 'Session actuelle:' as info;
SELECT 
  current_user,
  session_user,
  'Pour tester en tant qu''admin, vous devez être connecté avec un compte admin' as note;

