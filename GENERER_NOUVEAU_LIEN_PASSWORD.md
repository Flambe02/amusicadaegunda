# 🔑 Générer un Nouveau Lien de Réinitialisation

## ❌ Problème
Vous avez un ancien lien qui pointe vers `localhost` au lieu de la production.

## ✅ Solution - Méthode Simple

### **Étape 1 : Demander un Nouveau Lien**

1. **Allez sur** : https://www.amusicadasegunda.com/#/login
2. **Cliquez** sur "Réinitialiser" (en bas du formulaire)
3. **Entrez** votre email : `florent.lambert@gmail.com`
4. **Cliquez** sur "Envoyer le lien"
5. **Attendez** l'email (peut prendre quelques minutes)

### **Étape 2 : Vérifier Votre Email**

- ✅ Cherchez dans **tous les dossiers** :
  - Boîte de réception
  - Courrier indésirable (spam)
  - Promotions

- ✅ **L'email vient de** : noreply@supabase.co
- ✅ **Sujet** : "Reset your password"

### **Étape 3 : Cliquer sur le Lien**

Une fois l'email reçu :
1. **Cliquez** sur le lien dans l'email
2. **Vous serez redirigé** vers : `https://www.amusicadasegunda.com/#/admin`
3. **Définissez** un nouveau mot de passe
4. **Confirmez** le nouveau mot de passe
5. **Cliquez** sur "Update password"

---

## 🔄 Si Vous N'Recevez Pas l'Email

### **Vérifier la Configuration Supabase**

1. **Allez sur** : https://supabase.com/dashboard
2. **Sélectionnez** votre projet
3. **Allez dans** : **Authentication > URL Configuration**
4. **Vérifiez** que les URLs suivantes sont dans **Redirect URLs** :
   ```
   https://www.amusicadasegunda.com/#/admin
   https://www.amusicadasegunda.com/#/login
   https://www.amusicadasegunda.com
   ```

### **Option Alternative : Via Supabase Dashboard**

1. **Allez sur** : https://supabase.com/dashboard
2. **Sélectionnez** votre projet
3. **Allez dans** : **Authentication > Users**
4. **Trouvez** `florent.lambert@gmail.com`
5. **Cliquez** sur les **3 points (...)** à droite
6. **Sélectionnez** "Send password reset email"
7. **Vérifiez** votre email

---

## ⚠️ Important

- ⏰ Les liens expirent après **1 heure**
- 🚫 Ne cliquez pas sur l'ancien lien (celui de localhost)
- ✅ Utilisez uniquement le **nouveau lien** généré
- 🔐 Le mot de passe doit avoir **au moins 6 caractères**

---

## 📞 Si Rien Ne Fonctionne

Contactez le support Supabase ou créez un nouveau compte admin.

