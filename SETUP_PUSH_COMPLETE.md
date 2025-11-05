# 🚀 Guide Complet - Configuration Push Notifications

## 📋 Points 2 & 3 : Déploiement API + Table Supabase

---

## ✅ POINT 3 : Créer la table Supabase

### Étape 1 : Exécuter la migration SQL

1. **Ouvrez votre dashboard Supabase** : https://supabase.com/dashboard
2. **Allez dans SQL Editor**
3. **Copiez-collez ce SQL** :

```sql
-- Migration: Créer la table push_subscriptions
-- Compatible avec push-api/lib/db.js

-- Activer l'extension pour UUID (si pas déjà fait)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Créer la table push_subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT ARRAY['new-song']::TEXT[],
  locale TEXT DEFAULT 'pt-BR',
  vapid_key_version TEXT DEFAULT 'v1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_push_topics ON push_subscriptions USING GIN (topics);
CREATE INDEX IF NOT EXISTS idx_push_endpoint ON push_subscriptions (endpoint);
CREATE INDEX IF NOT EXISTS idx_push_locale ON push_subscriptions (locale);

-- RLS (Row Level Security) - Permettre l'insertion publique
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Allow public insert" ON push_subscriptions;
DROP POLICY IF EXISTS "Allow service role read" ON push_subscriptions;
DROP POLICY IF EXISTS "Allow public read" ON push_subscriptions;

-- Policy pour permettre l'insertion publique (pour les abonnements)
CREATE POLICY "Allow public insert" ON push_subscriptions
  FOR INSERT
  WITH CHECK (true);

-- Policy pour permettre la lecture par le service role (pour l'API)
CREATE POLICY "Allow service role read" ON push_subscriptions
  FOR SELECT
  USING (true);

-- Policy pour permettre la suppression publique (pour le désabonnement)
CREATE POLICY "Allow public delete" ON push_subscriptions
  FOR DELETE
  USING (true);

-- Commentaires pour documentation
COMMENT ON TABLE push_subscriptions IS 'Web Push notification subscriptions for Música da Segunda PWA';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Unique push service endpoint URL';
COMMENT ON COLUMN push_subscriptions.p256dh IS 'ECDH public key for encryption';
COMMENT ON COLUMN push_subscriptions.auth IS 'Authentication secret for push service';
COMMENT ON COLUMN push_subscriptions.topics IS 'Array of topics this subscription is interested in';
COMMENT ON COLUMN push_subscriptions.locale IS 'User locale preference (pt-BR, fr, en)';
COMMENT ON COLUMN push_subscriptions.vapid_key_version IS 'VAPID key version for rotation support';
```

4. **Exécutez le SQL** (bouton "Run")

### Étape 2 : Vérifier que la table existe

```sql
-- Vérifier la structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'push_subscriptions'
ORDER BY ordinal_position;

-- Vérifier les policies RLS
SELECT * FROM pg_policies WHERE tablename = 'push_subscriptions';
```

---

## ✅ POINT 2 : Déployer l'API Push sur Vercel

### Étape 1 : Préparer le projet

1. **Vérifiez que vous êtes dans le dossier `push-api/`** :
```bash
cd push-api
```

2. **Vérifiez que `package.json` existe** avec les dépendances :
```json
{
  "name": "push-api",
  "private": true,
  "type": "module",
  "dependencies": {
    "@supabase/supabase-js": "^2.45.4",
    "web-push": "^3.6.7"
  }
}
```

3. **Vérifiez que `vercel.json` existe** (créer si nécessaire) :

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/push/(.*)",
      "dest": "/api/push/$1"
    }
  ]
}
```

### Étape 2 : Installer Vercel CLI (si pas déjà fait)

```bash
npm install -g vercel
```

### Étape 3 : Se connecter à Vercel

```bash
vercel login
```

### Étape 4 : Déployer le projet

```bash
# Dans le dossier push-api/
cd push-api
vercel

