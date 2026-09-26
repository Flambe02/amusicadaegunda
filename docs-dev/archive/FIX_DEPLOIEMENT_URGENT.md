# 🚨 Fix Urgent - Assets 404 sur GitHub Pages

## ⚠️ Problème actuel

**Toutes les pages sauf Home retournent erreur** : Calendar, Playlist, Blog, AdventCalendar, Sobre

**Cause** : Fichiers JavaScript (assets) **404** en ligne

---

## ⏰ D'ABORD : Attendre 10 minutes

**C'est probablement NORMAL** - ton push a été fait il y a seulement quelques minutes.

GitHub Pages prend **5-10 minutes** pour :
1. Builder le site
2. Déployer les fichiers
3. Propager sur le CDN

**Action** : Attends jusqu'à **11:25** puis vide le cache et recharge.

---

## 🔍 Vérification GitHub Actions (MAINTENANT)

### **Étape 1** : Vérifier l'état du déploiement

1. Ouvre : https://github.com/Flambe02/amusicadaegunda/actions
2. Regarde le workflow le plus récent
3. **État possible** :

| État | Signification | Action |
|------|---------------|--------|
| 🟡 En cours | Déploiement en cours | ⏰ Attendre qu'il finisse |
| ✅ Vert | Déploiement réussi | ⏰ Attendre propagation CDN (2-5 min) |
| ❌ Rouge | Erreur de build | 🔧 Voir logs et corriger |

---

## 🚀 Si GitHub Actions est VERT mais toujours 404

### **Solution rapide** : Force la propagation

```powershell
cd C:\Users\flore\OneDrive\POIVRON_ROUGE\PIM\MusicaDa2nda

# Commit vide pour forcer le redéploiement
git commit --allow-empty -m "chore: force GitHub Pages CDN refresh"
git push origin main
```

Puis attends à nouveau 5-10 minutes.

---

## 🔧 Si GitHub Actions est ROUGE (erreur)

### **Lire les logs d'erreur**

1. Sur GitHub Actions, clique sur le workflow rouge
2. Regarde les logs
3. Cherche l'erreur

### **Erreurs courantes et solutions**

#### **Erreur : "CNAME déjà utilisé"**

```powershell
# Vérifier le CNAME
cat docs/CNAME
```

Doit contenir : `www.amusicadasegunda.com`

Si différent, corrige :
```powershell
echo "www.amusicadasegunda.com" > docs/CNAME
git add docs/CNAME
git commit -m "fix: restore CNAME"
git push origin main
```

#### **Erreur : "Files too large"**

Vérifie la taille des assets :
```powershell
Get-ChildItem docs/assets/*.js | Sort-Object Length -Descending | Select-Object -First 5 Name, @{N='Size (KB)';E={[math]::Round($_.Length/1KB,2)}}
```

Si un fichier dépasse 100 MB → problème.

---

## 🧪 Test diagnostic rapide

### **Test 1 : Home page fonctionne ?**

```powershell
curl.exe -I https://www.amusicadasegunda.com
```

✅ HTTP 200 → Site de base OK
❌ HTTP 404/503 → Problème général

### **Test 2 : Assets anciens ou nouveaux ?**

```powershell
curl.exe -I https://www.amusicadasegunda.com/assets/index-Bf3GO7Jz.js
```

✅ HTTP 200 → Assets sont déployés (vide cache et recharge)
❌ HTTP 404 → Attends encore

---

## ⚡ Solution d'urgence si rien ne marche

### **Rollback au commit précédent**

Si après 30 minutes rien ne fonctionne :

```powershell
cd C:\Users\flore\OneDrive\POIVRON_ROUGE\PIM\MusicaDa2nda

# Revenir au commit précédent
git revert HEAD --no-edit
git push origin main
```

Puis :
1. ❌ **Rollback annule les corrections SEO**
2. ✅ **Mais le site fonctionne à nouveau**
3. 🔧 **On peut investiguer le problème calmement**

---

## 📊 Timeline de déploiement

| Heure | Action | État |
|-------|--------|------|
| 11:02 | Build local terminé | ✅ |
| 11:03 | Commit créé | ✅ |
| 11:04 | Push vers GitHub | ✅ |
| 11:04-11:06 | GitHub Actions build | ? |
| 11:06-11:10 | GitHub Pages deploy | ? |
| 11:10-11:15 | Propagation CDN | ? |
| **11:15** | **État actuel** | ⏰ En attente |
| **11:20** | **Vérification recommandée** | À faire |

---

## ✅ Plan d'action

### **Maintenant (11:15)**
1. Va sur GitHub Actions : https://github.com/Flambe02/amusicadaegunda/actions
2. Vérifie l'état du workflow

### **Dans 5 minutes (11:20)**
1. Vide le cache : `Ctrl + Shift + R`
2. Recharge : https://www.amusicadasegunda.com/calendar
3. Si ça marche → ✅ Terminé !
4. Si 404 encore → Continue ci-dessous

### **Dans 10 minutes (11:25)**
1. Si toujours 404 → Force redeploy (commit vide)
2. Attends encore 10 minutes

### **Dans 30 minutes (11:45)**
1. Si toujours pas OK → Rollback ou investiguer les logs GitHub

---

## 🆘 Problèmes potentiels rares

### **GitHub Pages désactivé ?**

Vérifie dans : **Settings → Pages**
- ✅ Source : Deploy from branch `main`
- ✅ Folder : `/docs`
- ✅ Custom domain : `www.amusicadasegunda.com`

### **Quota GitHub dépassé ?**

Si tu as fait beaucoup de déploiements aujourd'hui, GitHub peut temporiser.
→ Attends 1 heure.

### **Problème de build Vite ?**

Vérifie les logs de build :
```powershell
npm run build 2>&1 | Select-String "error|failed" -CaseSensitive
```

---

## 📞 Support

Si après 1 heure le problème persiste :
1. Check GitHub Actions logs
2. Ouvre une issue GitHub
3. Rollback temporairement

---

## ✨ Résumé ultra-rapide

**Situation** : Assets 404 après déploiement
**Cause probable** : Propagation CDN en cours (normal)
**Action** : **ATTENDRE 10 minutes** + vider cache
**Si problème** : Force redeploy (commit vide)

---

**🕐 Prochaine vérification** : 11:20 (dans 5 minutes)
**📍 GitHub Actions** : https://github.com/Flambe02/amusicadaegunda/actions

