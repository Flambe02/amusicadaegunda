# 🚀 PLAN D'OPTIMISATION PERFORMANCE - Música da Segunda

**Date :** 10 novembre 2025  
**Score actuel :** 48/100 (🔴 Critique)  
**Objectif :** 85+/100 (✅ Bon)

---

## 📊 ANALYSE DES RÉSULTATS PAGESPEED

### Scores actuels

| Métrique | Score | Cible |
|----------|-------|-------|
| Performance | **48/100** | 85+ |
| Accessibility | 95/100 | ✅ |
| Best Practices | 92/100 | ✅ |
| SEO | 100/100 | ✅ |

### Core Web Vitals (CRITIQUES)

| Métrique | Actuel | Cible | Écart |
|----------|--------|-------|-------|
| **FCP** | 9.4s | 1.8s | **-7.6s** 🔴 |
| **LCP** | 12.0s | 2.5s | **-9.5s** 🔴 |
| **TBT** | 360ms | 200ms | **-160ms** 🟠 |
| **CLS** | 0 | 0.1 | ✅ |
| **Speed Index** | 9.4s | 3.4s | **-6.0s** 🔴 |

---

## 🎯 OPTIMISATIONS PRIORITAIRES

### 1. 🔴 CACHE LIFETIME (Impact: -643 KiB)

**Statut :** ✅ **CORRIGÉ**

**Action :**
- ✅ Créé `public/_headers` et `docs/_headers`
- ✅ Cache 1 an pour assets avec hash
- ✅ Cache 1 mois pour images
- ✅ Cache court pour HTML/manifest

**Gain estimé :** +10 points

---

### 2. 🔴 RENDER BLOCKING REQUESTS (Impact: -150ms)

**Problème :** CSS et JS bloquent le rendu initial

**Solutions :**

#### A. Précharger les ressources critiques

Ajouter dans `public/index.html` :

```html
<head>
  <!-- Preconnect vers domaines externes -->
  <link rel="preconnect" href="https://efnzmpzkzeuktqkghwfa.supabase.co" crossorigin>
  <link rel="dns-prefetch" href="https://efnzmpzkzeuktqkghwfa.supabase.co">
  
  <!-- Preload du CSS critique -->
  <link rel="preload" as="style" href="/assets/index-[hash].css">
  
  <!-- Preload des fonts (si utilisées) -->
  <!-- <link rel="preload" as="font" type="font/woff2" href="/fonts/inter.woff2" crossorigin> -->
</head>
```

#### B. Inline du CSS critique

Extraire et inliner le CSS above-the-fold (priorité moyenne).

**Gain estimé :** +8 points

---

### 3. 🔴 UNUSED JAVASCRIPT (Impact: -867 KiB)

**Problème :** 867 KiB de JS inutilisé (code non exécuté sur la page)

**Solutions :**

#### A. Code Splitting agressif

**Statut :** ✅ **AMÉLIORÉ** dans `vite.config.js`

Changements appliqués :
- ✅ Chunk splitting par dépendance (React, Radix UI, Supabase, utils séparés)
- ✅ `assetsInlineLimit: 2048` (réduit de 4096)
- ✅ `chunkSizeWarningLimit: 500` (force plus de splitting)
- ✅ `cssCodeSplit: true`

#### B. Lazy loading des composants lourds

**À implémenter :**

Exemple pour `AdventCalendar.jsx` :

```javascript
// Au lieu de :
import AdventCalendar from './pages/AdventCalendar';

// Utiliser :
const AdventCalendar = lazy(() => import('./pages/AdventCalendar'));
```

**Fichiers à lazy-loader :**
- ✅ `AdventCalendar.jsx` (déjà fait ?)
- ⚠️ `Admin.jsx` (priorité haute)
- ⚠️ `Calendar.jsx` (priorité moyenne)
- ⚠️ `Blog.jsx` (priorité basse)

#### C. Tree shaking des dépendances

**Vérifier :**
- Import sélectif de `date-fns` : `import { format } from 'date-fns'` ✅
- Import sélectif de `@radix-ui` : imports par composant ✅
- Supprimer les imports inutilisés (ESLint)

**Gain estimé :** +15 points

---

### 4. 🟠 UNUSED CSS (Impact: -103 KiB)

**Problème :** 103 KiB de CSS inutilisé

**Solutions :**

#### A. PurgeCSS / Tailwind JIT

Vérifier `tailwind.config.js` :

```javascript
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // ... reste de la config
}
```

#### B. Supprimer les styles inutilisés

**À vérifier :**
- `src/styles/tiktok-optimized.css` : est-ce toujours nécessaire ?
- `src/styles/a11y.css` : est-ce chargé partout alors qu'utilisé localement ?

**Gain estimé :** +5 points

---

### 5. 🟠 IMAGE DELIVERY (Impact: -420 KiB)

**Problème :** Images non optimisées

**Solutions :**

#### A. Format WebP

Convertir toutes les images PNG/JPG en WebP :

```bash
npm install sharp --save-dev
node scripts/convert-to-webp.cjs
```

