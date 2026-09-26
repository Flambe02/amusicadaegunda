# 📊 Guide de Test de Performance - Música da Segunda

## 🚨 Problème actuel : Pas de données CrUX

Le [rapport PageSpeed Insights](https://pagespeed.web.dev/analysis/https-www-amusicadasegunda-com/noksm3tglh?form_factor=mobile) montre :

> **"The Chrome User Experience Report does not have sufficient real-world speed data for this page."**

**Raison :** Le site n'a pas encore assez de trafic réel pour collecter des métriques CrUX (Chrome User Experience Report).

---

## ✅ Solutions de test alternatives

### 1. 🔬 Lighthouse en local (DevTools)

**Le plus rapide et le plus complet**

#### Dans Chrome DevTools :

1. Ouvrir Chrome sur https://www.amusicadasegunda.com
2. Appuyer sur `F12` (DevTools)
3. Aller dans l'onglet **"Lighthouse"**
4. Sélectionner :
   - ✅ Performance
   - ✅ Progressive Web App
   - ✅ Best Practices
   - ✅ Accessibility
   - ✅ SEO
5. Mode : **Mobile** (par défaut)
6. Cliquer sur **"Analyze page load"**

#### Métriques à surveiller :

| Métrique | Cible | Description |
|----------|-------|-------------|
| **FCP** (First Contentful Paint) | < 1.8s | Première peinture |
| **LCP** (Largest Contentful Paint) | < 2.5s | Plus grand élément visible |
| **TBT** (Total Blocking Time) | < 200ms | Temps de blocage |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Stabilité visuelle |
| **Speed Index** | < 3.4s | Vitesse de rendu |

---

### 2. 🌐 WebPageTest.org

**Test le plus détaillé avec simulation de connexion**

#### URL : https://www.webpagetest.org/

1. Aller sur [WebPageTest](https://www.webpagetest.org/)
2. Entrer l'URL : `https://www.amusicadasegunda.com`
3. Configuration recommandée :
   - **Test Location** : Sao Paulo, Brazil (le plus proche de vos utilisateurs)
   - **Browser** : Chrome (Mobile)
   - **Connection** : 4G (ou 3G pour tester le pire cas)
4. **Advanced Settings** :
   - Number of Tests : 3 (pour la moyenne)
   - Repeat View : Yes
   - Capture Video : Yes
5. Cliquer sur **"Start Test"**

#### Ce que vous obtiendrez :

- ⏱️ **Waterfall chart** : Ordre de chargement des ressources
- 📊 **Filmstrip** : Captures d'écran du chargement
- 📈 **Metrics** : FCP, LCP, Speed Index, etc.
- 🎥 **Video** : Vidéo du chargement
- 📋 **Recommendations** : Suggestions d'optimisation

---

### 3. 🔥 GTmetrix

**Test simple et rapide avec recommandations**

#### URL : https://gtmetrix.com/

1. Aller sur [GTmetrix](https://gtmetrix.com/)
2. Entrer l'URL : `https://www.amusicadasegunda.com`
3. Options (gratuit) :
   - Location : São Paulo (si disponible)
   - Browser : Chrome
   - Device : Mobile
4. Cliquer sur **"Test your site"**

#### Résultats :

- **Performance Score** (0-100)
- **Structure Score** (0-100)
- **Web Vitals** : LCP, TBT, CLS
- **Waterfall Chart**
- **Recommendations** détaillées

---

### 4. 📱 Chrome DevTools - Network Throttling

**Simuler une connexion lente**

1. Ouvrir DevTools (`F12`)
2. Onglet **"Network"**
3. Dans le dropdown "No throttling", choisir :
   - **Slow 3G** (très lent, test extrême)
   - **Fast 3G** (connexion mobile typique)
   - **4G** (bonne connexion mobile)
4. Recharger la page (`Ctrl + Shift + R`)
5. Observer :
   - **DOMContentLoaded** (ligne bleue)
   - **Load** (ligne rouge)
   - **Finish** (temps total)

---

### 5. 🚀 Lighthouse CI (Automatisé)

**Intégrer dans GitHub Actions**

#### Créer `.github/workflows/lighthouse.yml` :

```yaml
name: Lighthouse CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            https://www.amusicadasegunda.com
            https://www.amusicadasegunda.com/playlist
            https://www.amusicadasegunda.com/sobre
          uploadArtifacts: true
          temporaryPublicStorage: true
```

---

## 📊 Métriques attendues pour votre PWA

### Core Web Vitals (cibles Google)

| Métrique | Bon | Moyen | Mauvais |
|----------|-----|-------|---------|
| **LCP** | < 2.5s | 2.5-4.0s | > 4.0s |
| **FID** | < 100ms | 100-300ms | > 300ms |
| **CLS** | < 0.1 | 0.1-0.25 | > 0.25 |

### PWA Score (cible : 100%)

- ✅ Service Worker enregistré
- ✅ Manifest valide
- ✅ HTTPS
- ✅ Icônes conformes
- ✅ Offline fallback

### Performance Score (cible : 90+)

Votre site utilise **Vite** qui est déjà très optimisé :
- Code splitting automatique
- Tree shaking
- Minification
- Gzip compression (GitHub Pages)

---

## 🎯 Optimisations déjà en place

✅ **Service Worker** avec cache strategies  
✅ **Lazy loading** (React.lazy)  
✅ **Code splitting** (Vite)  
✅ **Images optimisées** (`scripts/optimize-images.cjs`)  
✅ **Web Vitals monitoring** (`src/analytics/webvitals.js`)  
✅ **Preload/Prefetch** (Vite)  
✅ **Cache-Control headers** (GitHub Pages)  

---

## 🔍 Quand les données CrUX seront disponibles ?

Le **Chrome User Experience Report** nécessite :

1. **Volume** : Minimum ~1000 visites/mois
2. **Durée** : Au moins 28 jours de collecte
3. **Navigateur** : Utilisateurs Chrome avec rapport activé
4. **Domaine** : Enregistré dans la base CrUX

### Pour accélérer :

1. 📈 **Augmenter le trafic** :
   - Partager sur réseaux sociaux
   - SEO (déjà bien optimisé)
   - Ads (Google/Facebook)

2. 🔗 **Soumettre à Google** :
   - Google Search Console : [https://search.google.com/search-console](https://search.google.com/search-console)
   - Ajouter votre site
   - Soumettre le sitemap : `https://www.amusicadasegunda.com/sitemap.xml`

3. ⏰ **Patience** :
   - Attendre 28+ jours
   - Vérifier régulièrement PageSpeed Insights

---

## 🧪 Test immédiat recommandé

### Option la plus rapide : Lighthouse DevTools

1. Ouvrir https://www.amusicadasegunda.com dans Chrome
2. `F12` → Onglet **"Lighthouse"**
3. Sélectionner **"Mobile"** + tous les audits
4. **"Analyze page load"**
5. **Copier le rapport** et me le partager

### Expected results (estimation) :

Basé sur votre stack technique (Vite + React + Service Worker), vous devriez obtenir :

- **Performance** : 85-95/100
- **PWA** : 95-100/100
- **Best Practices** : 90-100/100
- **Accessibility** : 85-95/100
- **SEO** : 95-100/100

---

## 📞 Prochaines étapes

1. ✅ **Maintenant** : Lancer un test Lighthouse en local (2 minutes)
2. ✅ **Aujourd'hui** : Test WebPageTest.org avec 3G/4G
3. ✅ **Cette semaine** : Soumettre le site à Google Search Console
4. ⏰ **Dans 30 jours** : Vérifier si les données CrUX sont disponibles

---

**Date :** 10 novembre 2025  
**Site :** https://www.amusicadasegunda.com  
**Status :** ✅ Site fonctionnel, en attente de données CrUX

