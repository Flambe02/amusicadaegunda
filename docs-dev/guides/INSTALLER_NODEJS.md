# 📦 Installation de Node.js et npm - Windows

## ⚠️ Problème détecté
**Node.js n'est pas installé** sur ton système. npm fait partie de Node.js, donc nous devons d'abord installer Node.js.

---

## 🚀 Installation rapide (RECOMMANDÉ)

### Option 1 : Installateur officiel Node.js (5 minutes)

#### Étape 1 : Télécharger Node.js
1. Va sur : **https://nodejs.org/**
2. Télécharge la version **LTS** (Long Term Support) - version recommandée
   - Actuellement : **Node.js 20.x LTS** ou plus récent
   - Fichier : `node-v20.x.x-x64.msi` (pour Windows 64-bit)

#### Étape 2 : Installer
1. Double-clique sur le fichier `.msi` téléchargé
2. Suis l'assistant d'installation :
   - ✅ Accepte les termes de la licence
   - ✅ Garde l'emplacement par défaut : `C:\Program Files\nodejs\`
   - ✅ **IMPORTANT** : Coche "Automatically install necessary tools"
   - ✅ Clique sur "Install"
3. Attends la fin de l'installation (2-3 minutes)

#### Étape 3 : Vérifier l'installation
Ouvre un **NOUVEAU** PowerShell et tape :

```powershell
node --version
npm --version
```

Tu dois voir quelque chose comme :
```
v20.11.0
10.2.4
```

---

## ✅ Après l'installation de Node.js

### 1. Installer les dépendances du projet

Dans PowerShell, va dans le dossier du projet :

```powershell
cd C:\Users\flore\OneDrive\POIVRON_ROUGE\PIM\MusicaDa2nda
npm install
```

Cette commande va installer toutes les dépendances listées dans `package.json` (React, Vite, etc.)

**Durée** : 3-5 minutes

### 2. Déployer les corrections SEO

Une fois `npm install` terminé, lance :

```powershell
npm run deploy
```

ou utilise le script automatique :

```powershell
.\deploy-seo-fix.ps1
```

---

## 🔧 Configuration avancée (optionnel)

### Vérifier que Node.js est dans le PATH

Après l'installation, Node.js doit être automatiquement ajouté au PATH. Pour vérifier :

```powershell
$env:PATH -split ';' | Select-String "nodejs"
```

Tu dois voir : `C:\Program Files\nodejs\`

### Si Node.js n'est pas dans le PATH

Ajoute-le manuellement :

1. **Recherche Windows** → Tape "variables d'environnement"
2. Clique sur **"Modifier les variables d'environnement système"**
3. Bouton **"Variables d'environnement..."**
4. Dans **"Variables système"**, sélectionne **Path** et clique **"Modifier"**
5. Clique **"Nouveau"** et ajoute : `C:\Program Files\nodejs\`
6. Clique **OK** partout
7. **Ferme et rouvre PowerShell**

---

## 🎯 Alternatives d'installation

### Option 2 : Chocolatey (gestionnaire de paquets Windows)

Si tu as Chocolatey installé :

```powershell
choco install nodejs-lts -y
```

### Option 3 : Winget (Windows Package Manager)

Si tu as Windows 10/11 avec Winget :

```powershell
winget install OpenJS.NodeJS.LTS
```

### Option 4 : nvm-windows (Node Version Manager)

Pour gérer plusieurs versions de Node.js :

1. Télécharge nvm-windows : https://github.com/coreybutler/nvm-windows/releases
2. Installe `nvm-setup.exe`
3. Dans PowerShell :

```powershell
nvm install lts
nvm use lts
```

---

## 📊 Versions recommandées

| Version | Statut | Recommandation |
|---------|--------|----------------|
| Node.js 20.x LTS | ✅ Stable | **RECOMMANDÉ** pour production |
| Node.js 21.x | 🟡 Actuel | OK mais moins stable |
| Node.js 18.x LTS | ✅ Stable | OK aussi (fin de support en 2025) |
| Node.js < 18 | ❌ Obsolète | À éviter |

---

## 🆘 Problèmes courants

### "npm : Le terme 'npm' n'est pas reconnu..."

**Cause** : Node.js n'est pas installé ou pas dans le PATH

**Solutions** :
1. Installe Node.js (voir ci-dessus)
2. Ferme et rouvre PowerShell après l'installation
3. Vérifie le PATH (voir section Configuration avancée)

### Erreur de permissions pendant npm install

**Solution** : Lance PowerShell en mode Administrateur

1. Clic droit sur PowerShell
2. "Exécuter en tant qu'administrateur"
3. Relance `npm install`

### Scripts désactivés dans PowerShell

Si tu vois : `impossible de charger ... car l'exécution de scripts est désactivée`

**Solution** :

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## ✨ Après l'installation complète

### Commandes essentielles à connaître

```powershell
# Vérifier les versions
node --version
npm --version

# Installer les dépendances d'un projet
npm install

# Lancer le projet en développement
npm run dev

# Builder le projet pour production
npm run build

# Déployer (notre cas)
npm run deploy
```

---

## 🎯 Prochaines étapes pour ton projet

Une fois Node.js installé et `npm install` exécuté :

1. ✅ **Déployer** : `npm run deploy`
2. ✅ **Commit** : 
   ```powershell
   git add .
   git commit -m "fix(seo): Corriger domaine et unifier SEO home"
   git push origin main
   ```
3. ✅ **Vérifier** : https://www.amusicadasegunda.com
4. ✅ **Google Search Console** : Demander l'indexation

Lis ensuite : `GUIDE_REINDEXATION_GOOGLE.md`

---

## 📞 Support

### Documentation officielle
- Node.js : https://nodejs.org/docs/
- npm : https://docs.npmjs.com/

### Communauté
- Stack Overflow (français) : https://fr.stackoverflow.com/questions/tagged/node.js
- Discord Node.js : https://discord.gg/nodejs

---

## ✅ Checklist installation

- [ ] Télécharger Node.js LTS depuis nodejs.org
- [ ] Installer avec l'assistant (cocher "install necessary tools")
- [ ] Vérifier : `node --version` et `npm --version`
- [ ] Aller dans le dossier du projet
- [ ] Lancer : `npm install` (attendre 3-5 min)
- [ ] Lancer : `npm run deploy`
- [ ] Commit et push vers GitHub
- [ ] Vérifier le site déployé

**Temps total estimé** : 10-15 minutes

---

**🚀 Commence maintenant** : https://nodejs.org/ → Télécharge la version LTS !

