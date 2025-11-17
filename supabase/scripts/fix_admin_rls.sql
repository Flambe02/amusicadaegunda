-- ===== FIX ADMIN RLS POLICIES =====
-- Ce script configure les RLS policies pour la table admins
-- pour permettre la vérification du statut admin en production

-- 1. Activer RLS sur la table admins (si pas déjà fait)
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes policies (si elles existent)
DROP POLICY IF EXISTS "admins_select_authenticated" ON public.admins;
DROP POLICY IF EXISTS "admins_public_read" ON public.admins;

-- 3. Créer la policy pour permettre aux utilisateurs authentifiés de vérifier leur propre statut admin
-- Cette policy permet à un utilisateur authentifié de lire sa propre entrée dans la table admins
CREATE POLICY "admins_select_authenticated" ON public.admins
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 4. Vérifier que la table existe et contient des données
SELECT 'Admins table check:' as info;
SELECT COUNT(*) as total_admins FROM public.admins;

-- 5. Afficher les admins actuels (pour vérification)
SELECT 'Current admins:' as info;
SELECT a.user_id, u.email, a.created_at
FROM public.admins a
JOIN auth.users u ON u.id = a.user_id
ORDER BY a.created_at DESC;

-- 6. Vérifier les policies créées
SELECT 'RLS Policies on admins table:' as info;
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='admins'
ORDER BY policyname;

