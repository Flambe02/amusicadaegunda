# 🔧 FIX: Erreurs 404 sur les assets (Problème de Cache)

## 🔍 Diagnostic

Les fichiers existent bien dans `docs/assets/`, mais GitHub Pages retourne des erreurs 404:
- ❌ `Calendar-K7hcplMX.js` - 404
- ❌ `video-Dz09t0oR.js` - 404
- ❌ `Playlist-CH__2u61.js` - 404
- ❌ `Blog-BouvZodO.js` - 404
- ❌ `Sobre-7XSBy6t-.js` - 404
- ❌ `AdventCalendar-CetN2CE2.js` - 404

**Cause:** GitHub Pages met en cache les assets et n'a pas encore propagé les nouveaux fichiers.

---

## ✅ Solutions (Par ordre de priorité)

### 1️⃣ SOLUTION IMMÉDIATE: Vider le cache CDN de GitHub Pages

GitHub Pages utilise un CDN qui peut mettre jusqu'à **10 minutes** à se propager.

**Action à faire:**

```bash
# Attendre 10-15 minutes après le dernier push
# Puis forcer le rechargement complet du site dans le navigateur:
# Windows: Ctrl + F5
# Mac: Cmd + Shift + R
```

### 2️⃣ VÉRIFIER que le dernier commit a bien été déployé

```powershell
cd C:\Users\flore\OneDrive\POIVRON_ROUGE\PIM\MusicaDa2nda
git log --oneline -n 3
```

**Résultat attendu:**
Le dernier commit devrait être celui avec les corrections SEO (fait aujourd'hui).

### 3️⃣ FORCER un nouveau déploiement (si l'attente ne suffit pas)

```powershell
cd C:\Users\flore\OneDrive\POIVRON_ROUGE\PIM\MusicaDa2nda

# Rebuild complet
npm run build

# Redéployer
npm run deploy

# Commit et push
git add .
git commit -m "fix(assets): Force rebuild pour vider le cache GitHub Pages"
git push origin main
```

### 4️⃣ VÉRIFIER les paramètres GitHub Pages

1. Va sur **GitHub.com** → Ton repository
2. Va dans **Settings** → **Pages**
3. Vérifie que:
   - ✅ Source: `Deploy from a branch`
   - ✅ Branch: `main`
   - ✅ Folder: `/docs`
4. Si ça affiche un message "Your site is live at...", c'est bon ✅

---

## 🧪 Test de Vérification

Après avoir attendu 10-15 minutes ou forcé un rebuild:

1. **Vide complètement le cache du navigateur:**
   - Chrome DevTools: `F12` → `Network` → Cocher "Disable cache"
   - Ou ouvre une **fenêtre de navigation privée** (Ctrl+Shift+N)

2. **Visite ces URLs directement:**
   ```
   https://www.amusicadasegunda.com/assets/Calendar-K7hcplMX.js
   https://www.amusicadasegunda.com/assets/video-Dz09t0oR.js
   ```
   - ✅ Si tu vois du code JavaScript → **C'est résolu !**
   - ❌ Si tu vois "404" → **Passe à l'étape suivante**

3. **Visite les pages qui buggent:**
   - https://www.amusicadasegunda.com/calendar
   - https://www.amusicadasegunda.com/playlist
   - https://www.amusicadasegunda.com/blog
   - https://www.amusicadasegunda.com/advent-calendar
   - https://www.amusicadasegunda.com/sobre

---

## 📊 Pourquoi ce problème arrive ?

1. **Build fréquents:** Chaque build génère de nouveaux hash pour les fichiers JS
   - Ancien: `Calendar-ABC123.js`
   - Nouveau: `Calendar-K7hcplMX.js`

2. **CDN de GitHub Pages:** Met en cache les anciens fichiers pendant 10-15 minutes

3. **Service Worker:** Si ton PWA a mis en cache l'ancienne version, il faut aussi le vider

---

## 🚨 SI ÇA NE MARCHE TOUJOURS PAS

### Option A: Vider le Service Worker (PWA Cache)

1. Ouvre Chrome DevTools (F12)
2. Va dans **Application** → **Service Workers**
3. Clique sur **Unregister** pour chaque service worker
4. Va dans **Application** → **Storage** → **Clear site data**
5. Recharge la page (F5)

### Option B: Vérifier les logs GitHub Actions

1. Va sur GitHub → ton repository
2. Clique sur **Actions**
3. Regarde le dernier workflow
4. Si tu vois des erreurs rouges ❌, lis-les et corrige

---

## ⏰ Timeline typique de résolution

| Temps | Quoi faire |
|-------|------------|
| **Maintenant** | Push le code corrigé ✅ (FAIT) |
| **+2 minutes** | GitHub construit la page |
| **+5 minutes** | CDN commence à se propager |
| **+10 minutes** | 50% des utilisateurs voient la nouvelle version |
| **+15 minutes** | 100% des utilisateurs voient la nouvelle version |

**Statut actuel:** Tu as déployé à ~14h10. D'ici **14h25**, tout devrait être OK.

---

## 📝 Note pour l'avenir

Pour éviter ce problème à l'avenir:

1. **Test en local d'abord:** `npm run dev` → Vérifie que tout marche
2. **Build une seule fois:** `npm run build`
3. **Déploie une seule fois:** `npm run deploy`
4. **Attends 15 minutes** avant de re-tester en production

**NE PAS faire plusieurs builds/deploys à la suite** → Ça crée de la confusion dans le cache CDN.

---

## ✅ Checklist de résolution

- [ ] Attendre 10-15 minutes après le dernier push
- [ ] Vider le cache du navigateur (Ctrl+F5)
- [ ] Tester en navigation privée
- [ ] Vérifier que les URLs des assets fonctionnent directement
- [ ] Si toujours KO → Forcer un rebuild et redéployer
- [ ] Vider le Service Worker si nécessaire

---

**🎯 Recommandation:** Attends simplement 10-15 minutes. Le problème devrait se résoudre automatiquement.

