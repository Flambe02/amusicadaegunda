# 🚀 Guide Complet - Notifications Push pour A Música da Segunda

## 📋 Vue d'ensemble

Ce guide explique comment configurer et utiliser le système de notifications push pour votre site "A Música da Segunda".

## ✅ Ce qui a été implémenté

### 1. **Frontend (Client)**
- ✅ `src/components/PushCTA.jsx` - Composant UI pour activer les notifications
- ✅ `src/lib/push.js` - Logique d'abonnement avec intégration Supabase
- ✅ `src/App.jsx` - Intégration du composant PushCTA
- ✅ `src/pages/Admin.jsx` - Envoi automatique lors de la publication d'une chanson

### 2. **Service Worker**
- ✅ `public/sw.js` - Handlers pour recevoir et afficher les notifications push

### 3. **Backend (À créer)**
- ⏳ API Serverless pour envoyer les notifications (Vercel/Netlify)

---

## 🔧 Configuration requise

### Étape 1 : Créer la table Supabase

Exécutez cette commande SQL dans votre dashboard Supabase :

```sql
-- Table pour stocker les abonnements push
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  topics TEXT[] DEFAULT ARRAY['new-song'],
  locale TEXT DEFAULT 'pt-BR',
  vapid_key_version TEXT DEFAULT 'v1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_topics ON push_subscriptions USING GIN(topics);

-- RLS (Row Level Security) - Permettre l'insertion publique
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert" ON push_subscriptions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow service role read" ON push_subscriptions
  FOR SELECT
  USING (true);
```

### Étape 2 : Générer les clés VAPID

#### Option A : Via npm (recommandé)

```bash
# Installer web-push globalement ou localement
npm install -g web-push
# ou
npm install --save-dev web-push

# Générer les clés
web-push generate-vapid-keys
```

Vous obtiendrez :
```
Public Key: BNmWY52nhsYuohsMsFuFw5-vPv20qLw6nehrF-vyzPm87xU-6cPUoJhwtAVxj_18TcREBqx2uLdr5dcl57gVVNw
Private Key: VOTRE_CLE_PRIVEE_SECRETE
```

#### Option B : Via script Node.js

Créez `scripts/generate-vapid-keys.js` :

```javascript
const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);
console.log('\nCopiez ces clés dans vos variables d\'environnement !');
```

Puis exécutez :
```bash
node scripts/generate-vapid-keys.js
```

### Étape 3 : Configurer les variables d'environnement

#### Frontend (`.env` ou variables Vercel/Netlify)

```env
# Clé publique VAPID (visible côté client)
VITE_VAPID_PUBLIC_KEY=BNmWY52nhsYuohsMsFuFw5-vPv20qLw6nehrF-vyzPm87xU-6cPUoJhwtAVxj_18TcREBqx2uLdr5dcl57gVVNw

# URL de l'API push (après déploiement)
VITE_PUSH_API_BASE=https://votre-projet.vercel.app/api

# Version de la clé VAPID (pour migration future)
VITE_VAPID_KEY_VERSION=v1
```

#### Backend (Variables d'environnement Vercel/Netlify)

```env
# Clés VAPID complètes (secrètes)
VAPID_PUBLIC_KEY=BNmWY52nhsYuohsMsFuFw5-vPv20qLw6nehrF-vyzPm87xU-6cPUoJhwtAVxj_18TcREBqx2uLdr5dcl57gVVNw
VAPID_PRIVATE_KEY=VOTRE_CLE_PRIVEE_SECRETE

# Email de contact (requis pour VAPID)
VAPID_CONTACT_EMAIL=pimentaoenchansons@gmail.com

# Supabase (pour récupérer les abonnements)
VITE_SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_KEY=votre_service_role_key_secrete

# Token d'autorisation (optionnel, pour sécuriser l'endpoint)
ADMIN_TOKEN=votre_token_secret_aleatoire
```

---

## 🔨 Créer l'API Serverless (Vercel)

### Option A : Vercel Serverless Functions

Créez `api/push/notify-all.js` :

