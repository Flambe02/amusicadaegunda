-- Fix Admin RLS Policies pour permettre l'enregistrement
-- Cette politique permet aux admins authentifiés de créer/modifier des chansons

-- 1. Désactiver temporairement RLS pour tester
ALTER TABLE public.songs DISABLE ROW LEVEL SECURITY;

-- 2. Supprimer toutes les policies existantes
DROP POLICY IF EXISTS "Chansons publiques visibles par tous" ON public.songs;
DROP POLICY IF EXISTS "Gestion complète des chansons" ON public.songs;
DROP POLICY IF EXISTS "songs_public_select_published" ON public.songs;
DROP POLICY IF EXISTS "songs_admin_all" ON public.songs;
DROP POLICY IF EXISTS "songs_public_read" ON public.songs;
DROP POLICY IF EXISTS "songs_authenticated_write" ON public.songs;
DROP POLICY IF EXISTS "songs_admin_full_access" ON public.songs;
DROP POLICY IF EXISTS "songs_public_read_published" ON public.songs;
DROP POLICY IF EXISTS "Allow public read" ON public.songs;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.songs;

-- 3. Créer une simple policy pour tout le monde peut lire les published
CREATE POLICY "Allow public to read published songs"
ON public.songs FOR SELECT
TO public
USING (status = 'published');

-- 4. Créer une policy pour les admins peuvent tout faire
CREATE POLICY "Allow admins full access"
ON public.songs FOR ALL
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

-- 5. Activer RLS
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

-- 6. Vérifier vos admins
SELECT 
  a.user_id, 
  u.email, 
  a.created_at,
  CASE 
    WHEN a.user_id = '16f3be11-59c3-4d78-b3b1-32f7f87e01c8' THEN '✅ Florent'
    WHEN a.user_id = 'fe76ea3b-5ad8-423e-8c6c-9afd9a7f1755' THEN '✅ Pimentão'
    WHEN a.user_id = 'bdc81f37-e6fa-4c16-ac70-f3218229c3fa' THEN '✅ Flambe01'
    ELSE ''
  END as name
FROM public.admins a
JOIN auth.users u ON u.id = a.user_id
ORDER BY a.created_at DESC;

-- 7. Tester la session actuelle
SELECT 
  auth.uid() as current_user_id,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.admins WHERE user_id = auth.uid()
    ) THEN '✅ Vous êtes admin'
    ELSE '❌ Vous n''êtes PAS admin'
  END as status;

-- 8. Vérifier les policies créées
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'songs'
ORDER BY policyname;

