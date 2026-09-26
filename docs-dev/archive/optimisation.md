# Optimisation React / PWA / SEO technique

Date de synthese: 11 mars 2026

## Conclusions precedentes conservees

### Audit React / PWA du code

- `src/pages/Home.jsx` monte encore un ancien sous-arbre desktop masque par CSS. Il ne s'affiche pas, mais React le rend quand meme et il alourdit le chunk initial.
- L'enregistrement du service worker est duplique entre `src/hooks/usePWAInstall.js`, `src/hooks/useServiceWorker.js` et `src/lib/push.js`. Le cycle d'update est donc fragile.
- `navigator.serviceWorker.ready` est utilise dans `src/lib/push.js` comme s'il pouvait echouer rapidement, alors qu'il peut surtout rester en attente sans fin.
- `src/components/OfflineIndicator.jsx` laisse des `setTimeout` non nettoyes.
- `src/App.jsx` lance encore une migration legacy au boot via `src/lib/migration.js`.

### Build observe avant optimisation

- `assets/vendor-ui` autour de 311 kB
- `assets/vendor-react` autour de 191 kB
- `assets/index` autour de 150 kB
- `assets/index.css` autour de 128 kB

## Constats Pagespeed mobile fournis

Source: captures Google PageSpeed Insights du 11 mars 2026.

- Score mobile: 71
- FCP: 2,6 s
- LCP: 26,9 s
- TBT: 100 ms
- CLS: 0

### Causes principales visibles

- Images critiques beaucoup trop lourdes:
  - `/images/Caipivara_square.png` environ 1,77 Mo
  - `/images/2026 logo.png` environ 1,55 Mo
- Plusieurs de ces grosses images sont utilisees dans des zones affichees en petit format.
- Trop de hints reseau (`preconnect`) et plusieurs sont inutiles au rendu initial.
- CSS initial encore bloquant.
- JavaScript non utilise et temps CPU notables sur `vendor-react`, `vendor-ui`, GTM.
- LCP mobile detecte sur un visuel video/YouTube qui n'est pas visible dans le document HTML initial.
- Charge utile reseau totale proche de 9 Mo, majoritairement a cause des images.

## Plan d'action priorise

### Priorite 1

- Remplacer les PNG de marque surdimensionnes par des variantes WebP adaptees aux tailles reelles d'affichage.
- Supprimer les `preconnect` et `preload` non critiques du document initial.
- Supprimer le sous-arbre desktop legacy masque dans `Home.jsx`.

### Priorite 2

- Unifier la registration du service worker.
- Revoir le chargement de GTM / Metricool et ne conserver que le strict necessaire.
- Reduire les images de facade YouTube et les fallback locaux pour mobile.

### Priorite 3

- Sortir les boites de dialogue et panneaux non critiques du chunk initial.
- Nettoyer les timeouts et migrations legacy dans le chemin de demarrage.
- Reevaluer la strategie de cache en production si l'hebergement continue a servir un TTL de 10 minutes.

## Actions deja lancees dans ce lot

- Documentation d'audit et du plan d'optimisation centralisee ici.
- Preparation d'une generation automatique de variantes WebP de marque.
- Remplacement des references les plus couteuses par des assets plus petits.
- Nettoyage du `head` pour reduire les connexions et telechargements inutiles au premier rendu.
- Suppression du layout desktop legacy masque dans `Home.jsx`.
