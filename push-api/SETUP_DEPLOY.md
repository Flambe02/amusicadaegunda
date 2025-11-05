# 🚀 Guide Déploiement Push API - Vercel

## Prérequis

1. **Vercel CLI installé** :
```bash
npm install -g vercel
```

2. **Compte Vercel** : https://vercel.com

---

## 📦 Déploiement

### Étape 1 : Se connecter à Vercel

```bash
cd push-api
vercel login
```

### Étape 2 : Déployer le projet

```bash
vercel
```

**Réponses aux questions** :
- `Link to existing project?` → **N** (nouveau projet)
- `Project name?` → `musica-da-segunda-push` (ou votre choix)
- `Directory?` → `./api` (ou laissez vide)
- `Override settings?` → **N**

### Étape 3 : Configurer les variables d'environnement

**Via Dashboard Vercel (recommandé)** :

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet `musica-da-segunda-push`
3. **Settings → Environment Variables**
4. Ajoutez ces variables pour **Production**, **Preview** et **Development** :

```env
VAPID_PUBLIC_KEY=BNmWY52nhsYuohsMsFuFw5-vPv20qLw6nehrF-vyzPm87xU-6cPUoJhwtAVxj_18TcREBqx2uLdr5dcl57gVVNw
VAPID_PRIVATE_KEY=VOTRE_CLE_PRIVEE_VAPID
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
PUSH_DEFAULT_LOCALE=pt-BR
```

**⚠️ IMPORTANT** :
- `SUPABASE_URL` : Sans `/rest/v1` à la fin
- `SUPABASE_SERVICE_ROLE_KEY` : Clé **service_role** (pas `anon`), trouvable dans Supabase Dashboard → Settings → API

### Étape 4 : Redéployer avec les variables

```bash
vercel --prod
```

### Étape 5 : Récupérer l'URL de l'API

Après le déploiement, Vercel affichera :
```
✅ Production: https://musica-da-segunda-push.vercel.app
```

**Copiez cette URL** et mettez à jour votre `.env` frontend :
```env
VITE_PUSH_API_BASE=https://musica-da-segunda-push.vercel.app/api
```

---

## 🧪 Test de l'API

### Test 1 : Vérifier que l'endpoint répond

```bash
curl https://musica-da-segunda-push.vercel.app/api/push/send \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","body":"Test notification","url":"/"}'
```

**Réponse attendue** :
```json
{"ok": true, "sent": 0}
```

### Test 2 : Vérifier les logs

1. Dashboard Vercel → Votre projet → **Functions**
2. Cliquez sur `/api/push/send`
3. Vérifiez les logs pour les erreurs

---

## 🔄 Mises à jour futures

Pour redéployer après modifications :
```bash
cd push-api
vercel --prod
```

---

## 📝 Checklist

- [ ] Vercel CLI installé
- [ ] Projet déployé sur Vercel
- [ ] Variables d'environnement configurées
- [ ] Test de l'endpoint réussi
- [ ] `.env` frontend mis à jour avec `VITE_PUSH_API_BASE`

