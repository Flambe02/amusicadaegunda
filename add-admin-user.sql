-- Script pour ajouter un utilisateur admin
-- Exécuter dans l'éditeur SQL de Supabase

-- 1. Vérifier les utilisateurs existants
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Ajouter un utilisateur admin (remplacer par l'UUID réel)
-- IMPORTANT: Remplacer 'VOTRE-UUID-ICI' par l'UUID de votre utilisateur
INSERT INTO public.admins(user_id) 
VALUES ('VOTRE-UUID-ICI') 
ON CONFLICT (user_id) DO NOTHING;

-- 3. Vérifier que l'admin a été ajouté
SELECT a.user_id, u.email, a.created_at
FROM public.admins a
JOIN auth.users u ON u.id = a.user_id
ORDER BY a.created_at DESC;

-- 4. Tester les policies RLS
-- Cette requête devrait fonctionner pour un utilisateur authentifié admin
SELECT * FROM public.songs LIMIT 5;
