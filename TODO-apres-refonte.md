# TODO — chantiers séparés, après la refonte mobile

Chantiers repérés pendant la refonte mobile (branche `feat/mobile-redesign`), volontairement laissés de côté pour ne pas mélanger les sujets. Aucun n'est à traiter pendant les étapes de la refonte.

## 1. Opacités Tailwind qui ne génèrent aucun CSS

Voir [`TODO-tailwind-opacity.md`](TODO-tailwind-opacity.md) : pas d'opacité hors de l'échelle de Tailwind 3 (multiples de 5), liste par fichier et options de correction.

## 2. Relire l'URL stockée par `404.html` (routes sans stub)

**Constat (2026-09-25, étape 8).** Sur GitHub Pages, une URL sans stub HTML passe par `public/404.html`. Ce fichier range l'URL demandée dans `sessionStorage.redirect`, puis renvoie vers `/`. **Aucun code de l'application ne relit cette valeur** : un rechargement, une PWA rouverte ou un lien partagé vers une route sans stub atterrit sur l'Início au lieu de la page demandée.

**Contournement en place.** Les routes qui en ont besoin reçoivent un stub `noindex` (`/search`, `/festa`, et depuis l'étape 8 `/catalogo`).

**Chantier.** Au démarrage de l'app (avant le premier rendu du routeur, par ex. dans `src/main.jsx`), lire `sessionStorage.redirect`, le supprimer, et remplacer l'URL courante par ce chemin (`history.replaceState`) pour que React Router ouvre la bonne route. À vérifier :
- ne pas relire une redirection périmée (la supprimer aussitôt lue) ;
- ne pas rediriger vers une URL d'un autre domaine (ne garder que `pathname + search + hash`) ;
- les routes `/chansons/…` gardent leur redirection 301-simulée actuelle dans `404.html` ;
- la page reste servie avec un **statut 404** par GitHub Pages : acceptable pour des routes non indexées, pas pour une page qui doit être indexée (celle-là a besoin d'un stub).

## 3. Code mort `push-api/`

Service Vercel de notifications push jamais branché (voir la mémoire projet « dead code backlog »). À supprimer sur demande seulement, après vérification qu'aucune route ni variable d'environnement ne s'en sert.

## 4. La Roda desktop et son lecteur

`src/pages/RodaDaSegunda.jsx` joue la musique par un iframe YouTube invisible piloté par `postMessage`, créé **après** l'arrêt de la roue (4,2 s après le clic) : sur iOS le son ne part pas (repli « Pausado » au bout de 1,5 s) et aucune progression n'est lisible. Le Catálogo mobile utilise désormais le lecteur commun (`useShortPlayer`, option `loop: false`, `loadNow`). Chantier possible : faire passer la Roda desktop sur ce même lecteur. Elle est volontairement inchangée pendant la refonte (interdit desktop).

## 5. Clip `caipivara-samba` (et `flip`) à ré-exporter

Ils ne finissent pas dans la pose de repos : le raccord avec la boucle `caipivara-idle` est adouci par un fondu d'environ 400 ms mais reste perceptible. Solution propre : ré-exporter les clips pour qu'ils finissent dans la pose de repos (originaux dans `design/caipivara/source/`), puis revenir au fondu court de 150 ms.

## 6. Jeton d'ombre `Nav` et classe `shadow-app-nav`

La barre mobile n'a plus d'ombre depuis la barre façon TikTok. Le jeton `Nav` (`0 -12px 32px rgba(0,0,0,0.32)`) est gardé dans `DESIGN.md`. Vérifier s'il sert encore ailleurs, sinon le retirer (Tailwind + DESIGN.md + `.impeccable/design.json`).

## 7. Hook husky obsolète

Chaque commit affiche « husky - DEPRECATED » : retirer les deux lignes `#!/usr/bin/env sh` et `. "$(dirname -- "$0")/_/husky.sh"` de `.husky/pre-commit` avant le passage à husky v10.

## 8. Fins de ligne LF / CRLF

Git avertit à chaque commit que les fichiers en LF seront convertis en CRLF. Ajouter un `.gitattributes` (`* text=auto eol=lf`, sauf fichiers Windows) pour stabiliser, dans un commit isolé (il touche potentiellement beaucoup de fichiers).

## 9. Android App Links

Renseigner l'empreinte SHA-256 de la clé de signature Play dans `assetlinks.json` (ancien reste à faire, hors refonte).

## 10. Les toasts du site ne se ferment pas seuls

**Constat (2026-09-25).** Le composant `Toast` (`src/components/ui/toast.jsx`) est une simple `div` : il ignore `duration`, et `use-toast.jsx` ne retire un toast fermé qu'après `TOAST_REMOVE_DELAY` (≈ 16 min). Chaque appel à `toast()` reste donc à l'écran jusqu'à fermeture manuelle, et plusieurs appels s'empilent.

**Déjà corrigé :** le `Toaster` n'affiche plus les toasts fermés (`open: false`) ; « Link copiado » (Compartilhar) remplace le précédent et se ferme seul après 3 s (`useShareSong.jsx`).

**Chantier.** Faire respecter `duration` pour tous les toasts (fermeture automatique, par ex. dans `Toaster` ou dans `toast()`), avec une durée par défaut raisonnable, et vérifier chaque appel existant (admin compris).

## 11. PWA hors connexion, niveau 1

**Objectif.** Que l'app s'ouvre et reste utile sans réseau, sans jamais afficher d'écran cassé ni vide.

- **Application** : garder en cache les écrans, icônes, polices système et assets Caipivara (image, posters, boucles vidéo) pour qu'elle s'ouvre hors ligne.
- **Catalogue** : garder en cache titres, mois, thèmes et les miniatures déjà affichées.
- **Textes** : garder en cache les paroles publiées et les textes História des chansons consultées, lisibles hors ligne (Letra, História, Aprender).
- **Écran « Sem conexão »** propre, avec la Caipivara, là où le réseau est indispensable (feed vidéo, écoute, karaokê).

**Garde-fous.**
- Pas de cache des vidéos ni de l'audio YouTube (interdit par YouTube, impossible avec le lecteur intégré).
- Ne jamais mettre en cache de paroles non publiées (`isKaraokePublished`, statut `published`).
- Limites de stockage d'iOS pour les PWA (quota réduit, purge possible).
- **Vérifier d'abord le service worker existant** (notifications push, mise à jour de l'app) pour ne pas le casser — voir aussi la panne du 2026-07-29 (le SW avortait les requêtes Supabase en vol).

## 12. Restyle mobile de la page `/musica` (à faire, pas commencé)

**Objectif.** Mettre la page `/musica` (le catalogue complet, atteint depuis le Menu « Catálogo — Todas as músicas, semana a semana ») au niveau des nouveaux écrans mobiles : fond Stage Black, un seul jaune par zone, vignettes 9:16 de la grille de recherche (`TileImage`), pas de défilement horizontal, cibles ≥ 44 px.

**Garde-fous.** Sous 768 px seulement ; desktop identique à `feat/homepage-desktop`. La page est indexée : tout changement de contenu se fait aussi dans les stubs (`generate-stubs.cjs`), sans régression SEO.

## 13. Bannière « Instalar no iPhone » au-dessus des contrôles

**Constat (nuit du 2026-09-26).** Pour un nouveau visiteur sur iPhone, `InstallAppBanner.jsx` (fixe, 88 px au-dessus du bas, `z-[120]`) recouvre le bas des écrans mobiles — la barre de progression et les boutons du Catálogo par exemple — jusqu'à ce qu'on la ferme. Le lecteur karaokê mobile (`z-[150]`) passe au-dessus. Son texte parle encore de `beforeinstallprompt`, jargon technique.

**Corrigé (2026-09-26, décision 4 validée).** Sous 768 px, la bannière se pose juste au-dessus de la barre du bas (`--app-nav-h`). Elle est masquée tant qu'un écran à contrôles est affiché : feed et calque Ouvir, Catálogo, O Palco et son lecteur (règle `body:has(...)` dans `index.css`). Tablette et desktop sont inchangés.

**Reste à faire.** Réécrire son texte en portugais simple (il parle encore de `beforeinstallprompt`).

## 14. Accueil mobile : performance Lighthouse et décalage (CLS)

**Constat (vérification finale, nuit du 2026-09-26).** Lighthouse mobile en local, builds de production, 3 mesures chacun :

| Page | Build | Performance | Accessibilité | SEO |
|---|---|---|---|---|
| Accueil | HEAD | 38 à 49 | 100 | 100 |
| Accueil | `main` | 45 à 59 | 99 | 100 |
| `/karaoke` | HEAD | 48 à 59 | 100 | 100 |
| `/karaoke` | `main` | 57 à 63 | 100 | 100 |

- **Poids** : le lecteur YouTube et le Short qui démarre seul (≈ 1,4 Mo) expliquent l'essentiel de l'écart. C'est le choix produit du feed ; l'iframe arrive bien après le premier rendu, comme le veut la spec.
- **LCP (miniature du Short)** : elle n'est découverte qu'après le JS et les données (≈ 5 s de délai de chargement, contre 2,5 s sur `main`). Piste : précharger la miniature `oar2` de la chanson de la semaine dans le HTML statique de l'accueil (`generate-stubs.cjs`, calculée au build).
- **CLS de 0,32 sur l'accueil**, dans la plupart des mesures, jamais sur `main`. Attribué d'abord à la diapositive voisine hors champ (remise en page au chargement de la police Roboto), puis à `<body>` une fois la voisine cachée. Le masquage n'a rien changé et a été annulé. Non reproduit hors Lighthouse (Playwright, même profil Android, avec ou sans bridage). À analyser avec une trace Performance de Chrome.

## 15. Restyle mobile du lecteur karaokê ouvert depuis la page d'une chanson

**Constat (décision 5 validée, 2026-09-26).** Le style de l'étape 7 (prop `mobileShell` de `KaraokePlayer`) n'est appliqué qu'au lecteur ouvert depuis O Palco. Ouvert depuis `/musica/<slug>` sur mobile, le lecteur garde l'ancien style plein écran : titre néon, faisceaux violets, cinq boutons, barre du bas masquée.

**Chantier.** Passer `mobileShell` depuis la copie mobile de la page chanson (`src/pages/Song.jsx`, seulement sous 768 px, jamais sur la copie desktop). Vérifier l'onglet actif de la barre du bas (la pastille Catálogo s'allume sur les pages chanson), l'absence de défilement à 375 × 667, et que le desktop reste identique.