#### B. Responsive images

Utiliser `<picture>` avec plusieurs sources :

```jsx
<picture>
  <source srcset="/images/logo-400.webp" media="(max-width: 400px)" type="image/webp">
  <source srcset="/images/logo-800.webp" media="(max-width: 800px)" type="image/webp">
  <img src="/images/logo.png" alt="Logo" loading="lazy">
</picture>
```

#### C. Lazy loading des images

Ajouter `loading="lazy"` sur toutes les images non critiques :

```jsx
<img src="/images/cover.png" alt="Cover" loading="lazy" />
```

**Gain estimé :** +12 points

---

### 6. 🔴 JAVASCRIPT EXECUTION TIME (Impact: -1.5s)

**Problème :** Le JS met 1.5s à s'exécuter

**Solutions :**

#### A. Réduire la taille du bundle principal

- ✅ Code splitting (déjà amélioré)
- ⚠️ Lazy loading des routes lourdes
- ⚠️ Différer le chargement des analytics/web vitals

#### B. Optimiser les composants React

**À vérifier :**
- Utiliser `React.memo()` sur les composants lourds
- Utiliser `useMemo()` et `useCallback()` pour les calculs coûteux
- Éviter les re-renders inutiles

#### C. Différer le chargement non critique

```javascript
// Dans main.jsx
if (import.meta.env?.PROD) {
  // Charger Web Vitals après le chargement complet
  setTimeout(() => {
    import('./analytics/webvitals').catch(() => {});
  }, 3000);
}
```

**Gain estimé :** +10 points

---

### 7. 🟠 MAIN-THREAD WORK (Impact: -2.0s)

**Problème :** 2.0s de travail sur le thread principal, 7 tâches longues

**Solutions :**

#### A. Web Workers pour tâches lourdes

Si vous avez des calculs lourds, les déplacer vers un Web Worker.

#### B. Réduire le travail au montage

**À vérifier dans `Home.jsx` :**
- Limiter les `useEffect` au strict nécessaire
- Différer les initialisations non critiques
- Utiliser `requestIdleCallback` pour tâches non urgentes

**Gain estimé :** +8 points

---

## 📋 CHECKLIST D'OPTIMISATION

### Priorité HAUTE (Gain: +40-50 points)

- [x] Cache headers (`_headers`)
- [x] Code splitting agressif (vite.config.js)
- [ ] Lazy loading Admin/Calendar
- [ ] Précharger ressources critiques (preconnect)
- [ ] Convertir images en WebP
- [ ] Lazy loading toutes les images

### Priorité MOYENNE (Gain: +20-30 points)

- [ ] Inline CSS critique
- [ ] PurgeCSS / vérifier Tailwind
- [ ] React.memo() sur composants lourds
- [ ] Différer Web Vitals (3s delay)
- [ ] Optimiser imports (tree shaking)

### Priorité BASSE (Gain: +5-10 points)

- [ ] Web Workers (si calculs lourds)
- [ ] requestIdleCallback pour tâches non urgentes
- [ ] Supprimer CSS/JS totalement inutilisé

---

## 🎯 OBJECTIFS PAR ÉTAPE

### Phase 1 : Quick wins (1-2 heures)
**Objectif :** 48 → 65 points

- [x] Cache headers
- [x] Code splitting amélioré
- [ ] Lazy loading Admin
- [ ] Images WebP

**Gain estimé :** +17 points

### Phase 2 : Optimisations moyennes (2-4 heures)
**Objectif :** 65 → 80 points

- [ ] Preconnect/preload
- [ ] Lazy loading images
- [ ] React.memo composants
- [ ] Différer analytics

**Gain estimé :** +15 points

### Phase 3 : Optimisations avancées (4-8 heures)
**Objectif :** 80 → 90+ points

- [ ] CSS critique inline
- [ ] Web Workers si nécessaire
- [ ] Audit complet des dépendances
- [ ] Optimisations fines

**Gain estimé :** +10-15 points

---

## 🚀 PROCHAINES ÉTAPES IMMÉDIATES

### 1. Build et push (5 minutes)

```bash
git add .
git commit -m "perf: Optimisations cache et code splitting"
git push origin main
```

### 2. Attendre le déploiement (2-3 minutes)

GitHub Actions va rebuilder et déployer automatiquement.

### 3. Re-tester PageSpeed Insights (1 minute)

Attendre 5 minutes après le déploiement, puis :
https://pagespeed.web.dev/analysis/https-www-amusicadasegunda-com

**Attendu :** Score passant de 48 à ~60-65 avec juste les optimisations actuelles.

---

## 📊 SUIVI DES RÉSULTATS

| Date | Score | FCP | LCP | TBT | Changements |
|------|-------|-----|-----|-----|-------------|
| 10/11 10:28 | 48 | 9.4s | 12.0s | 360ms | Baseline |
| 10/11 [après] | ? | ? | ? | ? | Cache + splitting |

---

**Dernière mise à jour :** 10 novembre 2025, 11:00  
**Prochain test :** Après déploiement (~11:10)

