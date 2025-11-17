-- ===== CORRECTION RAPIDE DE LA TABLE ADMINS =====
-- Script minimal pour corriger rapidement le problème de timeout

-- 1. Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.admins(
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Activer RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 3. Supprimer toutes les anciennes policies
DROP POLICY IF EXISTS "Admins can read their own record" ON public.admins;
DROP POLICY IF EXISTS "Admins can read all admins" ON public.admins;
DROP POLICY IF EXISTS "admins_select_own" ON public.admins;
DROP POLICY IF EXISTS "admins_authenticated_read" ON public.admins;
DROP POLICY IF EXISTS "admins_select_authenticated" ON public.admins;

-- 4. Créer la policy (simple et efficace)
CREATE POLICY "admins_select_own" ON public.admins
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 5. Vérification rapide
SELECT '✅ Table admins créée et RLS configuré' as status;

-- 6. Afficher votre user_id pour l'ajouter comme admin
SELECT 'Votre user_id (à copier):' as info;
SELECT id as user_id, email 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 1;

-- 7. Pour ajouter votre utilisateur comme admin, exécutez:
-- INSERT INTO public.admins (user_id) 
-- SELECT id FROM auth.users WHERE email = 'VOTRE_EMAIL@example.com'
-- ON CONFLICT (user_id) DO NOTHING;

