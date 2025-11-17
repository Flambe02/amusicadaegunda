-- ===== VÉRIFICATION ET CORRECTION DES RLS POLICIES =====
-- Ce script vérifie et corrige les RLS policies pour permettre la sauvegarde de chansons

-- 1. Vérifier l'état actuel des policies
SELECT '=== ÉTAT ACTUEL DES POLICIES ===' as info;

SELECT 
  policyname,
  cmd as command,
  roles,
  qual as using_expression,
  with_check as with_check_expression,
  CASE 
    WHEN cmd = 'ALL' AND with_check IS NOT NULL AND with_check LIKE '%admins%' AND with_check LIKE '%auth.uid()%' THEN '✅ Policy correcte'
    WHEN cmd = 'ALL' AND with_check IS NULL THEN '❌ WITH CHECK manquante - BLOQUE INSERT/UPDATE'
    WHEN cmd != 'ALL' THEN '⚠️ Policy limitée (pas ALL)'
    ELSE '⚠️ Policy à vérifier'
  END as status
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'songs'
ORDER BY policyname;

-- 2. Vérifier que la table admins existe et est accessible
SELECT '=== VÉRIFICATION TABLE ADMINS ===' as info;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admins') 
    THEN '✅ Table admins existe'
    ELSE '❌ Table admins n''existe pas'
  END as table_status;

-- 3. Vérifier les admins existants
SELECT '=== ADMINS CONFIGURÉS ===' as info;
SELECT 
  a.user_id, 
  u.email,
  a.created_at
FROM public.admins a
JOIN auth.users u ON u.id = a.user_id
ORDER BY a.created_at DESC;

-- 4. Supprimer toutes les anciennes policies pour repartir propre
SELECT '=== SUPPRESSION DES ANCIENNES POLICIES ===' as info;

DROP POLICY IF EXISTS "Chansons publiques visibles par tous" ON public.songs;
DROP POLICY IF EXISTS "Gestion complète des chansons" ON public.songs;
DROP POLICY IF EXISTS "songs_public_select_published" ON public.songs;
DROP POLICY IF EXISTS "songs_admin_all" ON public.songs;
DROP POLICY IF EXISTS "songs_public_read" ON public.songs;
DROP POLICY IF EXISTS "songs_authenticated_write" ON public.songs;
DROP POLICY IF EXISTS "songs_admin_full_access" ON public.songs;
DROP POLICY IF EXISTS "songs_public_read_published" ON public.songs;
DROP POLICY IF EXISTS "Allow admins full access" ON public.songs;

-- 5. Activer RLS sur la table songs
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

-- 6. Créer les policies correctes

-- Policy 1: Lecture publique des chansons publiées
CREATE POLICY "songs_public_read_published" ON public.songs
FOR SELECT
TO anon, authenticated
USING (status = 'published');

-- Policy 2: Accès complet pour les admins (CRITIQUE: avec WITH CHECK pour INSERT/UPDATE)
CREATE POLICY "songs_admin_full_access" ON public.songs
FOR ALL  -- ALL = SELECT, INSERT, UPDATE, DELETE
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

-- 7. Vérifier que les policies sont correctement créées
SELECT '=== POLICIES APRÈS CORRECTION ===' as info;

SELECT 
  policyname,
  cmd as command,
  roles,
  CASE 
    WHEN cmd = 'ALL' AND with_check IS NOT NULL AND with_check LIKE '%admins%' AND with_check LIKE '%auth.uid()%' THEN '✅ Policy correcte - INSERT/UPDATE fonctionnent'
    WHEN cmd = 'ALL' AND with_check IS NULL THEN '❌ WITH CHECK manquante'
    ELSE '⚠️ À vérifier'
  END as validation_status
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'songs'
ORDER BY policyname;

-- 8. Instructions finales
SELECT '=== INSTRUCTIONS ===' as info;
SELECT '1. Vérifiez que la policy "songs_admin_full_access" a bien "✅ Policy correcte"' as step1;
SELECT '2. Vérifiez que votre utilisateur est dans la table admins' as step2;
SELECT '3. Testez la sauvegarde d''une chanson dans l''interface admin' as step3;

