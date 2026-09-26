# 🔧 FIX : Cache en Production - Chanson incorrecte affichée

## Problème

En production, "Rio continua lindo" s'affiche au lieu de "William oh William" (dernière chanson).

## Causes possibles

1. **Service Worker en cache** : L'ancienne version du code JS est servie depuis le cache
2. **Build non déployé** : Le nouveau code n'a pas été build/déployé
3. **Cache navigateur** : Les utilisateurs ont l'ancien code en cache

## Solutions appliquées

### 1. Mise à jour du Service Worker

**Fichier :** `public/sw.js`
- Version du cache mise à jour : `v2.1.0` → `v5.0.3`
- Force la mise à jour du cache pour tous les utilisateurs

### 2. Vérification du code

Le code `getCurrent()` trie correctement par :
1. `created_at` (date d'enregistrement dans Supabase)
2. `updated_at` (date de mise à jour)
3. `release_date` (date de publication)

## Actions à faire

### 1. Commit et push les changements

```bash
git add public/sw.js
git commit -m "fix: Mise à jour version Service Worker pour forcer refresh cache production"
git push origin main
```

### 2. Vérifier le déploiement GitHub Actions

- Aller sur GitHub > Actions
- Vérifier que le workflow "Deploy to GitHub Pages" s'est exécuté
- Vérifier que le build a réussi

### 3. Vider le cache des utilisateurs

**Option 1 : Attendre** (recommandé)
- Le nouveau Service Worker sera installé automatiquement
- Les utilisateurs recevront la mise à jour lors de leur prochaine visite

**Option 2 : Forcer la mise à jour**
- Les utilisateurs peuvent vider le cache manuellement :
  - Chrome : F12 > Application > Clear storage > Clear site data
  - Ou : Ctrl+Shift+R (hard refresh)

### 4. Vérifier dans Supabase

Vérifier que "William oh William" a bien un `created_at` plus récent que "Rio continua lindo" :

```sql
SELECT 
  title, 
  created_at, 
  updated_at, 
  release_date,
  status
FROM songs 
WHERE status = 'published'
ORDER BY created_at DESC, updated_at DESC, release_date DESC
LIMIT 5;
```

## Vérification

Après le déploiement, vérifier :
1. ✅ Le Service Worker a la version `v5.0.3`
2. ✅ Le code JS est à jour (vérifier dans les DevTools)
3. ✅ La requête Supabase retourne "William oh William"

## Si le problème persiste

1. Vérifier les dates `created_at` dans Supabase
2. Vérifier que le build GitHub Actions a bien utilisé le nouveau code
3. Vérifier les logs du navigateur (F12 > Console) pour voir quelle chanson est chargée

