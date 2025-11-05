-- ✅ NETTOYAGE COMPLET des politiques RLS de la table admins
-- On supprime TOUTES les anciennes politiques et on repart à zéro

-- 1️⃣ Supprimer TOUTES les politiques existantes
DROP POLICY IF EXISTS "Admins can view their own data" ON public.admins;
DROP POLICY IF EXISTS "admins_self_select" ON public.admins;
DROP POLICY IF EXISTS "admins_no_client_writes" ON public.admins;
DROP POLICY IF EXISTS "Admins can view admins list" ON public.admins;
DROP POLICY IF EXISTS "authenticated_users_can_read_admins" ON public.admins;

-- 2️⃣ Créer UNE SEULE politique simple et claire
-- Les utilisateurs authentifiés peuvent lire la table admins
CREATE POLICY "allow_authenticated_read_admins"
ON public.admins
FOR SELECT
TO authenticated
USING (true);

-- 3️⃣ S'assurer que RLS est activé
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 4️⃣ Vérification finale
SELECT 
  '✅ Politiques actives après nettoyage:' as info,
  policyname,
  cmd as "Command",
  roles as "Roles",
  qual as "USING clause"
FROM pg_policies 
WHERE tablename = 'admins';

