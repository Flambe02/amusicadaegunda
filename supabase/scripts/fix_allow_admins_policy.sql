-- ===== CORRECTION DE LA POLICY "Allow admins full access" =====
-- Ce script corrige la policy si elle n'a pas de WITH CHECK

-- 1. Vérifier l'état actuel de la policy
SELECT 'État actuel de la policy:' as info;
SELECT 
  policyname,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'songs'
  AND policyname = 'Allow admins full access';

-- 2. Supprimer la policy existante si elle n'a pas de WITH CHECK
-- (On va la recréer correctement)
DROP POLICY IF EXISTS "Allow admins full access" ON public.songs;

-- 3. Recréer la policy avec USING et WITH CHECK corrects
CREATE POLICY "Allow admins full access" ON public.songs
FOR ALL  -- Permet SELECT, INSERT, UPDATE, DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid()
  )
);

-- 4. Vérifier que la policy est correctement créée
SELECT 'Policy corrigée:' as info;
SELECT 
  policyname,
  cmd,
  roles,
  qual as using_expression,
  with_check as with_check_expression,
  CASE 
    WHEN cmd = 'ALL' AND qual LIKE '%admins%' AND with_check LIKE '%admins%' THEN '✅ Policy correctement configurée'
    WHEN cmd = 'ALL' AND with_check IS NULL THEN '❌ WITH CHECK manquante - RECRÉER LA POLICY'
    ELSE '⚠️ Vérifier la configuration'
  END as status
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'songs'
  AND policyname = 'Allow admins full access';

-- 5. Vérifier les admins
SELECT 'Admins configurés (doit contenir votre utilisateur):' as info;
SELECT 
  a.user_id, 
  u.email,
  a.created_at
FROM public.admins a
JOIN auth.users u ON u.id = a.user_id
ORDER BY a.created_at DESC;

