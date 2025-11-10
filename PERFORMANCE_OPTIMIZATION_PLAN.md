# 🚀 Plan d'optimisation de performance - Música da Segunda

## 📊 Situation actuelle (PageSpeed Insights Mobile)

**Score Performance : 48/100** 🔴

### Métriques critiques :
- **FCP** : 9.4s (cible < 1.8s) 🔴
- **LCP** : 12.0s (cible < 2.5s) 🔴
- **TBT** : 360ms (cible < 200ms) 🟠
- **Speed Index** : 9.4s (cible < 3.4s) 🔴
- **CLS** : 0 (parfait) ✅

### Contexte du test :
- Device : Moto G Power (bas de gamme)
- Connexion : **Slow 4G** (très lent)
- Lighthouse 13.0.1

---

## 🎯 Objectif : Atteindre 90+/100

---

## 🔥 PRIORITÉ 1 : JavaScript non utilisé (-867 KiB)

### Problème :
React + toutes les dépendances sont chargées dès la première page, même pour du code non utilisé immédiatement.

### Solutions :

#### A. Code splitting agressif pour les routes

**Fichier : `src/App.jsx`**

```javascript
// AVANT (chargement synchrone)
import Home from './pages/Home';
import Playlist from './pages/Playlist';
import Blog from './pages/Blog';
// ...

// APRÈS (lazy loading)
import { lazy, Suspense } from 'react';

const Home = lazy(() => import('./pages/Home'));
const Playlist = lazy(() => import('./pages/Playlist'));
const Blog = lazy(() => import('./pages/Blog'));
const Sobre = lazy(() => import('./pages/Sobre'));
const Youtube = lazy(() => import('./pages/Youtube'));
const AdventCalendar = lazy(() => import('./pages/AdventCalendar'));
const Admin = lazy(() => import('./pages/Admin'));
const Song = lazy(() => import('./pages/Song'));

// Dans le rendu :
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/playlist" element={<Playlist />} />
    {/* ... */}
  </Routes>
</Suspense>
```

**Gain estimé : -300 KiB, -1.5s sur FCP**

#### B. Lazy load des composants lourds

**Fichier : `src/pages/Home.jsx`**

```javascript
// Lazy load TikTokEmbed et YouTubeEmbed
const TikTokEmbed = lazy(() => import('@/components/TikTokEmbed'));
const YouTubeEmbed = lazy(() => import('@/components/YouTubeEmbed'));

// Dans le rendu :
<Suspense fallback={<div className="skeleton-loader" />}>
  {currentSong?.tiktok_video_id && (
    <TikTokEmbed videoId={currentSong.tiktok_video_id} />
  )}
  {currentSong?.youtube_music_url && (
    <YouTubeEmbed url={currentSong.youtube_music_url} />
  )}
</Suspense>
```

**Gain estimé : -200 KiB**

#### C. Tree-shaking manuel des bibliothèques

**Fichier : `vite.config.js`**

```javascript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks séparés
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'ui': ['lucide-react', '@/components/ui'],
        }
      }
    },
    // Minification agressive
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Supprimer console.log en prod
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info'],
      },
    },
  },
});
```

**Gain estimé : -150 KiB**

---

## 🔥 PRIORITÉ 2 : CSS non utilisé (-103 KiB)

### Problème :
Tailwind CSS génère beaucoup de classes inutilisées.

### Solution : PurgeCSS agressif

**Fichier : `tailwind.config.js`**

```javascript
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './public/pwa-install.js', // Inclure tous les fichiers
  ],
  // Purge agressif
  safelist: [], // Ne garder aucune classe par défaut
  theme: {
    extend: {
      // Limiter les variantes
    },
  },
  // Désactiver les variantes inutilisées
  corePlugins: {
    preflight: true, // Garder le reset
  },
};
```

**Gain estimé : -50 KiB**

---

## 🔥 PRIORITÉ 3 : Cache efficace (-643 KiB)

### Problème :
Les assets statiques n'ont pas de cache à long terme.

### Solution : Headers Cache-Control optimaux

**Fichier : `public/_headers` (pour GitHub Pages via Cloudflare)**

```
/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

# Cache statique 1 an
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/icons/*
  Cache-Control: public, max-age=31536000, immutable

# Images 1 mois
/images/*
  Cache-Control: public, max-age=2592000

# Service Worker : pas de cache
/sw.js
  Cache-Control: no-cache, no-store, must-revalidate

# Manifest : 1 semaine
/manifest.json
  Cache-Control: public, max-age=604800
```

**Gain estimé : -643 KiB sur visite répétée**

---

## 🔥 PRIORITÉ 4 : Images optimisées (-420 KiB)

### Problème :
Images non optimisées (format, taille, lazy loading).

### Solutions :

#### A. Format WebP + AVIF

**Script : `scripts/convert-images-to-webp.cjs`**

```javascript
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convertToWebP(inputPath) {
  const outputPath = inputPath.replace(/\.(png|jpg|jpeg)$/, '.webp');
  
  await sharp(inputPath)
    .webp({ quality: 80, effort: 6 })
    .toFile(outputPath);
  
  console.log(`✅ Converti: ${outputPath}`);
}

// Parcourir public/images/
const imagesDir = path.join(__dirname, '../public/images');
fs.readdirSync(imagesDir).forEach(file => {
  if (file.match(/\.(png|jpg|jpeg)$/)) {
    convertToWebP(path.join(imagesDir, file));
  }
});
```

**Usage :**
```bash
npm install sharp
node scripts/convert-images-to-webp.cjs
```

