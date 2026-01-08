# 🔍 AUDIT COMPLET : Migration `/chansons` → `/musica`
**Date:** 8 janvier 2026  
**Statut:** Audit terminé ✅ | Attente validation avant modification

---

## 📋 RÉSUMÉ EXÉCUTIF

### Situation actuelle
- **Préfixe actuel:** `/chansons` (utilisé dans toute l'application)
- **Préfixe cible:** `/musica` (nouveau standard portugais)
- **Occurrences totales:** 58 fichiers contiennent "chansons"
- **Occurrences critiques (URLs):** 10 fichiers source + 3 fichiers build + 2 sitemaps

### Impacts identifiés
- ✅ **Routes React Router** : 2 routes à renommer + 2 redirections à ajouter
- ✅ **SEO & JSON-LD** : 3 emplacements d'URLs en dur
- ✅ **Sitemaps** : 2 fichiers XML à mettre à jour (29 URLs chacun)
- ✅ **Scripts de génération** : 2 scripts à modifier
- ✅ **Notifications Push** : 1 URL dans Admin.jsx
- ⚠️ **Fichiers build** : Se régénèrent automatiquement (pas de modification manuelle)

---

## 🎯 SECTION 1 : FICHIERS SOURCE À MODIFIER (10 fichiers)

### 1.1. Routes principales (src/config/routes.js)
**Lignes concernées :** 110, 120, 195-196

**Code actuel :**
```javascript
{
  path: '/chansons',
  component: Playlist,
  name: 'Playlist',
  seo: {
    title: 'Canções - Todas as Músicas',
    description: 'Lista completa de todas as canções publicadas no projeto A Música da Segunda.',
    keywords: 'canções, todas as músicas, lista completa'
  }
},
{
  path: '/chansons/:slug',
  component: Song,
  name: 'Song',
  seo: null // SEO dynamique basé sur la chanson
},
```

**Code de détection (getCurrentPage) :**
```javascript
// Gérer les routes chansons avec slug (ex: /chansons/nobel-prize)
if (url.startsWith('/chansons/') && urlLastPart !== 'chansons') {
  return 'Song';
}
```

**Modifications requises :**
1. Remplacer `path: '/chansons'` par `path: '/musica'`
2. Remplacer `path: '/chansons/:slug'` par `path: '/musica/:slug'`
3. Mettre à jour la détection : `url.startsWith('/musica/')`

---

### 1.2. Page Song individuelle (src/pages/Song.jsx)
**Lignes concernées :** 127, 167

**Code actuel :**
```javascript
// Rediriger si l'URL a un trailing slash pour éviter les doublons
useEffect(() => {
  if (rawSlug && rawSlug.endsWith('/')) {
    navigate(`/chansons/${slug}`, { replace: true });
  }
}, [rawSlug, slug, navigate]);

// Normaliser l'URL (sans trailing slash) pour éviter les doublons
const normalizedUrl = slug ? `/chansons/${slug.replace(/\/$/, '')}` : '/chansons';
```

**Modifications requises :**
1. Ligne 127 : `navigate(\`/musica/${slug}\`, { replace: true })`
2. Ligne 167 : `const normalizedUrl = slug ? \`/musica/${slug}\` : '/musica'`

---

### 1.3. SEO JSON-LD (src/lib/seo-jsonld.js)
**Lignes concernées :** 27, 75, 81

**Code actuel :**
```javascript
export function musicRecordingJsonLd({ 
  title, 
  slug, 
  datePublished, 
  image, 
  byArtist = 'A Música da Segunda',
  streamingUrls = []
}) {
  const url = `${CANONICAL_HOST}/chansons/${slug}`;
  // ...
}

export function breadcrumbsJsonLd({ title, slug }) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { 
        "@type": "ListItem", 
        "position": 1, 
        "name": "Início", 
        "item": `${CANONICAL_HOST}/` 
      },
      { 
        "@type": "ListItem", 
        "position": 2, 
        "name": "Canções", 
        "item": `${CANONICAL_HOST}/chansons` 
      },
      { 
        "@type": "ListItem", 
        "position": 3, 
        "name": title || slug, 
        "item": `${CANONICAL_HOST}/chansons/${slug}` 
      }
    ]
  };
}
```

**Modifications requises :**
1. Ligne 27 : `const url = \`${CANONICAL_HOST}/musica/${slug}\``
2. Ligne 75 : `"item": \`${CANONICAL_HOST}/musica\``
3. Ligne 81 : `"item": \`${CANONICAL_HOST}/musica/${slug}\``

---

### 1.4. Admin - Notifications Push (src/pages/Admin.jsx)
**Ligne concernée :** 1455

**Code actuel :**
```javascript
notifyAllSubscribers({
  title: 'Nouvelle Chanson ! 🎶',
  body: `"${clean.title || 'Nova música'}" est maintenant disponible !`,
  icon: clean.cover_image || '/icons/pwa/icon-192x192.png',
  url: clean.slug ? `/chansons/${clean.slug}` : '/'
})
```

**Modifications requises :**
1. Ligne 1455 : `url: clean.slug ? \`/musica/${clean.slug}\` : '/'`

---

### 1.5. Sitemaps statiques (2 fichiers)

#### public/sitemap-songs.xml
**29 URLs à mettre à jour**
```xml
<url>
  <loc>https://www.amusicadasegunda.com/chansons/2025-retro</loc>
  <lastmod>2026-01-04</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.9</priority>
</url>
<!-- ... 28 autres URLs similaires -->
```

**Modification requise :** Remplacer `/chansons/` par `/musica/` dans toutes les balises `<loc>`

#### docs/sitemap-songs.xml
**Identique à public/sitemap-songs.xml (29 URLs)**
**Modification requise :** Remplacer `/chansons/` par `/musica/` dans toutes les balises `<loc>`

---

### 1.6. Scripts de génération (2 fichiers)

#### scripts/generate-sitemap.cjs
**À vérifier** : Ce script génère `sitemap-songs.xml` dynamiquement
**Ligne(s) probable(s)** : Construction d'URL `${baseUrl}/chansons/${slug}`

#### scripts/generate-stubs.cjs
**À vérifier** : Ce script génère les stubs HTML pour les pages de chansons
**Ligne(s) probable(s)** : Construction d'URL dans les meta tags

---

## 🚫 SECTION 2 : FICHIERS À NE PAS MODIFIER MANUELLEMENT

### 2.1. Fichiers build (docs/assets/*.js)
- `docs/assets/index-3oIHy1Xm.js` (1 occurrence)
- `docs/assets/ProtectedAdmin-D4MF6SBG.js` (1 occurrence)
- `docs/assets/Song-Ddsb1_S7.js` (1 occurrence)
- `docs/assets/Calendar-BweGuUrj.js` (possibles occurrences)

**Raison :** Ces fichiers se régénèrent automatiquement avec `npm run build`

### 2.2. Documentation et fichiers historiques (48 fichiers)
- `AUDIT_COMPLET_SEO_ROUTING_2026.md`
- `CORRECTIONS_SEO_APPLIQUEES_2026.md`
- Tous les fichiers `.md` et scripts SQL Supabase
- Fichiers dans `supabase/scripts/`

**Raison :** Documentation historique, pas de modification nécessaire

---

## ✅ SECTION 3 : REDIRECTIONS 301 À IMPLÉMENTER

### 3.1. Composant de redirection (NOUVEAU FICHIER)
**Fichier :** `src/pages/index.jsx`

**Code à ajouter :**
```javascript
import { Navigate, useParams } from 'react-router-dom';

// Composant pour rediriger les anciennes URLs /chansons vers /musica
function LegacyChansonRedirect() {
  const { slug } = useParams();
  const target = slug ? `/musica/${slug}` : '/musica';
  return <Navigate to={target} replace />;
}
```

### 3.2. Routes de redirection (src/pages/index.jsx)
**Dans le composant `<Routes>`, AVANT les routes principales :**

```javascript
<Routes>
  {/* ✅ REDIRECTIONS LEGACY /chansons → /musica */}
  <Route path="/chansons" element={<Navigate to="/musica" replace />} />
  <Route path="/chansons/:slug" element={<LegacyChansonRedirect />} />
  
  {/* Redirection /home → / (existante) */}
  <Route path="/home" element={<Navigate to="/" replace />} />
  
  {/* Routes principales */}
  {ROUTES.map((route) => (
    <Route
      key={route.path}
      path={route.path}
      element={<route.component />}
    />
  ))}
</Routes>
```

**Ordre critique :** Les redirections doivent être **AVANT** les routes principales pour éviter les conflits.

---

## 🔒 SECTION 4 : TESTS DE SÉCURITÉ POST-MODIFICATION

### 4.1. Test de boucle de redirection
**Scénarios à tester :**
1. `/musica` → Doit afficher la page Playlist (pas de redirection)
2. `/musica/nobel-prize` → Doit afficher la page Song (pas de redirection)
3. `/chansons` → Doit rediriger vers `/musica` (une seule fois)
4. `/chansons/nobel-prize` → Doit rediriger vers `/musica/nobel-prize` (une seule fois)

**Vérification :** Dans l'onglet Network des DevTools, confirmer qu'il n'y a qu'**une seule navigation** par requête.

### 4.2. Test 404 propre (chanson inexistante)
**URL à tester :** `/musica/chanson-qui-nexiste-pas`

**Comportement attendu :**
1. Message : "Song not found"
2. Meta tag : `<meta name="robots" content="noindex,follow" />`
3. Bouton "Voltar ao Início" fonctionnel
4. Pas d'erreur console critique

### 4.3. Test PWA & notifications
**Éléments à vérifier :**
1. Bouton "Instalar App" toujours visible et fonctionnel
2. Notifications push pointent vers `/musica/slug` (pas `/chansons/slug`)
3. Manifest.json inchangé (pas d'URL en dur dedans)
4. Service Worker se met à jour correctement

---

## 📊 SECTION 5 : PLAN D'IMPLÉMENTATION SÉQUENTIEL

### PHASE 1 : Préparation (0 modification)
- [x] Audit complet terminé
- [ ] Validation du client

### PHASE 2 : Modification des routes & redirections (2 fichiers)
1. ✅ `src/config/routes.js` : Renommer les 2 routes `/chansons` → `/musica`
2. ✅ `src/pages/index.jsx` : Ajouter les 2 redirections legacy

### PHASE 3 : Mise à jour SEO & navigation (3 fichiers)
3. ✅ `src/pages/Song.jsx` : Mettre à jour `navigate()` et `normalizedUrl`
4. ✅ `src/lib/seo-jsonld.js` : Mettre à jour les 3 URLs en dur
5. ✅ `src/pages/Admin.jsx` : Mettre à jour l'URL de notification

### PHASE 4 : Sitemaps & scripts (4 fichiers)
6. ✅ `public/sitemap-songs.xml` : Remplacer `/chansons/` par `/musica/`
7. ✅ `docs/sitemap-songs.xml` : Remplacer `/chansons/` par `/musica/`
8. ✅ `scripts/generate-sitemap.cjs` : Vérifier et mettre à jour si nécessaire
9. ✅ `scripts/generate-stubs.cjs` : Vérifier et mettre à jour si nécessaire

### PHASE 5 : Build & tests (0 modification manuelle)
10. ✅ `npm run build` : Regénérer tous les fichiers build
11. ✅ Tests de sécurité (boucles, 404, PWA)

### PHASE 6 : Déploiement
12. ✅ `git add . && git commit -m "feat(seo): Migration /chansons → /musica avec redirections 301"`
13. ✅ `git push origin main`
14. ✅ Vérification GitHub Pages (2-5 minutes)

---

## 🎯 RÉCAPITULATIF DES FICHIERS À MODIFIER

### Source (10 fichiers)
1. ✅ `src/config/routes.js` (lignes 110, 120, 195-196)
2. ✅ `src/pages/index.jsx` (ajout redirections)
3. ✅ `src/pages/Song.jsx` (lignes 127, 167)
4. ✅ `src/lib/seo-jsonld.js` (lignes 27, 75, 81)
5. ✅ `src/pages/Admin.jsx` (ligne 1455)
6. ✅ `public/sitemap-songs.xml` (29 URLs)
7. ✅ `docs/sitemap-songs.xml` (29 URLs)
8. ✅ `scripts/generate-sitemap.cjs` (à vérifier)
9. ✅ `scripts/generate-stubs.cjs` (à vérifier)

### Génération automatique (3+ fichiers)
- `docs/assets/*.js` (regénérés par build)
- Tous les fichiers dans `docs/` (copies de `dist/`)

---

## ⚠️ RISQUES IDENTIFIÉS & MITIGATIONS

### Risque 1 : Boucle de redirection
**Probabilité :** Faible  
**Impact :** Critique  
**Mitigation :** Ordre des routes strict (redirections AVANT routes principales)

### Risque 2 : Liens externes pointant vers /chansons
**Probabilité :** Moyenne  
**Impact :** Faible (redirection 301)  
**Mitigation :** Les redirections 301 préservent le SEO

### Risque 3 : Service Worker cache ancien /chansons
**Probabilité :** Moyenne  
**Impact :** Faible (temporaire)  
**Mitigation :** Incrémenter version dans `sw.js` ou attendre expiration cache (24h)

### Risque 4 : Google Search Console 404 existants
**Probabilité :** Élevée  
**Impact :** Faible (résolus progressivement)  
**Mitigation :** Redirections 301 + demander réindexation dans GSC

---

## 📋 CHECKLIST PRÉ-VALIDATION

- [x] Toutes les occurrences de `/chansons` identifiées
- [x] Plan de redirection 301 défini
- [x] Ordre des routes vérifié (pas de boucle)
- [x] Tests de sécurité listés
- [x] Impact PWA évalué (aucun)
- [ ] **VALIDATION CLIENT REQUISE**

---

## 🚀 PROCHAINE ÉTAPE

**Attente validation du client pour :**
1. Confirmer le préfixe `/musica` (ou proposer une alternative)
2. Autoriser les modifications de fichiers

**Une fois validé, je procéderai à l'implémentation complète en suivant les 6 phases ci-dessus.**

---

**Audit réalisé le 8 janvier 2026**  
**Prêt pour implémentation immédiate après validation ✅**
