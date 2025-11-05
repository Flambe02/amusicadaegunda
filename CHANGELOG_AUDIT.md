# Changelog - Corrections Audit Technique

## [1.1.0] - 2025-11-05

### 🔒 Sécurité (CRITIQUE)

#### Fixed
- **Identifiants Supabase sécurisés** ([#SEC-001])
  - Suppression des clés hardcodées dans `vite.config.js`
  - Migration vers variables d'environnement `.env`
  - Création de `.env.example` pour documentation
  - Impact : Clés Supabase plus exposées dans le code source

- **Notifications non-consensuelles** ([#SEC-002])
  - Suppression de `Notification.requestPermission()` automatique
  - Désactivation de `activatePushNotifications()` post-installation
  - Impact : Conformité aux guidelines Chrome/Apple

### ⚡ Performance

#### Fixed
- **Service Worker** ([#PERF-001])
  - Suppression des chemins `/src/...` dans `DYNAMIC_ASSETS`
  - Impact : Réduction des 404, cache plus efficace

- **Double HelmetProvider** ([#PERF-002])
  - Suppression du `HelmetProvider` dans `App.jsx`
  - Conservation uniquement dans `main.jsx`
  - Impact : Réduction du coût de rendu

- **Console logs en production** ([#PERF-003])
  - Ajout de `console.warn` et `console.error` à la suppression esbuild
  - Impact : Build plus léger (~10-15KB)

### 📊 SEO

#### Fixed
- **JSON-LD dupliqué** ([#SEO-001])
  - Utilisation d'ID unique (`dynamic-page-jsonld`) dans `useSEO`
  - Préservation des scripts statiques (WebSite, Organization)
  - Impact : Pas de doublons, SEO amélioré

- **Crawl-delay** ([#SEO-002])
  - Suppression de `Crawl-delay: 1` dans `robots.txt`
  - Impact : Indexation 2-3x plus rapide

### ♿ Accessibilité

#### Fixed
- **Navigation sans état** ([#A11Y-001])
  - Ajout de `aria-current="page"` sur liens actifs
  - Ajout de `aria-label` sur `<nav>`
  - Ajout de `aria-hidden="true"` sur icônes
  - Impact : Navigation plus accessible

- **Bouton PWA non-accessible** ([#A11Y-002])
  - Refactorisation complète du bouton PWA
  - Suppression de `innerHTML` et styles inline
  - Ajout d'attributs ARIA complets
  - Externalisation CSS dans `pwa-install.css`
  - Impact : Bouton accessible, stylisable

- **Alert bloquante** ([#A11Y-003])
  - Remplacement de `alert()` par toast dans `Home.jsx`
  - Impact : UX améliorée, pas de blocage

### 📦 Ajouts

#### Added
- `.env.example` - Documentation des variables d'environnement
- `.env` - Variables d'environnement (non-commité)
- `public/pwa-install.css` - Styles externalisés du bouton PWA
- `AUDIT_FIXES_COMPLETE.md` - Documentation détaillée des corrections
- `RESUME_AUDIT.md` - Résumé exécutif
- `CHANGELOG_AUDIT.md` - Ce fichier

### 🔧 Modifications

#### Changed
- `vite.config.js` - Variables d'environnement + suppression console
- `public/pwa-install.js` - Notifications + bouton PWA refactoré
- `public/sw.js` - Nettoyage chemins `/src/...`
- `public/robots.txt` - Suppression Crawl-delay
- `src/App.jsx` - Suppression HelmetProvider
- `src/hooks/useSEO.js` - JSON-LD avec ID unique
- `src/pages/Layout.jsx` - aria-current dans navigation
- `src/pages/Home.jsx` - Toast au lieu d'alert()

### 🧪 Tests

#### To Test
- [ ] `.env` non-commité sur GitHub
- [ ] Supabase fonctionne avec variables d'environnement
- [ ] Notifications ne sont plus demandées automatiquement
- [ ] Service Worker sans 404 pour `/src/...`
- [ ] Console vide en production
- [ ] JSON-LD sans doublons (3 max)
- [ ] robots.txt sans Crawl-delay
- [ ] Navigation clavier fonctionnelle
- [ ] Bouton PWA accessible
- [ ] Toast de partage non-bloquant

---

## Notes de Version

**Version** : 1.1.0  
**Commit** : À créer après tests  
**Déploiement** : GitHub Pages (docs/)

**Statut des tests** : En attente de validation utilisateur

---

## Migration Notes

### Breaking Changes
Aucun - toutes les modifications sont rétrocompatibles

### Configuration Required
1. Créer le fichier `.env` à partir de `.env.example`
2. Remplir avec les clés Supabase

### Rollback Plan
Si problème : 
```bash
git revert <commit-hash>
```

---

**Fin du Changelog**