#### B. Lazy loading natif

**Tous les composants avec images :**

```jsx
<img
  src={song.cover_image}
  alt={song.title}
  loading="lazy" // ← Ajouter
  decoding="async" // ← Ajouter
  width="300" // ← Spécifier dimensions
  height="300"
/>
```

**Gain estimé : -300 KiB**

---

## 🔥 PRIORITÉ 5 : Render blocking requests (-150ms)

### Problème :
Fonts et CSS bloquent le rendu.

### Solutions :

#### A. Preload des fonts critiques

**Fichier : `public/index.html`**

```html
<head>
  <!-- Preload font -->
  <link rel="preload" href="/fonts/Inter-Regular.woff2" as="font" type="font/woff2" crossorigin>
  
  <!-- Preconnect à Google Fonts si utilisé -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  
  <!-- DNS prefetch pour domaines externes -->
  <link rel="dns-prefetch" href="https://efnzmpzkzeuktqkghwfa.supabase.co">
  <link rel="dns-prefetch" href="https://www.youtube.com">
</head>
```

#### B. Critical CSS inline

**Extraire le CSS critique et l'inliner dans `<head>`**

```html
<style>
  /* CSS critique pour above-the-fold */
  .header { /* ... */ }
  .hero { /* ... */ }
  .skeleton-loader { /* ... */ }
</style>
```

**Gain estimé : -150ms sur FCP**

---

## 🔥 PRIORITÉ 6 : Réduire l'exécution JavaScript (-1.5s)

### Problème :
Trop de JavaScript exécuté pendant le chargement.

### Solutions :

#### A. Web Workers pour calculs lourds

Si vous avez des calculs lourds (parsing, etc.), les déplacer dans un Web Worker.

#### B. Différer les scripts non critiques

**Fichier : `public/index.html`**

```html
<!-- Analytics : defer -->
<script defer src="/analytics/webvitals.js"></script>

<!-- PWA installer : defer -->
<script defer src="/pwa-install.js"></script>
```

#### C. Optimiser React

**Fichier : `src/main.jsx`**

```javascript
// AVANT
<React.StrictMode>
  <App />
</React.StrictMode>

// APRÈS (en production)
{import.meta.env.DEV ? (
  <React.StrictMode>
    <App />
  </React.StrictMode>
) : (
  <App />
)}
```

**Gain estimé : -1s sur TBT**

---

## 🔥 PRIORITÉ 7 : Minimize main-thread work (-2.0s)

### Solutions :

#### A. React.memo pour composants lourds

```javascript
// Composants qui rerendent souvent
export const SongCard = React.memo(({ song }) => {
  // ...
});

export const YouTubeEmbed = React.memo(({ url, title }) => {
  // ...
});
```

#### B. useMemo et useCallback stratégiques

```javascript
const filteredSongs = useMemo(() => {
  return songs.filter(s => s.status === 'published');
}, [songs]);

const handleClick = useCallback(() => {
  // ...
}, [dependencies]);
```

**Gain estimé : -500ms sur TBT**

---

## 📋 CHECKLIST D'IMPLÉMENTATION

### Phase 1 : Quick wins (1-2 heures)

- [ ] Lazy loading des routes (`App.jsx`)
- [ ] Lazy loading TikTok/YouTube embeds
- [ ] Ajouter `loading="lazy"` sur toutes les images
- [ ] Supprimer `console.log` en production (vite.config.js)
- [ ] Preload fonts critiques

**Gain attendu : 60/100 → 75/100**

### Phase 2 : Optimisations moyennes (2-4 heures)

- [ ] Convertir images en WebP
- [ ] PurgeCSS agressif
- [ ] Manual chunks (vendor splitting)
- [ ] React.memo sur composants lourds
- [ ] Headers Cache-Control

**Gain attendu : 75/100 → 85/100**

### Phase 3 : Optimisations avancées (4-8 heures)

- [ ] Critical CSS inline
- [ ] Service Worker preload/prefetch
- [ ] Compression Brotli (si serveur custom)
- [ ] HTTP/2 Server Push
- [ ] Resource hints (preload, prefetch, preconnect)

**Gain attendu : 85/100 → 90+/100**

---

## 🎯 Résultats attendus après optimisations

| Métrique | Avant | Après | Cible |
|----------|-------|-------|-------|
| **Performance** | 48 | **90+** | 90+ |
| **FCP** | 9.4s | **2.0s** | < 1.8s |
| **LCP** | 12.0s | **2.8s** | < 2.5s |
| **TBT** | 360ms | **150ms** | < 200ms |
| **Speed Index** | 9.4s | **3.0s** | < 3.4s |

---

## 🚀 Commencer maintenant

### Ordre d'implémentation recommandé :

1. **Lazy loading routes** (15 min) → +10 points
2. **Lazy loading embeds** (15 min) → +5 points
3. **Images lazy loading** (10 min) → +5 points
4. **Terser config** (5 min) → +5 points
5. **Manual chunks** (20 min) → +10 points

**Total : 1h pour +35 points → Score estimé : 83/100**

---

## ⚠️ Note importante sur le test

Le test a été fait avec :
- **Slow 4G** (très lent, pire cas)
- **Moto G Power** (device bas de gamme)

En conditions réelles (4G normal, device moyen), votre score sera probablement **20-30 points plus élevé**.

**Score estimé réel pour utilisateurs moyens : 65-75/100 actuellement**

Avec les optimisations Phase 1 : **Score réel attendu : 90+/100**

---

**Date :** 10 novembre 2025  
**Rapport source :** PageSpeed Insights Mobile
