-- ===== CORRECTION RAPIDE - AJOUTER WITH CHECK À LA POLICY =====
-- Ce script ajoute WITH CHECK à la policy "Allow admins full access" si elle est manquante

-- 1. Vérifier l'état actuel
SELECT 'État actuel de la policy:' as info;
SELECT 
  policyname,
  cmd,
  qual as using_expression,
  with_check as with_check_expression,
  CASE 
    WHEN with_check IS NULL THEN '❌ WITH CHECK manquante - BLOQUE INSERT/UPDATE'
    WHEN with_check LIKE '%admins%' AND with_check LIKE '%auth.uid()%' THEN '✅ WITH CHECK correcte'
    ELSE '⚠️ WITH CHECK présente mais à vérifier'
  END as status
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'songs'
  AND policyname = 'Allow admins full access';

-- 2. Si WITH CHECK est NULL, recréer la policy
-- Note: On ne peut pas modifier une policy existante, il faut la supprimer et la recréer

-- Supprimer la policy existante
DROP POLICY IF EXISTS "Allow admins full access" ON public.songs;

-- Recréer la policy avec USING et WITH CHECK
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

-- 3. Vérifier que la policy est correctement créée
SELECT 'Policy corrigée:' as info;
SELECT 
  policyname,
  cmd,
  roles,
  qual as using_expression,
  with_check as with_check_expression,
  CASE 
    WHEN cmd = 'ALL' 
      AND qual LIKE '%admins%' 
      AND qual LIKE '%auth.uid()%'
      AND with_check LIKE '%admins%' 
      AND with_check LIKE '%auth.uid()%' 
    THEN '✅ Policy correctement configurée - INSERT/UPDATE devraient fonctionner'
    ELSE '⚠️ Vérifier la configuration'
  END as validation_status
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'songs'
  AND policyname = 'Allow admins full access';

-- 4. Vérifier les admins (doit contenir votre utilisateur)
SELECT 'Admins configurés:' as info;
SELECT 
  a.user_id, 
  u.email,
  a.created_at
FROM public.admins a
JOIN auth.users u ON u.id = a.user_id
ORDER BY a.created_at DESC;

