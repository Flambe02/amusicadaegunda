# 🔐 Diagnostic Accès Admin

## Problèmes potentiels

### 1. ❌ Pas de session active
**Symptôme:** Vous êtes redirigé vers la page de login
**Solution:** Connectez-vous d'abord sur https://www.amusicadasegunda.com/#/login

### 2. ❌ Utilisateur pas dans la table admins
**Symptôme:** Vous vous connectez mais voyez "Vous n'avez pas les droits d'administrateur"
**Solution:** Exécuter dans Supabase SQL Editor:

```sql
-- Vérifier les utilisateurs actifs
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;

-- Ajouter l'utilisateur comme admin (remplacer USER_ID)
INSERT INTO public.admins(user_id) 
VALUES ('USER_ID_ICI') 
ON CONFLICT (user_id) DO NOTHING;

-- Vérifier les admins
SELECT a.user_id, u.email, a.created_at
FROM public.admins a
JOIN auth.users u ON u.id = a.user_id;
```

### 3. ❌ Table admins n'existe pas
**Solution:** Exécuter dans Supabase SQL Editor:

```sql
-- Créer la table admins
CREATE TABLE IF NOT EXISTS public.admins(
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activer RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Créer policy pour permettre aux admins de voir la liste des admins
CREATE POLICY "Admins can view admins list"
ON public.admins FOR SELECT
TO authenticated
USING (true);
```

### 4. ❌ Policies RLS bloquent l'accès
**Solution:** Vérifier que les policies sont correctes dans Supabase

## Test rapide

1. Ouvrir https://www.amusicadasegunda.com/#/admin
2. Se connecter avec vos identifiants
3. Ouvrir la console (F12) et regarder les erreurs
4. Vérifier la table admins dans Supabase

## Commande utile dans Supabase SQL

```sql
-- Voir tous les admins avec leurs emails
SELECT 
  a.user_id, 
  u.email, 
  a.created_at,
  CASE 
    WHEN u.id = auth.uid() THEN '✅ Vous'
    ELSE ''
  END as current_user
FROM public.admins a
JOIN auth.users u ON u.id = a.user_id
ORDER BY a.created_at DESC;
```

## Debugging

Pour voir les logs détaillés:
1. Ouvrez la console (F12)
2. Allez sur https://www.amusicadasegunda.com/#/admin
3. Regardez les messages d'erreur dans la console
4. Reportez les erreurs pour diagnostic

