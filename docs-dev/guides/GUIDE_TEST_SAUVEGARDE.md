# 🧪 Guide de Test - Sauvegarde de Chanson

## ✅ Vérifications Préalables

Avant de tester, assurez-vous que :

1. ✅ Le script `verify_and_fix_rls.sql` a été exécuté avec succès
2. ✅ La policy `songs_admin_full_access` affiche "✅ Policy correcte - INSERT/UPDATE fonctionnent"
3. ✅ Votre utilisateur apparaît dans la liste des admins (section "ADMINS CONFIGURÉS")
4. ✅ Vous êtes connecté à l'interface admin (`/admin`)

## 🧪 Test de Sauvegarde

### Étape 1 : Ouvrir la Console du Navigateur

1. Ouvrez l'interface admin (`http://localhost:3000/admin` ou votre URL de production)
2. Ouvrez les **Outils de développement** (F12)
3. Allez dans l'onglet **Console**
4. Gardez la console ouverte pour voir les messages de diagnostic

### Étape 2 : Créer une Nouvelle Chanson

1. Cliquez sur le bouton **"Nouvelle chanson"** ou **"Criar nova música"**
2. Remplissez le formulaire avec des données de test :
   - **Titre** : `Test Sauvegarde` (obligatoire)
   - **Artiste** : `A Música da Segunda` (par défaut)
   - **Date de lancement** : Sélectionnez une date (obligatoire)
   - **Description** : `Ceci est un test de sauvegarde`
   - Les autres champs sont optionnels

3. Cliquez sur **"Sauvegarder"** ou **"Salvar"**

### Étape 3 : Observer les Messages dans la Console

Vous devriez voir une séquence de messages comme :

```
🔍 Checking admin status for user: [votre-user-id]
📊 Admin check result: { data: {...}, error: null, hasData: true }
✅ User IS admin
✅ Vérification admin OK, insertion de la chanson...
✅ Création réussie: { id: ..., title: "Test Sauvegarde", ... }
✅ Música criada com sucesso!
```

### Étape 4 : Vérifier le Résultat

**Si la sauvegarde réussit :**
- ✅ Un message de succès apparaît : "✅ Música criada com sucesso!"
- ✅ La chanson apparaît dans la liste des chansons
- ✅ Le formulaire se ferme automatiquement
- ✅ Aucune erreur dans la console

**Si la sauvegarde échoue :**
- ❌ Un message d'erreur apparaît avec des détails
- ❌ La chanson n'apparaît pas dans la liste
- ❌ Des erreurs apparaissent dans la console

## 🔍 Diagnostic des Erreurs

### Erreur : "NOT_AUTHENTICATED"

**Message :** "❌ Vous devez être connecté pour créer une chanson"

**Solution :**
1. Déconnectez-vous et reconnectez-vous
2. Vérifiez que votre session est active dans Supabase

### Erreur : "NOT_ADMIN"

**Message :** "❌ Vous n'avez pas les droits administrateur"

**Solution :**
1. Vérifiez que votre `user_id` est dans la table `admins`
2. Exécutez dans Supabase SQL Editor :
```sql
-- Remplacer YOUR_USER_ID par votre UUID
INSERT INTO public.admins (user_id)
VALUES ('YOUR_USER_ID')
ON CONFLICT (user_id) DO NOTHING;
```

### Erreur : "PERMISSION_DENIED"

**Message :** "❌ Erreur de permission RLS"

**Solution :**
1. Vérifiez que la policy `songs_admin_full_access` a bien une clause `WITH CHECK`
2. Réexécutez le script `verify_and_fix_rls.sql`
3. Vérifiez les logs Supabase Dashboard pour plus de détails

### Erreur : "TIMEOUT"

**Message :** "TIMEOUT: Admin check took too long"

**Solution :**
1. Vérifiez votre connexion internet
2. Vérifiez que Supabase est accessible
3. Vérifiez les logs Supabase Dashboard

### Erreur : "DUPLICATE_YOUTUBE_URL" ou "DUPLICATE_TIKTOK_ID"

**Message :** "Une chanson avec cette URL/ID existe déjà"

**Solution :**
- C'est normal si vous testez avec une URL/ID déjà utilisée
- Utilisez une URL/ID différente ou modifiez la chanson existante

## 📋 Checklist de Vérification

Après le test, vérifiez :

- [ ] La chanson apparaît dans la liste des chansons
- [ ] La chanson a un ID unique
- [ ] Les données sont correctement sauvegardées (titre, date, etc.)
- [ ] Aucune erreur dans la console
- [ ] Le message de succès s'affiche
- [ ] Le formulaire se ferme automatiquement

## 🎯 Test de Mise à Jour

Pour tester la mise à jour :

1. Cliquez sur une chanson existante dans la liste
2. Modifiez le titre ou un autre champ
3. Cliquez sur **"Sauvegarder"**
4. Vérifiez que les modifications sont bien enregistrées

## 🐛 En Cas de Problème

Si la sauvegarde échoue :

1. **Copiez tous les messages de la console** (surtout ceux qui commencent par ❌)
2. **Vérifiez les logs Supabase** :
   - Allez dans Supabase Dashboard > **Logs** > **Postgres Logs**
   - Cherchez les erreurs récentes
3. **Vérifiez les RLS policies** :
   - Exécutez à nouveau `verify_and_fix_rls.sql`
   - Vérifiez que toutes les étapes affichent ✅

## 📞 Informations à Fournir en Cas de Problème

Si vous avez besoin d'aide, fournissez :

1. Le message d'erreur exact (copié depuis la console)
2. Les logs de la console (tous les messages avec ❌)
3. Le résultat de l'exécution de `verify_and_fix_rls.sql`
4. Votre `user_id` (visible dans Supabase Auth > Users)