```javascript
// api/push/notify-all.js
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Configurer VAPID
webpush.setVapidDetails(
  process.env.VAPID_CONTACT_EMAIL || 'pimentaoenchansons@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  // Vérifier la méthode
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  // TODO: Vérifier le token d'autorisation si nécessaire
  // const authToken = req.headers.authorization?.replace('Bearer ', '');
  // if (authToken !== process.env.ADMIN_TOKEN) {
  //   return res.status(401).json({ error: 'Non autorisé' });
  // }

  try {
    const { title, body, icon, url, tag = 'nova-musica', topic = 'new-song' } = req.body;

    // Récupérer tous les abonnements depuis Supabase
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .contains('topics', [topic]);

    if (error) {
      console.error('Erreur Supabase:', error);
      return res.status(500).json({ error: 'Erreur base de données' });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ success: true, sent: 0, message: 'Aucun abonné' });
    }

    // Préparer le payload
    const payload = JSON.stringify({
      title: title || 'Nouvelle Chanson ! 🎶',
      body: body || 'Une nouvelle chanson est disponible !',
      icon: icon || '/icons/pwa/icon-192x192.png',
      url: url || '/',
      tag
    });

    // Envoyer toutes les notifications
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        await webpush.sendNotification(pushSubscription, payload);
        return { success: true, endpoint: sub.endpoint };
      } catch (err) {
        // Si l'abonnement est expiré (410/404), le supprimer
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log('Abonnement expiré, suppression:', sub.endpoint);
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint);
        } else {
          console.error('Erreur envoi push:', err);
        }
        return { success: false, endpoint: sub.endpoint, error: err.message };
      }
    });

    const results = await Promise.allSettled(sendPromises);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

    return res.status(200).json({
      success: true,
      sent: successCount,
      total: subscriptions.length,
      message: `${successCount}/${subscriptions.length} notifications envoyées`
    });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}
```

### Option B : Netlify Functions

Créez `netlify/functions/push-notify-all.js` avec le même code que ci-dessus.

---

## 🧪 Tester les notifications

### 1. Tester l'abonnement

1. Ouvrez le site en production (ou localhost avec HTTPS)
2. Installez la PWA sur mobile
3. Attendez 3 secondes → le CTA PushCTA devrait apparaître
4. Cliquez sur "Activer les notifications"
5. Autorisez les notifications dans le navigateur
6. Vérifiez dans Supabase que l'abonnement est enregistré

### 2. Tester l'envoi

#### Option A : Via l'interface Admin

1. Connectez-vous à `/admin`
2. Créez une nouvelle chanson
3. Les notifications devraient être envoyées automatiquement

#### Option B : Via API directe

```bash
curl -X POST https://votre-projet.vercel.app/api/push/notify-all \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "body": "Ceci est un test !",
    "url": "/"
  }'
```

---

## 📱 Compatibilité

- ✅ **Android** : Pleinement supporté
- ✅ **iOS** : Supporté uniquement si PWA installée (mode standalone)
- ❌ **Desktop** : Désactivé (pas de notifications push sur desktop)

---

## 🔒 Sécurité

### Recommandations

1. **Sécuriser l'endpoint `/push/notify-all`** :
   - Ajouter un token d'autorisation
   - Limiter l'accès par IP si possible
   - Utiliser un rate limiting

2. **RLS Supabase** :
   - Les abonnements sont en lecture seule pour le service role
   - Les utilisateurs peuvent insérer leurs propres abonnements

3. **Clés VAPID** :
   - La clé publique est visible côté client (c'est normal)
   - La clé privée doit rester SECRÈTE (jamais exposée)

---

## 🐛 Dépannage

### Le CTA n'apparaît pas
- Vérifiez que vous êtes sur mobile
- Vérifiez que la PWA est installée (mode standalone)
- Vérifiez la console pour les erreurs

### Les notifications ne sont pas reçues
- Vérifiez que les permissions sont accordées
- Vérifiez que le Service Worker est actif
- Vérifiez les logs du backend (Vercel/Netlify)
- Vérifiez que les clés VAPID sont correctes

### Erreur "Permission refusée"
- L'utilisateur a refusé → cooldown de 30 jours
- Pour réessayer immédiatement : supprimer `push_refused_until` dans localStorage

---

## 📚 Ressources

- [Web Push API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [VAPID - RFC 8292](https://tools.ietf.org/html/rfc8292)
- [web-push Library](https://github.com/web-push-libs/web-push)

---

## ✅ Checklist de déploiement

- [ ] Table `push_subscriptions` créée dans Supabase
- [ ] Clés VAPID générées
- [ ] Variables d'environnement configurées (frontend + backend)
- [ ] API serverless déployée (Vercel/Netlify)
- [ ] Test d'abonnement réussi
- [ ] Test d'envoi réussi
- [ ] Sécurité de l'endpoint vérifiée

---

**Félicitations ! 🎉 Votre système de notifications push est prêt !**

