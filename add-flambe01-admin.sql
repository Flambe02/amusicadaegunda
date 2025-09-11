-- Script pour ajouter flambe01@gmail.com comme admin
-- Exécuter dans l'éditeur SQL de Supabase

-- 1. Vérifier si l'utilisateur existe
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'flambe01@gmail.com';

-- 2. Si l'utilisateur existe, l'ajouter comme admin
-- Remplacer 'UUID-DE-FLAMBE01' par l'UUID réel trouvé ci-dessus
INSERT INTO public.admins(user_id) 
VALUES ('UUID-DE-FLAMBE01') 
ON CONFLICT (user_id) DO NOTHING;

-- 3. Vérifier que l'admin a été ajouté
SELECT a.user_id, u.email, a.created_at
FROM public.admins a
JOIN auth.users u ON u.id = a.user_id
WHERE u.email = 'flambe01@gmail.com';

-- 4. Tester l'accès admin
-- Cette requête devrait fonctionner pour l'utilisateur admin
SELECT * FROM public.songs LIMIT 3;
