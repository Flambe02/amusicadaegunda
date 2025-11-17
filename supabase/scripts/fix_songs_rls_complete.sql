-- ===== CORRECTION COMPLÈTE DES RLS POLICIES POUR SONGS =====
-- Ce script corrige toutes les policies RLS pour permettre l'écriture admin

-- 1. Activer RLS sur la table songs
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer TOUTES les anciennes policies pour repartir propre
DROP POLICY IF EXISTS "Chansons publiques visibles par tous" ON public.songs;
DROP POLICY IF EXISTS "Gestion complète des chansons" ON public.songs;
DROP POLICY IF EXISTS "songs_public_select_published" ON public.songs;
DROP POLICY IF EXISTS "songs_admin_all" ON public.songs;
DROP POLICY IF EXISTS "songs_public_read" ON public.songs;
DROP POLICY IF EXISTS "songs_authenticated_write" ON public.songs;
DROP POLICY IF EXISTS "songs_admin_full_access" ON public.songs;
DROP POLICY IF EXISTS "songs_public_read_published" ON public.songs;

-- 3. Créer les policies correctes

-- Policy 1: Lecture publique des chansons publiées (pour le site public)
CREATE POLICY "songs_public_read_published" ON public.songs
FOR SELECT
TO anon, authenticated
USING (status = 'published');

-- Policy 2: Accès complet pour les admins (SELECT, INSERT, UPDATE, DELETE)
-- IMPORTANT: Cette policy doit permettre TOUTES les opérations (ALL)
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

-- 4. Vérifier que les policies sont créées
SELECT 'RLS Policies créées:' as info;
SELECT 
  policyname, 
  cmd as command, 
  roles,
  CASE 
    WHEN cmd = 'ALL' THEN '✅ Permet toutes les opérations'
    ELSE '⚠️ Opération limitée: ' || cmd
  END as status
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'songs'
ORDER BY policyname;

-- 5. Vérifier les admins
SELECT 'Admins configurés:' as info;
SELECT 
  a.user_id, 
  u.email,
  a.created_at
FROM public.admins a
JOIN auth.users u ON u.id = a.user_id
ORDER BY a.created_at DESC;

-- 6. Instructions pour tester
SELECT 'Pour tester l''écriture, exécutez en tant qu''admin connecté:' as instruction;
SELECT 'INSERT INTO public.songs (title, artist, release_date, status) VALUES (''Test'', ''Test Artist'', CURRENT_DATE, ''draft'') RETURNING id, title;' as test_query;

