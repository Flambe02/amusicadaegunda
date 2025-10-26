# 🎯 Instructions pour Activer l'Accès Admin

## Votre User ID
```
16f3be11-59c3-4d78-b3b1-32f7f87e01c8
```

## 📋 Étapes à Suivre

### 1. Exécuter le script SQL dans Supabase

1. **Aller sur** : https://supabase.com/dashboard/project/efnzmpzkzeuktqkghwfa
2. **Cliquer sur** : "SQL Editor" dans le menu de gauche
3. **Copier-coller** le contenu du fichier `add-user-admin.sql`
4. **Cliquer sur** "Run" pour exécuter le script

### 2. Vérifier le statut

Après l'exécution, vous devriez voir votre email avec le statut "✅ Vous"

### 3. Tester l'accès

1. **Aller sur** : https://www.amusicadasegunda.com/#/admin
2. **Se connecter** avec vos identifiants
3. Vous devriez accéder à l'interface Admin !

## ⚠️ Si ça ne fonctionne pas

### Vérifier la session
Ouvrez la console (F12) et vérifiez :
- Pas d'erreurs dans la console
- Session active visible

### Vérifier manuellement dans Supabase

Exécutez cette requête dans SQL Editor :

```sql
-- Vérifier si vous êtes admin
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.admins 
      WHERE user_id = '16f3be11-59c3-4d78-b3b1-32f7f87e01c8'
    ) THEN '✅ Vous êtes admin'
    ELSE '❌ Vous n''êtes PAS admin'
  END as status;

-- Voir votre email
SELECT id, email, created_at 
FROM auth.users 
WHERE id = '16f3be11-59c3-4d78-b3b1-32f7f87e01c8';
```

## 🔗 Liens utiles

- **Page Admin** : https://www.amusicadasegunda.com/#/admin
- **Page Login** : https://www.amusicadasegunda.com/#/login
- **Supabase Dashboard** : https://supabase.com/dashboard/project/efnzmpzkzeuktqkghwfa

## 📝 Logs de debug

Si vous rencontrez toujours des problèmes, envoyez les logs de la console (F12) pour diagnostic.

