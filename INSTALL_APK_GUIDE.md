# 📱 Guide : Installer l'APK sur Android

## ❌ Erreur : "Application non installée - Le package semble corrompu"

### Cause principale
Cette erreur survient quand une **version PWA ou debug** est déjà installée avec une **signature différente**.

---

## ✅ SOLUTIONS

### Solution 1 : Désinstallation complète (RECOMMANDÉ) ⭐

#### Sur votre téléphone Android :

1. **Paramètres** → **Applications**
2. Chercher **"Música da Segunda"**
3. Appuyer sur l'app → **Désinstaller**
4. Si vous voyez **"Supprimer les données"** → Cocher la case
5. **Redémarrer le téléphone** (important pour nettoyer le cache)
6. **Réinstaller** le nouveau APK

---

### Solution 2 : Installation via ADB (si désinstallation échoue)

#### Prérequis
- **ADB (Android Debug Bridge)** installé sur votre PC
- **Débogage USB** activé sur votre téléphone

#### Étapes

##### 1. Activer le débogage USB

Sur votre téléphone :
1. **Paramètres** → **À propos du téléphone**
2. Taper **7 fois** sur "Numéro de build"
3. Message : "Vous êtes développeur !"
4. **Paramètres** → **Options pour les développeurs**
5. Activer **"Débogage USB"**

##### 2. Connecter le téléphone au PC

1. Connecter via **câble USB**
2. Sur le téléphone : Autoriser **"Débogage USB"** (popup)

##### 3. Installer ADB (si pas déjà fait)

**Windows :**
```powershell
# Télécharger ADB Platform Tools
# https://developer.android.com/studio/releases/platform-tools

# Ou via Chocolatey :
choco install adb
```

**Ou utiliser ADB depuis Android Studio :**
```
C:\Users\<VOTRE_USER>\AppData\Local\Android\Sdk\platform-tools\adb.exe
```

##### 4. Vérifier la connexion

```bash
adb devices
```

**Résultat attendu :**
```
List of devices attached
ABC123XYZ      device
```

##### 5. Désinstaller l'ancienne version (force)

```bash
adb uninstall com.amusicadasegunda.www.twa
```

##### 6. Installer le nouveau APK

```bash
cd C:\Users\flore\OneDrive\POIVRON_ROUGE\PIM\MusicaDa2nda
adb install -r app/build/outputs/apk/release/app-release.apk
```

**Flags :**
- `-r` : Reinstall (remplace l'ancienne version)
- `-t` : Allow test packages
- `-d` : Allow version downgrade

**Si ça échoue encore :**
```bash
adb install -r -t -d app/build/outputs/apk/release/app-release.apk
```

---

### Solution 3 : Rebuild avec signature différente

Si le problème persiste, c'est peut-être le **package name** qui est en conflit.

#### Changer le package name

**Fichier : `twa-manifest.json`**

```json
{
  "packageId": "com.amusicadasegunda.www.twa.v2",  // Ajouter .v2
  // ... reste du fichier
}
```

Puis rebuild :
```bash
npx @bubblewrap/cli build
```

---

### Solution 4 : Vérifier la signature de l'APK

```bash
# Sur Windows (nécessite Java JDK)
cd C:\Users\flore\OneDrive\POIVRON_ROUGE\PIM\MusicaDa2nda

# Vérifier la signature
jarsigner -verify -verbose -certs app/build/outputs/apk/release/app-release.apk
```

**Résultat attendu :**
```
jar verified.
```

---

## 🎯 RÉSUMÉ : PROCÉDURE RECOMMANDÉE

### Méthode simple (sans ADB)

1. ✅ **Désinstaller** l'app existante complètement
2. ✅ **Redémarrer** le téléphone
3. ✅ **Réinstaller** le nouveau APK
4. ✅ Si erreur persiste → Passer à la méthode ADB

### Méthode ADB (si désinstallation échoue)

1. ✅ Activer **Débogage USB**
2. ✅ Installer **ADB**
3. ✅ Connecter téléphone au PC
4. ✅ `adb uninstall com.amusicadasegunda.www.twa`
5. ✅ `adb install -r app-release.apk`

---

## ⚠️ PROBLÈMES COURANTS

### "adb: device unauthorized"

**Solution :**
1. Sur le téléphone : Révoquer les autorisations USB
2. Débrancher/rebrancher le câble
3. Réautoriser le débogage USB

### "INSTALL_FAILED_UPDATE_INCOMPATIBLE"

**Solution :**
```bash
adb uninstall com.amusicadasegunda.www.twa
adb install app-release.apk
```

### "INSTALL_FAILED_VERIFICATION_FAILURE"

**Solution :**
1. Désactiver **Google Play Protect** temporairement
2. Réessayer l'installation

---

## 📊 CODES D'ERREUR ANDROID

| Code | Signification | Solution |
|------|---------------|----------|
| **INSTALL_FAILED_UPDATE_INCOMPATIBLE** | Signature différente | Désinstaller complètement |
| **INSTALL_PARSE_FAILED_NO_CERTIFICATES** | APK non signé | Rebuild avec keystore |
| **INSTALL_FAILED_INVALID_APK** | APK corrompu | Rebuild |
| **INSTALL_FAILED_ALREADY_EXISTS** | App déjà installée | `adb install -r` |

---

## 🔧 ALTERNATIVE : Installer via Google Play Store

Si l'installation manuelle échoue, vous pouvez :

1. **Upload l'AAB sur Google Play Console** (Internal Testing)
2. **Ajouter votre email** comme testeur
3. **Installer depuis le Play Store**

Avantage : Pas de problème de signature !

---

## ✅ VÉRIFICATION POST-INSTALLATION

Une fois l'app installée :

1. ✅ Ouvrir l'app
2. ✅ Vérifier que la page s'affiche (pas blanche)
3. ✅ Tester la navigation
4. ✅ Tester les notifications push (si activées)

---

**Date :** 10 novembre 2025  
**Status :** Guide d'installation APK Android  
**Fichier APK :** `app/build/outputs/apk/release/app-release.apk`

