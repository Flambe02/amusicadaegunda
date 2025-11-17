-- ===== CORRECTION COMPLÈTE DES RLS POUR LA TABLE ADMINS =====
-- Ce script corrige les RLS policies pour permettre la vérification admin

-- 1. Vérifier que la table admins existe
SELECT '=== VÉRIFICATION TABLE ADMINS ===' as info;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admins') 
    THEN '✅ Table admins existe'
    ELSE '❌ Table admins n''existe pas - CRÉATION...'
  END as table_status;

-- 2. Créer la table admins si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.admins(
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Vérifier l'état actuel des RLS sur admins
SELECT '=== ÉTAT ACTUEL DES RLS SUR ADMINS ===' as info;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'admins'
    ) THEN '✅ Table admins existe'
    ELSE '❌ Table admins n''existe pas'
  END as table_exists;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' 
        AND c.relname = 'admins'
        AND c.relrowsecurity = true
    ) THEN '✅ RLS activé'
    ELSE '⚠️ RLS non activé'
  END as rls_status;

-- 4. Activer RLS sur la table admins
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 5. Supprimer toutes les anciennes policies
DROP POLICY IF EXISTS "Admins can read their own record" ON public.admins;
DROP POLICY IF EXISTS "Admins can read all admins" ON public.admins;
DROP POLICY IF EXISTS "admins_select_own" ON public.admins;
DROP POLICY IF EXISTS "admins_authenticated_read" ON public.admins;

-- 6. Créer la policy correcte : les utilisateurs authentifiés peuvent lire leur propre enregistrement admin
CREATE POLICY "admins_select_own" ON public.admins
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 7. Vérifier que la policy est créée
SELECT '=== POLICIES CRÉÉES ===' as info;

SELECT 
  policyname,
  cmd as command,
  roles,
  qual as using_expression,
  CASE 
    WHEN qual LIKE '%auth.uid()%' THEN '✅ Policy correcte - permet la lecture de son propre enregistrement'
    ELSE '⚠️ Policy à vérifier'
  END as validation_status
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'admins'
ORDER BY policyname;

-- 8. Vérifier les admins existants
SELECT '=== ADMINS CONFIGURÉS ===' as info;
SELECT 
  a.user_id, 
  u.email,
  a.created_at
FROM public.admins a
JOIN auth.users u ON u.id = a.user_id
ORDER BY a.created_at DESC;

-- 9. Instructions pour ajouter un admin si nécessaire
SELECT '=== INSTRUCTIONS ===' as info;
SELECT 'Pour ajouter un admin, exécutez:' as instruction;
SELECT 'INSERT INTO public.admins (user_id) VALUES (''VOTRE_USER_ID'') ON CONFLICT (user_id) DO NOTHING;' as sql_example;
SELECT 'Pour trouver votre user_id: Supabase Dashboard > Authentication > Users' as note;