# Suivez les instructions :
# - Link to existing project? (N pour créer un nouveau projet)
# - Project name: musica-da-segunda-push (ou votre nom)
# - Directory: ./api
```

### Étape 5 : Configurer les variables d'environnement

**Option A : Via Vercel Dashboard (recommandé)**

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet `musica-da-segunda-push`
3. Allez dans **Settings → Environment Variables**
4. Ajoutez ces variables :

```env
# Clés VAPID (les mêmes que dans votre .env frontend)
VAPID_PUBLIC_KEY=BNmWY52nhsYuohsMsFuFw5-vPv20qLw6nehrF-vyzPm87xU-6cPUoJhwtAVxj_18TcREBqx2uLdr5dcl57gVVNw
VAPID_PRIVATE_KEY=VOTRE_CLE_PRIVEE_VAPID

# Supabase (pour récupérer les abonnements)
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key_secrete

# Email de contact VAPID (requis)
PUSH_DEFAULT_LOCALE=pt-BR
```

**Option B : Via CLI**

```bash
# Dans le dossier push-api/
vercel env add VAPID_PUBLIC_KEY
# Collez la clé publique quand demandé

vercel env add VAPID_PRIVATE_KEY
# Collez la clé privée quand demandé

vercel env add SUPABASE_URL
# Collez l'URL Supabase

vercel env add SUPABASE_SERVICE_ROLE_KEY
# Collez la clé service role

vercel env add PUSH_DEFAULT_LOCALE
# Tapez: pt-BR
```

### Étape 6 : Redéployer avec les variables

```bash
vercel --prod
```

### Étape 7 : Récupérer l'URL de l'API

Après le déploiement, Vercel vous donnera une URL du type :
```
https://musica-da-segunda-push.vercel.app
```

**Mettez à jour votre `.env` frontend** :
```env
VITE_PUSH_API_BASE=https://musica-da-segunda-push.vercel.app/api
```

---

## 🧪 Tester le déploiement

### Test 1 : Vérifier que l'API répond

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
(Si `sent: 0`, c'est normal si vous n'avez pas encore d'abonnés)

### Test 2 : Vérifier les logs Vercel

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet
3. Cliquez sur **Functions** ou **Logs**
4. Vérifiez qu'il n'y a pas d'erreurs

---

## 🔍 Vérifications finales

### Checklist Supabase ✅

- [ ] Table `push_subscriptions` créée
- [ ] Index créés (`idx_push_topics`, `idx_push_endpoint`, `idx_push_locale`)
- [ ] RLS activé avec policies correctes
- [ ] Test d'insertion manuelle réussi

### Checklist Vercel ✅

- [ ] Projet `push-api` déployé
- [ ] Variables d'environnement configurées
- [ ] URL de l'API récupérée
- [ ] Test de l'endpoint `/api/push/send` réussi
- [ ] `.env` frontend mis à jour avec `VITE_PUSH_API_BASE`

---

## 🐛 Dépannage

### Erreur "Table push_subscriptions does not exist"
- Vérifiez que le SQL a été exécuté dans Supabase
- Vérifiez que vous êtes sur le bon projet Supabase

### Erreur "VAPID keys are invalid"
- Vérifiez que les clés dans Vercel sont exactement les mêmes que dans `.env`
- Vérifiez qu'il n'y a pas d'espaces avant/après les clés

### Erreur "Supabase connection failed"
- Vérifiez que `SUPABASE_URL` est correct (sans `/rest/v1`)
- Vérifiez que `SUPABASE_SERVICE_ROLE_KEY` est la clé **service_role**, pas `anon`

### Erreur 404 sur l'endpoint
- Vérifiez que l'URL est `https://votre-projet.vercel.app/api/push/send`
- Vérifiez que `vercel.json` est correctement configuré

---

## 📝 Notes importantes

1. **Clé Service Role** : C'est la clé **secrète** de Supabase, jamais exposée côté client
   - Trouvable dans : Supabase Dashboard → Settings → API → `service_role` key

2. **URL Supabase** : Utilisez l'URL complète sans `/rest/v1`
   - Format : `https://xxxxx.supabase.co`

3. **Environnements Vercel** : Configurez les variables pour **Production**, **Preview** et **Development**

---

**Une fois ces étapes terminées, votre système de notifications push sera opérationnel !** 🎉

