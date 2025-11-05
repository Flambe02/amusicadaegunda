# ✅ Guide Final - Push Notifications avec Supabase

## 🎯 Résumé de votre infrastructure

- **Frontend** : GitHub Pages (déployé automatiquement)
- **Backend** : Supabase Edge Functions
- **URL API** : `https://efnzmpzkzeuktqkghwfa.functions.supabase.co`
- **Base de données** : Supabase PostgreSQL

---

## 📋 ÉTAPE 1 : Corriger la table Supabase

### 1.1 Exécuter le script de correction

1. **Ouvrez Supabase Dashboard** → SQL Editor
2. **Ouvrez le fichier** `FINAL_PUSH_SETUP.sql`
3. **Copiez-collez tout le contenu**
4. **Cliquez sur "Run"**

Ce script va :
- ✅ Ajouter la colonne `locale` manquante
- ✅ Ajouter la colonne `last_seen_at` si nécessaire
- ✅ Créer les index manquants
- ✅ Nettoyer les policies en double

### 1.2 Vérifier que c'est corrigé

Exécutez `VERIFY_PUSH_TABLE.sql` pour vérifier :
- La colonne `locale` existe
- Les index sont créés
- Les policies sont correctes

---

## 📋 ÉTAPE 2 : Vérifier/Déployer Supabase Edge Function

### 2.1 Vérifier que la fonction existe localement

```powershell
# Vérifier que le fichier existe
Test-Path "supabase\functions\push\index.ts"
```

### 2.2 Installer Supabase CLI (si pas déjà fait)

```powershell
npm install -g supabase
```

### 2.3 Se connecter et lier le projet

```powershell
# Se connecter
supabase login

# Lier votre projet (project-ref = efnzmpzkzeuktqkghwfa)
supabase link --project-ref efnzmpzkzeuktqkghwfa
```

### 2.4 Configurer les secrets

```powershell
# URL Supabase
supabase secrets set SUPABASE_URL=https://efnzmpzkzeuktqkghwfa.supabase.co

# Clé service role (trouvable dans Supabase Dashboard → Settings → API)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key

# Origine autorisée
supabase secrets set ALLOWED_ORIGIN=https://www.amusicadasegunda.com

# Clés VAPID (les mêmes que dans votre .env)
supabase secrets set VAPID_PUBLIC_KEY=BNmWY52nhsYuohsMsFuFw5-vPv20qLw6nehrF-vyzPm87xU-6cPUoJhwtAVxj_18TcREBqx2uLdr5dcl57gVVNw
supabase secrets set VAPID_PRIVATE_KEY=votre_cle_privee_vapid

# Locale par défaut
supabase secrets set PUSH_DEFAULT_LOCALE=pt-BR
```

### 2.5 Déployer la fonction

```powershell
supabase functions deploy push --no-verify-jwt
```

### 2.6 Tester l'endpoint

```powershell
Invoke-WebRequest -Uri "https://efnzmpzkzeuktqkghwfa.functions.supabase.co/push/send" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"topic":"new-song","locale":"pt-BR","url":"/playlist"}'
```

**Réponse attendue** :
```json
{"ok": true, "note": "sender-node handles delivery", "params": {...}}
```

---

## ✅ Checklist finale

### Table Supabase ✅
- [ ] Colonne `locale` ajoutée
- [ ] Colonne `last_seen_at` ajoutée
- [ ] Index créés (`idx_push_topics`, `idx_push_endpoint`, `idx_push_locale`)
- [ ] Policies RLS nettoyées (pas de doublons)

### Supabase Edge Functions ✅
- [ ] Supabase CLI installé
- [ ] Projet lié (`efnzmpzkzeuktqkghwfa`)
- [ ] 6 secrets configurés
- [ ] Fonction `push` déployée
- [ ] Test de l'endpoint réussi

### Frontend ✅
- [ ] `.env` contient `VITE_PUSH_API_BASE=https://efnzmpzkzeuktqkghwfa.functions.supabase.co`
- [ ] Composant `PushCTA` intégré dans `App.jsx`
- [ ] `Admin.jsx` envoie les notifications lors de la création

---

## 🧪 Test complet

1. **Ouvrez votre site en production**
2. **Installez la PWA sur mobile**
3. **Attendez 3 secondes** → le CTA PushCTA devrait apparaître
4. **Cliquez sur "Activer les notifications"**
5. **Autorisez les notifications**
6. **Vérifiez dans Supabase** : `SELECT * FROM push_subscriptions;`
7. **Créez une nouvelle chanson dans `/admin`**
8. **Vous devriez recevoir une notification !** 🎉

---

## 🐛 Dépannage

### Erreur "column locale does not exist"
→ Exécutez `FINAL_PUSH_SETUP.sql`

### Erreur "Function not found"
→ Vérifiez que la fonction est déployée : `supabase functions list`

### Erreur "Missing secrets"
→ Vérifiez que tous les secrets sont configurés : `supabase secrets list`

---

**Tout est prêt ! Une fois ces étapes terminées, votre système de notifications push sera opérationnel.** 🎉

