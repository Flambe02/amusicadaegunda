-- Ajouter l'utilisateur comme admin
-- User ID: 16f3be11-59c3-4d78-b3b1-32f7f87e01c8

-- 1. Créer la table admins si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.admins(
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Activer RLS sur la table admins
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 3. Créer une policy pour permettre aux admins de voir la liste des admins
DROP POLICY IF EXISTS "Admins can view admins list" ON public.admins;
CREATE POLICY "Admins can view admins list"
ON public.admins FOR SELECT
TO authenticated
USING (true);

-- 4. Ajouter l'utilisateur comme admin
INSERT INTO public.admins(user_id) 
VALUES ('16f3be11-59c3-4d78-b3b1-32f7f87e01c8') 
ON CONFLICT (user_id) DO NOTHING;

-- 5. Vérifier que l'utilisateur a été ajouté
SELECT 
  a.user_id, 
  u.email, 
  a.created_at,
  CASE 
    WHEN a.user_id = '16f3be11-59c3-4d78-b3b1-32f7f87e01c8' THEN '✅ Vous'
    ELSE ''
  END as status
FROM public.admins a
JOIN auth.users u ON u.id = a.user_id
ORDER BY a.created_at DESC;

-- 6. Vérifier les policies RLS pour la table songs
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
WHERE tablename = 'songs';

