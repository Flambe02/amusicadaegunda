# 🎯 PROBLÈME RÉSOLU : Pourquoi la vieille vidéo s'affichait en production

## Le vrai problème

**Ce n'était PAS un problème de cache côté client** (confirmé par le fait que le même problème existait sur le téléphone portable).

**Le vrai problème :** Les fichiers dans `docs/` étaient **datés du 5-6 novembre** et n'avaient **jamais été mis à jour** avec le nouveau code !

## Diagnostic

### 1. Vérification des dates de fichiers

```powershell
Get-ChildItem docs/assets/*.js | Select-Object Name, LastWriteTime

Name                   LastWriteTime      
----                   -------------      
index-BeggUThu.js      05/11/2025 20:14:58  # ❌ ANCIEN
index-B_6WZ4Ze.js      06/11/2025 18:28:04  # ❌ ANCIEN
```

### 2. Workflow GitHub Actions

Le workflow déploie depuis `docs/` :
```yaml
- name: Upload artifact
  uses: actions/upload-pages-artifact@v3
  with:
    path: './docs'  # ⚠️ Déploie depuis docs/, pas depuis dist/
```

### 3. Le build

- `npm run build` crée les fichiers dans `dist/`
- Mais `dist/` n'était jamais copié vers `docs/`
- Donc les anciens fichiers étaient déployés en production

## La solution

### 1. Copie de dist/ vers docs/

```powershell
Remove-Item -Recurse -Force docs/*
Copy-Item -Recurse -Force dist\* docs\
```

### 2. Résultat

```powershell
Name                   LastWriteTime      
----                   -------------      
index-B2si14cB.js      10/11/2025 09:28:39  # ✅ NOUVEAU CODE
index-BeggUThu.js      10/11/2025 09:28:39  # ✅ MIS À JOUR
```

### 3. Commit et push

```bash
git add docs/
git commit -m "fix: Mise à jour docs/ avec le nouveau build"
git push origin main
```

## Pourquoi ça marchait en dev ?

En développement, Vite utilise **Hot Module Replacement (HMR)** qui charge toujours le code source le plus récent depuis `src/`, pas depuis `dist/` ou `docs/`.

## Les fausses pistes

1. ❌ **Cache du Service Worker** : C'était une fausse piste car le problème existait même sur un nouveau device
2. ❌ **Requête Supabase incorrecte** : Le code était correct, mais c'était l'**ancien code** qui était déployé
3. ❌ **Cache CDN** : GitHub Pages a un cache, mais le problème venait des fichiers sources

## Prévention future

### Option 1 : Script de déploiement manuel

Créer un script `deploy.sh` :
```bash
#!/bin/bash
npm run build
rm -rf docs/*
cp -r dist/* docs/
git add docs/
git commit -m "deploy: Update production build"
git push origin main
```

### Option 2 : Modifier le workflow pour utiliser dist/

Modifier `.github/workflows/main.yml` :
```yaml
- name: Upload artifact
  uses: actions/upload-pages-artifact@v3
  with:
    path: './dist'  # Utiliser dist/ au lieu de docs/
```

**Mais attention :** Si on utilise `dist/`, il faut supprimer le dossier `docs/` du repo car il devient inutile.

### Option 3 : Post-build automatique

Ajouter dans `package.json` :
```json
"scripts": {
  "postbuild": "node scripts/generate-stubs.cjs && node scripts/generate-sitemap.cjs && npm run copy-to-docs",
  "copy-to-docs": "node -e \"require('fs').cpSync('dist', 'docs', {recursive: true})\""
}
```

## Résumé

| Aspect | Avant | Après |
|--------|-------|-------|
| Fichiers docs/ | 5-6 nov (anciens) | 10 nov (nouveaux) |
| Code getCurrent() | Ancien tri | Nouveau tri (created_at) |
| Production | Rio (ancien) | William (nouveau) ✅ |
| Dev | William ✅ | William ✅ |

---

**Date de résolution :** 10 novembre 2025, 09:30
**Commit de correction :** `eca683a`

