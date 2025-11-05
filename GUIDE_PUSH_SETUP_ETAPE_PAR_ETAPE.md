# 🚀 Guide Étape par Étape - Configuration Push Notifications

## 📋 Vue d'ensemble

Ce guide vous accompagne pour :
1. ✅ Créer la table Supabase (Point 3)
2. ✅ Déployer l'API Push sur Vercel (Point 2)

---

## ✅ ÉTAPE 1 : Créer la table Supabase

### 1.1 Ouvrir Supabase Dashboard

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Cliquez sur **SQL Editor** (menu de gauche)

### 1.2 Exécuter le script SQL

1. **Ouvrez le fichier** `CREATE_PUSH_TABLE.sql` dans votre projet
2. **Copiez tout le contenu**
3. **Collez dans l'éditeur SQL** de Supabase
4. **Cliquez sur "Run"** (ou Ctrl+Enter)

### 1.3 Vérifier que la table existe

Dans l'éditeur SQL, exécutez :

```sql
-- Vérifier la table
SELECT * FROM push_subscriptions LIMIT 1;
```

Si vous voyez une table vide (pas d'erreur), c'est bon ! ✅

---

## ✅ ÉTAPE 2 : Déployer l'API Push sur Vercel

### 2.1 Installer Vercel CLI

```powershell
npm install -g vercel
```

### 2.2 Se connecter à Vercel

```powershell
vercel login
```

Suivez les instructions dans le navigateur pour vous connecter.

### 2.3 Naviguer vers le dossier push-api

```powershell
cd push-api
```

### 2.4 Déployer le projet

```powershell
vercel
```

**Réponses aux questions** :
- `Set up and deploy?` → **Y**
- `Which scope?` → Sélectionnez votre compte
- `Link to existing project?` → **N** (nouveau projet)
- `Project name?` → `musica-da-segunda-push` (ou votre choix)
- `Directory?` → Appuyez sur **Entrée** (laisser vide)
- `Override settings?` → **N**

### 2.5 Noter l'URL de déploiement

Après le déploiement, Vercel affichera quelque chose comme :
```
✅ Production: https://musica-da-segunda-push.vercel.app [copied to clipboard]
```

**Copiez cette URL** - vous en aurez besoin !

---

## ✅ ÉTAPE 3 : Configurer les variables d'environnement

### 3.1 Ouvrir le dashboard Vercel

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet `musica-da-segunda-push`

### 3.2 Ajouter les variables

1. Cliquez sur **Settings** (onglet)
2. Cliquez sur **Environment Variables** (menu de gauche)
3. Ajoutez chaque variable une par une :

#### Variable 1 : VAPID_PUBLIC_KEY
- **Key** : `VAPID_PUBLIC_KEY`
- **Value** : `BNmWY52nhsYuohsMsFuFw5-vPv20qLw6nehrF-vyzPm87xU-6cPUoJhwtAVxj_18TcREBqx2uLdr5dcl57gVVNw`
- **Environments** : ✅ Production, ✅ Preview, ✅ Development
- Cliquez sur **Save**

#### Variable 2 : VAPID_PRIVATE_KEY
- **Key** : `VAPID_PRIVATE_KEY`
- **Value** : Votre clé privée VAPID (dans votre `.env` ou générée)
- **Environments** : ✅ Production, ✅ Preview, ✅ Development
- Cliquez sur **Save**

#### Variable 3 : SUPABASE_URL
- **Key** : `SUPABASE_URL`
- **Value** : `https://votre-projet.supabase.co` (sans `/rest/v1`)
  - Trouvable dans : Supabase Dashboard → Settings → API → Project URL
- **Environments** : ✅ Production, ✅ Preview, ✅ Development
- Cliquez sur **Save**

#### Variable 4 : SUPABASE_SERVICE_ROLE_KEY
- **Key** : `SUPABASE_SERVICE_ROLE_KEY`
- **Value** : Votre clé **service_role** (pas `anon`)
  - Trouvable dans : Supabase Dashboard → Settings → API → service_role key
  - ⚠️ **C'est une clé secrète** - ne la partagez jamais !
- **Environments** : ✅ Production, ✅ Preview, ✅ Development
- Cliquez sur **Save**

#### Variable 5 : PUSH_DEFAULT_LOCALE
- **Key** : `PUSH_DEFAULT_LOCALE`
- **Value** : `pt-BR`
- **Environments** : ✅ Production, ✅ Preview, ✅ Development
- Cliquez sur **Save**

### 3.3 Redéployer avec les variables

```powershell
# Dans le dossier push-api/
vercel --prod
```

---

## ✅ ÉTAPE 4 : Mettre à jour le .env frontend

1. **Ouvrez votre fichier `.env`** (à la racine du projet)
2. **Ajoutez ou modifiez** :
```env
VITE_PUSH_API_BASE=https://musica-da-segunda-push.vercel.app/api
```
(Remplacez par l'URL que Vercel vous a donnée)

---

## ✅ ÉTAPE 5 : Tester

### Test 1 : Vérifier l'API

Ouvrez PowerShell et exécutez :

```powershell
Invoke-WebRequest -Uri "https://musica-da-segunda-push.vercel.app/api/push/send" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"title":"Test","body":"Test notification","url":"/"}'
```

**Réponse attendue** :
```json
{"ok": true, "sent": 0}
```

Si `sent: 0`, c'est normal si vous n'avez pas encore d'abonnés.

### Test 2 : Tester depuis l'interface Admin

1. Ouvrez votre site en production
2. Connectez-vous à `/admin`
3. Créez une nouvelle chanson
4. Les notifications seront envoyées automatiquement

---

## 🔍 Vérifications finales

### Checklist Supabase ✅

- [ ] Table `push_subscriptions` créée (vérifier dans SQL Editor)
- [ ] Index créés (`idx_push_topics`, `idx_push_endpoint`, `idx_push_locale`)
- [ ] RLS activé avec 3 policies
- [ ] Test d'insertion manuelle réussi

### Checklist Vercel ✅

- [ ] Projet `push-api` déployé
- [ ] 5 variables d'environnement configurées
- [ ] URL de l'API récupérée
- [ ] Test de l'endpoint `/api/push/send` réussi (status 200)
- [ ] `.env` frontend mis à jour avec `VITE_PUSH_API_BASE`

---

## 🐛 Problèmes courants

### Erreur "Table does not exist"
→ Vérifiez que le SQL a bien été exécuté dans Supabase SQL Editor

### Erreur "VAPID keys invalid"
→ Vérifiez que les clés dans Vercel sont exactement les mêmes que dans `.env`
→ Vérifiez qu'il n'y a pas d'espaces avant/après

### Erreur "Supabase connection failed"
→ Vérifiez que `SUPABASE_URL` est correct (sans `/rest/v1`)
→ Vérifiez que `SUPABASE_SERVICE_ROLE_KEY` est la clé **service_role**, pas `anon`

### Erreur 404 sur l'endpoint
→ Vérifiez que l'URL est `https://votre-projet.vercel.app/api/push/send`
→ Vérifiez que `vercel.json` est correct

---

## 📝 Notes importantes

1. **Clé Service Role** : C'est la clé **secrète** de Supabase
   - Ne jamais l'exposer côté client
   - Trouvable dans : Supabase Dashboard → Settings → API → `service_role` key

2. **URL Supabase** : Format correct
   - ✅ `https://xxxxx.supabase.co`
   - ❌ `https://xxxxx.supabase.co/rest/v1`

3. **Environnements Vercel** : Configurez les variables pour les 3 environnements
   - Production (pour le site en ligne)
   - Preview (pour les pull requests)
   - Development (pour les tests locaux)

---

**Une fois ces étapes terminées, votre système de notifications push sera opérationnel !** 🎉

