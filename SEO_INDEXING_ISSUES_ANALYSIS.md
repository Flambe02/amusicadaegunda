# 🔍 Analyse des Problèmes d'Indexation - Google Search Console

**Date:** 2026-01-18  
**Source:** Google Search Console - Page indexing report

---

## 📊 Résumé Exécutif

| Problème | Source | Validation | Pages | Priorité |
|----------|--------|------------|-------|----------|
| Not found (404) | Website | ❌ Failed | 68 | 🔴 CRITIQUE |
| Alternate page with proper canonical tag | Website | ❌ Failed | 2 | 🟠 IMPORTANT |
| Discovered - currently not indexed | Google systems | ⏸️ Not Started | 55 | 🟡 MODÉRÉ |
| Redirect error | Website | ⏳ Started | 6 | 🟠 IMPORTANT |
| Page with redirect | Website | ⏳ Started | 4 | 🟢 EN COURS |
| Soft 404 | Website | ⏳ Started | 1 | 🟡 MODÉRÉ |
| Crawled - currently not indexed | Google systems | ✅ Passed | 0 | ✅ OK |

**Total pages non indexées:** 136

---

## 🔴 PROBLÈME 1: Not found (404) - 68 pages

### Analyse
- **Validation:** Échouée (Started: 1/12/26, Failed: 1/17/26)
- **Exemple identifié:** `https://www.amusicadasegunda.com/home/` (Last crawled: Jan 16, 2026)
- **Cause probable:**
  1. URLs avec trailing slash (`/home/`) qui ne sont pas gérées par React Router
  2. Anciennes URLs legacy qui n'existent plus
  3. URLs générées par erreur dans les sitemaps précédents

### Solutions

#### ✅ Solution 1: Créer un stub HTML pour `/home/`
**Fichier:** `docs/home/index.html` (ou `public/home/index.html`)

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=https://www.amusicadasegunda.com/">
  <link rel="canonical" href="https://www.amusicadasegunda.com/">
  <title>Redirection - A Música da Segunda</title>
</head>
<body>
  <p>Redirection en cours vers <a href="/">la page d'accueil</a>...</p>
</body>
</html>
```

#### ✅ Solution 2: Vérifier les autres URLs 404
- Exporter la liste complète depuis Google Search Console
- Identifier les patterns communs
- Créer des stubs ou redirections appropriées

---

## 🟠 PROBLÈME 2: Alternate page with proper canonical tag - 2 pages

### Analyse
- **Validation:** Échouée (Started: 1/8/26, Failed: 1/17/26)
- **Exemple identifié:** `https://www.amusicadasegunda.com/chansons/check-in-da-cop/` (Last crawled: Oct 23, 2025)
- **Cause:** Google voit encore les anciennes URLs `/chansons/` malgré les redirections 301

### Solutions

#### ✅ Solution 1: Vérifier que les redirections fonctionnent côté serveur
**Fichier:** `public/404.html` (déjà présent ✅)

Le fichier `public/404.html` contient déjà une redirection JavaScript pour `/chansons/`, mais Google préfère les redirections HTTP 301.

#### ✅ Solution 2: Créer des stubs HTML pour les anciennes URLs `/chansons/`
**Fichier:** `docs/chansons/[slug]/index.html` (généré automatiquement)

Le script `generate-stubs.cjs` génère déjà des stubs pour `/musica/`, mais pas pour `/chansons/`.

**Action:** Modifier `scripts/generate-stubs.cjs` pour générer aussi des stubs `/chansons/[slug]/index.html` avec redirection 301.

---

## 🟡 PROBLÈME 3: Discovered - currently not indexed - 55 pages

### Analyse
- **Validation:** Non démarrée
- **Pattern:** Toutes les URLs contiennent des hash (`#/musica/...`)
- **Exemples:**
  - `https://www.amusicadasegunda.com/#/musica/2025-retro/`
  - `https://www.amusicadasegunda.com/#/musica/50-por-cento/`
  - ... (55 au total)
- **Cause:** Google découvre encore ces URLs avec hash, probablement via:
  1. **Anciens sitemaps dans le cache de Google** (même si supprimés de GSC)
  2. **Backlinks externes** pointant vers des URLs avec hash
  3. **Liens internes** (mais aucun trouvé dans le code source ✅)

