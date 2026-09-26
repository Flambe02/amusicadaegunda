# 🔐 Guide de Configuration Admin - Música da Segunda

## 🎯 Objectif
Configurer l'accès administrateur sécurisé pour le site en production.

## 📋 Étapes de Configuration

### 1. **Exécuter les Policies RLS dans Supabase**

1. Aller sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionner votre projet
3. Aller dans **SQL Editor**
4. Exécuter le script `supabase-policies.sql` :

```sql
-- Copier-coller le contenu de supabase-policies.sql
-- Ce script configure les policies RLS pour la sécurité
```

### 2. **Créer un Compte Administrateur**

#### Option A : Via Supabase Auth (Recommandé)
1. Aller dans **Authentication > Users**
2. Cliquer sur **Add user**
3. Créer un utilisateur avec email/mot de passe
4. Noter l'UUID de l'utilisateur créé

#### Option B : Via l'interface web
1. Aller sur https://www.amusicadasegunda.com/admin
2. Cliquer sur "Contacter l'administrateur" (pour l'instant)
3. Utiliser l'email de récupération

### 3. **Ajouter l'Utilisateur comme Admin**

1. Dans Supabase SQL Editor, exécuter :

```sql
-- Remplacer 'VOTRE-UUID-ICI' par l'UUID réel de l'utilisateur
INSERT INTO public.admins(user_id) 
VALUES ('VOTRE-UUID-ICI') 
ON CONFLICT (user_id) DO NOTHING;
```

2. Vérifier l'ajout :

```sql
SELECT a.user_id, u.email, a.created_at
FROM public.admins a
JOIN auth.users u ON u.id = a.user_id;
```

### 4. **Configurer les URLs de Redirection**

1. Aller dans **Authentication > URL Configuration**
2. Ajouter dans **Redirect URLs** :
   - `https://www.amusicadasegunda.com/admin`
   - `https://www.amusicadasegunda.com/login`
3. Ajouter dans **Site URL** :
   - `https://www.amusicadasegunda.com`

### 5. **Tester l'Accès Admin**

1. Aller sur https://www.amusicadasegunda.com/admin
2. Se connecter avec les identifiants admin
3. Vérifier que l'interface Admin s'affiche
4. Tester la création/modification d'une chanson

## 🧪 Tests de Validation

### Test 1 : Accès Admin
```bash
# Dans la console du navigateur sur le site
# Copier-coller le contenu de test-admin-access.js
```

### Test 2 : Fonctionnalités Admin
- ✅ Connexion réussie
- ✅ Interface Admin visible
- ✅ Liste des chansons chargée
- ✅ Création d'une chanson
- ✅ Modification d'une chanson
- ✅ Suppression d'une chanson

### Test 3 : Synchronisation Home
- ✅ Chanson publiée via Admin
- ✅ Chanson visible immédiatement sur la Home
- ✅ Tri correct (plus récente en premier)

## 🔧 Dépannage

### Problème : "Vous n'avez pas les droits d'administrateur"
**Solution :**
1. Vérifier que l'utilisateur existe dans `auth.users`
2. Vérifier que l'UUID est correct dans `public.admins`
3. Exécuter la requête de vérification

### Problème : Redirection vers la page principale
**Solution :**
1. Vérifier les URLs de redirection dans Supabase
2. Vérifier que les policies RLS sont actives
3. Vérifier les variables d'environnement

### Problème : Erreur de connexion
**Solution :**
1. Vérifier les identifiants email/mot de passe
2. Vérifier que l'utilisateur est confirmé dans Supabase
3. Vérifier les logs dans la console du navigateur

## 📁 Fichiers Modifiés

- ✅ `src/pages/Login.jsx` - Page de connexion
- ✅ `src/components/ProtectedAdmin.jsx` - Protection Admin
- ✅ `src/pages/index.jsx` - Routage modifié
- ✅ `supabase-policies.sql` - Policies RLS
- ✅ `add-admin-user.sql` - Script ajout admin
- ✅ `test-admin-access.js` - Tests de validation

## 🚀 Déploiement

1. **Commit et Push :**
```bash
git add .
git commit -m "🔐 Ajout système d'authentification Admin"
git push origin main
```

2. **Vérification :**
- Site déployé automatiquement via GitHub Pages
- Admin accessible sur https://www.amusicadasegunda.com/admin
- Page de login affichée si non connecté

## 🎉 Résultat Final

- ✅ **Admin protégé** : Seuls les admins authentifiés y accèdent
- ✅ **Page de login** : Interface de connexion élégante
- ✅ **Sécurité RLS** : Policies Supabase appropriées
- ✅ **Synchronisation** : Admin → Home en temps réel
- ✅ **Production ready** : Système complet et sécurisé

---

**🌐 URLs importantes :**
- Site : https://www.amusicadasegunda.com
- Admin : https://www.amusicadasegunda.com/admin
- Login : https://www.amusicadasegunda.com/admin (redirection automatique)
