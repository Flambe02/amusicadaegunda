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