### Solutions

#### ✅ Solution 1: Demander à Google de supprimer les anciennes URLs
1. Aller dans Google Search Console → **Removals**
2. Demander la suppression temporaire des URLs avec hash
3. Attendre la confirmation

#### ✅ Solution 2: Créer un fichier `robots.txt` pour bloquer les URLs avec hash
**Fichier:** `public/robots.txt` (à vérifier)

Ajouter:
```
# Bloquer les URLs avec hash (non indexables)
Disallow: /#/
```

#### ✅ Solution 3: Vérifier les backlinks externes
- Utiliser un outil comme Ahrefs ou SEMrush
- Identifier les sites qui pointent vers des URLs avec hash
- Contacter les propriétaires pour mettre à jour les liens

---

## 🟠 PROBLÈME 4: Redirect error - 6 pages

### Analyse
- **Validation:** En cours (Started)
- **Cause:** Probablement des erreurs de redirection (boucles, redirections incorrectes)

### Solutions

#### ✅ Solution 1: Exporter la liste depuis Google Search Console
- Identifier les 6 URLs concernées
- Tester chaque URL manuellement
- Corriger les redirections problématiques

#### ✅ Solution 2: Vérifier les redirections dans le code
**Fichier:** `src/pages/index.jsx`

Les redirections suivantes sont déjà en place:
- `/chansons` → `/musica` ✅
- `/chansons/:slug` → `/musica/:slug` ✅
- `/home` → `/` ✅

**Action:** Vérifier qu'il n'y a pas de boucles de redirection.

---

## 🟡 PROBLÈME 5: Soft 404 - 1 page

### Analyse
- **Validation:** En cours (Started)
- **Cause:** Page qui retourne un contenu vide ou erreur sans code HTTP 404

### Solutions

#### ✅ Solution 1: Identifier la page concernée
- Exporter la liste depuis Google Search Console
- Tester l'URL manuellement
- Corriger le contenu ou retourner un vrai 404

---

## ✅ PROBLÈME 6: Crawled - currently not indexed - 0 pages

**Status:** ✅ Aucun problème - Toutes les pages crawlees sont indexées ou en cours d'indexation.

---

## 🎯 Plan d'Action Priorisé

### 🔴 URGENT (Cette semaine)
1. **Créer stub `/home/index.html`** avec redirection 301
2. **Exporter et analyser les 68 URLs 404** depuis GSC
3. **Créer stubs pour les anciennes URLs `/chansons/`** avec redirection 301

### 🟠 IMPORTANT (Cette semaine)
4. **Exporter et analyser les 6 erreurs de redirection**
5. **Vérifier les redirections dans le code** pour éviter les boucles
6. **Identifier et corriger le Soft 404**

### 🟡 MODÉRÉ (Ce mois)
7. **Demander suppression des URLs avec hash** dans GSC Removals
8. **Ajouter `Disallow: /#/` dans robots.txt**
9. **Vérifier les backlinks externes** pointant vers des URLs avec hash

---

## 📝 Notes Techniques

### Redirections 301 vs JavaScript
- ✅ **Recommandé:** Redirections HTTP 301 (côté serveur)
- ⚠️ **Acceptable:** Redirections JavaScript (pour GitHub Pages)
- ❌ **À éviter:** Meta refresh (moins bien compris par Google)

### Stubs HTML pour GitHub Pages
GitHub Pages ne supporte pas les redirections HTTP 301 natives. Les solutions sont:
1. **Stubs HTML avec redirection JavaScript** (actuel)
2. **Stubs HTML avec meta refresh** (moins optimal)
3. **Utiliser un service de redirection externe** (Cloudflare, Netlify)

### Cache de Google
- Les anciens sitemaps peuvent rester dans le cache de Google pendant plusieurs semaines
- Les URLs avec hash découvertes peuvent persister même après suppression du sitemap
- La solution: patience + demandes de suppression dans GSC

---

## 🔗 Références

- [Google Search Console - Page indexing](https://search.google.com/search-console)
- [Google - Remove outdated content](https://support.google.com/webmasters/answer/9689846)
- [GitHub Pages - Custom 404 pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site)
