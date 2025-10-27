# 🔑 Solution - Réinitialisation du Mot de Passe Admin

## ❌ Problème

Erreur: `Email link is invalid or has expired`

**Cause**: Le lien de réinitialisation a expiré ou est invalide.

---

## ✅ Solutions

### **Solution 1 : Via Supabase Dashboard (Recommandé)**

1. **Accédez au dashboard Supabase**:
   - https://supabase.com/dashboard
   - Sélectionnez votre projet

2. **Allez dans Authentication > Users**
   - Recherchez `florent.lambert@gmail.com`

3. **Actions disponibles**:
   - **A)** Cliquez sur "Send magic link" (envoie un nouveau lien)
   - **B)** Cliquez sur "Reset Password" (génère un nouveau lien de réinitialisation)
   - **C)** Utilisez le script `reset-password-admin.js` dans la console

4. **Vérifiez votre email**:
   - Le nouveau lien arrive dans quelques minutes
   - Cliquez dessus
   - Définissez un nouveau mot de passe

---

### **Solution 2 : Via le Formulaire de Réinitialisation**

1. **Allez sur**: http://localhost:3000/#/login

2. **Cliquez sur "Réinitialiser"**

3. **Entrez votre email**: `florent.lambert@gmail.com`

4. **Vérifiez votre email**:
   - Un nouveau lien sera envoyé
   - Le lien est valide pendant 1 heure

---

### **Solution 3 : Créer un Nouveau Mot de Passe Directement**

Si vous avez accès à Supabase SQL Editor:

```sql
-- Option 1: Changer le mot de passe via SQL (nécessite l'extension auth)
-- ⚠️ Déconseillé car le mot de passe doit être hashé

-- Option 2: Utiliser la fonction Supabase
-- Dans Supabase SQL Editor:
SELECT auth.uid(); -- Pour obtenir votre user ID

-- Puis utilisez la fonction admin pour réinitialiser
-- Via Supabase Dashboard > Authentication > Users
```

---

### **Solution 4 : Script Automatique**

Un script `reset-password-admin.js` a été créé dans le projet.

**Pour l'utiliser**:
1. Ouvrez https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Ouvrez la console du navigateur (F12)
4. Copiez-collez le contenu de `reset-password-admin.js`
5. Exécutez le script

Le script affichera le lien de réinitialisation dans la console.

---

## 🔧 Correction du Code

Le composant `ResetPassword.jsx` a été corrigé pour utiliser la bonne URL de redirection.

**Changement**:
```javascript
// AVANT
redirectTo: `${window.location.origin}/#/admin?reset=true`

// APRÈS
redirectTo: `${window.location.origin}/#/admin`
```

---

## 📝 Notes Importantes

1. **Expiration des liens**: Les liens de réinitialisation expirent après 1 heure
2. **URL locale vs production**: 
   - Local: `http://localhost:3000/#/admin`
   - Production: `https://www.amusicadasegunda.com/#/admin`
3. **Email**: Assurez-vous d'utiliser l'email admin correct

---

## 🎯 Recommandations

1. **Utiliser la Solution 1** (Supabase Dashboard) pour réinitialiser rapidement
2. **Vérifier le dossier spam** si vous ne recevez pas l'email
3. **Utiliser un mot de passe fort** avec au moins 12 caractères
4. **Sauvegarder le mot de passe** dans un gestionnaire sécurisé

---

**Contact**: Si le problème persiste, vérifiez:
- ✅ Email admin correct dans Supabase
- ✅ Email dans la table `admins` (user_id: 16f3be11-59c3-4d78-b3b1-32f7f87e01c8)
- ✅ Configuration de l'email dans Supabase Dashboard

