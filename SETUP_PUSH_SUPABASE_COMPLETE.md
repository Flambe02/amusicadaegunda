# 🚀 Guide Complet - Push Notifications avec Supabase Edge Functions

## ✅ Vous utilisez Supabase Edge Functions (pas Vercel)

Votre URL API est : `https://efnzmpzkzeuktqkghwfa.functions.supabase.co`

---

## 📋 POINT 3 : Corriger la table Supabase

### Étape 1 : Exécuter le script de correction

1. **Ouvrez Supabase Dashboard** → SQL Editor
2. **Ouvrez le fichier** `FIX_PUSH_TABLE.sql`
3. **Copiez tout le contenu** et collez-le dans l'éditeur SQL
4. **Cliquez sur "Run"**

Ce script va :
- ✅ Ajouter la colonne `locale` manquante
- ✅ Ajouter la colonne `last_seen_at` si nécessaire
- ✅ Créer les index manquants
- ✅ Configurer les policies RLS

### Étape 2 : Vérifier que c'est corrigé

Exécutez dans SQL Editor :

```sql
-- Vérifier la structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'push_subscriptions'
ORDER BY ordinal_position;
```

**Vous devriez voir au moins 9 colonnes** :
- id
- endpoint
- p256dh
- auth
- topics
- **locale** ← Cette colonne doit maintenant exister
- vapid_key_version
- created_at
- last_seen_at

---

## 📋 POINT 2 : Configurer Supabase Edge Functions

### Étape 1 : Vérifier que la fonction existe

La fonction devrait déjà être dans `supabase/functions/push/`

### Étape 2 : Configurer les secrets Supabase

1. **Installez Supabase CLI** (si pas déjà fait) :
```powershell
npm install -g supabase
```

2. **Connectez-vous** :
```powershell
supabase login
```

3. **Liez votre projet** :
```powershell
supabase link --project-ref efnzmpzkzeuktqkghwfa
```

4. **Configurez les secrets** :
```powershell
# URL Supabase (votre projet)
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

### Étape 3 : Déployer la fonction

```powershell
supabase functions deploy push --no-verify-jwt
```

### Étape 4 : Vérifier le déploiement

```powershell
# Tester l'endpoint
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

## ✅ Vérifications finales

### Checklist Supabase ✅

- [ ] Table `push_subscriptions` corrigée (colonne `locale` ajoutée)
- [ ] Index créés (`idx_push_topics`, `idx_push_endpoint`, `idx_push_locale`)
- [ ] RLS activé avec 3 policies
- [ ] Test d'insertion manuelle réussi

### Checklist Supabase Edge Functions ✅

- [ ] Supabase CLI installé et connecté
- [ ] Secrets configurés (6 secrets)
- [ ] Fonction `push` déployée
- [ ] Test de l'endpoint `/push/send` réussi
- [ ] `.env` frontend contient `VITE_PUSH_API_BASE=https://efnzmpzkzeuktqkghwfa.functions.supabase.co`

---

## 🐛 Dépannage

### Erreur "column locale does not exist"
→ **Solution** : Exécutez `FIX_PUSH_TABLE.sql` dans Supabase SQL Editor

### Erreur "Function not found"
→ Vérifiez que la fonction est déployée : `supabase functions list`

### Erreur "Missing secrets"
→ Vérifiez que tous les secrets sont configurés : `supabase secrets list`

---

## 📝 Notes importantes

1. **Votre infrastructure** : GitHub Pages (frontend) + Supabase Edge Functions (backend)
2. **URL API** : `https://efnzmpzkzeuktqkghwfa.functions.supabase.co`
3. **Clé Service Role** : Trouvable dans Supabase Dashboard → Settings → API → `service_role` key

---

**Une fois ces étapes terminées, votre système de notifications push sera opérationnel !** 🎉

