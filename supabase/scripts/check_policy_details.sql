-- ===== VÉRIFICATION DÉTAILLÉE DE LA POLICY "Allow admins full access" =====
-- Ce script vérifie que la policy admin est correctement configurée

-- 1. Vérifier les détails complets de la policy
SELECT 'Détails complets de la policy "Allow admins full access":' as info;
SELECT 
  policyname,
  cmd as command,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'songs'
  AND policyname = 'Allow admins full access';

-- 2. Vérifier que la condition USING vérifie bien la table admins
SELECT 'Vérification de la condition USING:' as info;
SELECT 
  policyname,
  qual as using_condition,
  CASE 
    WHEN qual LIKE '%admins%' AND qual LIKE '%auth.uid()%' THEN '✅ Condition correcte - vérifie la table admins'
    WHEN qual LIKE '%auth.uid()%' THEN '⚠️ Vérifie auth.uid() mais pas la table admins'
    WHEN qual IS NULL THEN '❌ Condition USING manquante'
    ELSE '❌ Condition incorrecte'
  END as validation_status
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'songs'
  AND policyname = 'Allow admins full access';

-- 3. Vérifier que la condition WITH CHECK est présente (CRITIQUE pour INSERT/UPDATE)
SELECT 'Vérification de la condition WITH CHECK:' as info;
SELECT 
  policyname,
  with_check as with_check_condition,
  CASE 
    WHEN with_check LIKE '%admins%' AND with_check LIKE '%auth.uid()%' THEN '✅ WITH CHECK correcte - permet INSERT/UPDATE'
    WHEN with_check IS NULL THEN '❌ WITH CHECK manquante - BLOQUE INSERT/UPDATE'
    WHEN with_check LIKE '%auth.uid()%' THEN '⚠️ WITH CHECK vérifie auth.uid() mais pas la table admins'
    ELSE '❌ WITH CHECK incorrecte'
  END as validation_status
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'songs'
  AND policyname = 'Allow admins full access';

-- 4. Si WITH CHECK est manquante, créer un script pour la corriger
SELECT 'Si WITH CHECK est NULL, exécuter ce script:' as instruction;
SELECT 'ALTER POLICY "Allow admins full access" ON public.songs USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));' as fix_script;

-- 5. Vérifier tous les admins
SELECT 'Admins configurés:' as info;
SELECT 
  a.user_id, 
  u.email,
  a.created_at
FROM public.admins a
JOIN auth.users u ON u.id = a.user_id
ORDER BY a.created_at DESC;

