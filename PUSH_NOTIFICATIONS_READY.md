# ✅ Push Notifications - Configuration Complète

## 🎉 État : PRÊT POUR LES TESTS

### ✅ Base de données Supabase
- ✅ Table `push_subscriptions` créée
- ✅ **13 colonnes** : `id`, `endpoint`, `p256dh`, `auth`, `user_agent`, `created_at`, `updated_at`, `active`, `last_used`, `topics`, **`locale`**, **`last_seen_at`**, `vapid_key_version`
- ✅ **5 policies RLS** correctes et propres
- ✅ Index créés

### ✅ Frontend
- ✅ `PushCTA.jsx` composant créé et intégré
- ✅ `push.js` utilise Supabase directement (`upsertPushSubscription`)
- ✅ `Admin.jsx` envoie les notifications lors de la création de chanson
- ✅ Service Worker configuré dans `sw.js`

### ✅ Supabase Edge Function
- ✅ Code source dans `supabase/functions/push/index.ts`
- ⚠️ **À vérifier** : Fonction déployée sur Supabase

---

## 🧪 Test immédiat (sans déployer la fonction)

### Test 1 : Abonnement utilisateur
1. Ouvrez votre site en production sur mobile
2. Installez la PWA (Add to Home Screen)
3. Attendez 3 secondes → Le CTA PushCTA apparaît
4. Cliquez sur "Activer les notifications"
5. Autorisez les notifications
6. **Vérifiez dans Supabase** :
```sql
SELECT endpoint, locale, topics, created_at 
FROM push_subscriptions 
ORDER BY created_at DESC 
LIMIT 5;
```
**Vous devriez voir votre abonnement !** ✅

### Test 2 : Envoi de notification (nécessite la fonction)
1. Créez une nouvelle chanson dans `/admin`
2. Le système devrait envoyer une notification automatiquement
3. **Si ça ne fonctionne pas** → Il faut déployer la Supabase Edge Function

---

## 🚀 Déployer la Supabase Edge Function (si nécessaire)

### Option 1 : Via Supabase CLI (recommandé)

```powershell
# 1. Installer Supabase CLI (si pas déjà fait)
npm install -g supabase

# 2. Se connecter
supabase login

# 3. Lier le projet (project-ref = efnzmpzkzeuktqkghwfa)
supabase link --project-ref efnzmpzkzeuktqkghwfa

# 4. Configurer les secrets
supabase secrets set SUPABASE_URL=https://efnzmpzkzeuktqkghwfa.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
supabase secrets set ALLOWED_ORIGIN=https://www.amusicadasegunda.com
supabase secrets set VAPID_PUBLIC_KEY=BNmWY52nhsYuohsMsFuFw5-vPv20qLw6nehrF-vyzPm87xU-6cPUoJhwtAVxj_18TcREBqx2uLdr5dcl57gVVNw
supabase secrets set VAPID_PRIVATE_KEY=votre_cle_privee_vapid
supabase secrets set PUSH_DEFAULT_LOCALE=pt-BR

# 5. Déployer
supabase functions deploy push --no-verify-jwt
```

### Option 2 : Via Supabase Dashboard
1. Ouvrez Supabase Dashboard → Edge Functions
2. Créez une nouvelle fonction "push"
3. Copiez-collez le contenu de `supabase/functions/push/index.ts`
4. Configurez les secrets dans Settings → Edge Functions → Secrets

---

## 📊 Configuration actuelle

### Variables d'environnement (frontend)
- `VITE_VAPID_PUBLIC_KEY` : `BNmWY52nhsYuohsMsFuFw5-vPv20qLw6nehrF-vyzPm87xU-6cPUoJhwtAVxj_18TcREBqx2uLdr5dcl57gVVNw`
- `VITE_PUSH_API_BASE` : `https://musica-da-segunda-push.vercel.app` (fallback)
- `VITE_VAPID_KEY_VERSION` : `v1`

### URL API Supabase
- Base URL : `https://efnzmpzkzeuktqkghwfa.functions.supabase.co`
- Endpoint : `/push/send`

---

## ✅ Checklist finale

- [x] Table Supabase créée avec colonne `locale` ✅
- [x] Policies RLS correctes (5 policies) ✅
- [x] Frontend configuré ✅
- [x] Composant PushCTA intégré ✅
- [x] Admin.jsx envoie les notifications ✅
- [ ] Supabase Edge Function déployée (à vérifier)
- [ ] Test d'abonnement réussi (à tester)
- [ ] Test d'envoi de notification réussi (à tester)

---

## 🎯 Prochaines actions

1. **Tester l'abonnement** (peut être fait maintenant, sans fonction)
2. **Vérifier/Déployer la fonction Supabase** (si nécessaire)
3. **Tester l'envoi complet** (créer une chanson et recevoir la notification)

---

**Tout est prêt ! Vous pouvez commencer les tests d'abonnement immédiatement.** 🎉

