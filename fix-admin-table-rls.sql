-- ✅ Script pour corriger les politiques RLS de la table admins
-- Ce script permet aux utilisateurs authentifiés de vérifier s'ils sont admin

-- 1️⃣ Vérifier si la table admins existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'admins'
);

-- 2️⃣ Voir les politiques actuelles
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
WHERE tablename = 'admins';

-- 3️⃣ Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent voir leurs propres droits admin" ON public.admins;
DROP POLICY IF EXISTS "Admins can read all admin records" ON public.admins;
DROP POLICY IF EXISTS "Users can read their own admin status" ON public.admins;

-- 4️⃣ Créer une nouvelle politique simple et claire
-- Cette politique permet à TOUS les utilisateurs authentifiés de lire la table admins
-- pour vérifier s'ils sont admin ou non
CREATE POLICY "authenticated_users_can_read_admins"
ON public.admins
FOR SELECT
TO authenticated
USING (true);

-- 5️⃣ Vérifier que RLS est activé sur la table
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 6️⃣ Vérification finale
SELECT 
  'Table admins - RLS Status:' as info,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE tablename = 'admins';

-- 7️⃣ Voir les politiques après modification
SELECT 
  'Politiques actives:' as info,
  policyname,
  cmd as "Command",
  roles as "Roles"
FROM pg_policies 
WHERE tablename = 'admins';

