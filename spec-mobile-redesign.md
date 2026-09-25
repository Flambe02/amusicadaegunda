# Spec — Refonte mobile (Início, Karaokê, Pesquisa, Roda, Menu)

Branche : `feat/mobile-redesign`
Références obligatoires : `PRODUCT.md`, `DESIGN.md`, maquettes validées (canvas « A Música da Segunda — Mobile Caipivara »).
Méthode : une étape à la fois. Chaque étape se termine par un rapport et s'arrête. Aucune étape n'est exécutée par anticipation.

---

## 1. Périmètre

**Inclus (viewport < 768 px uniquement) :**
- Início : feed plein écran façon TikTok autour du Short de la semaine.
- Karaokê : liste + restyle visuel de l'écran de lecture.
- Pesquisa, Roda, Menu : refonte visuelle et UX.
- Assets Caipivara (image détourée + deux boucles vidéo).

**Interdit :**
- Toucher au rendu desktop et tablette (≥ 768 px) ou à l'interface Android TV.
- Modifier le moteur de synchro LRC ou la logique karaoké (lecture seule autorisée).
- Modifier la structure des tables Supabase (lecture seule dans cette spec).
- Écrire un nombre de musiques en dur, où que ce soit.
- Afficher un état vide (« Nenhuma música », « não disponível », bloc vide, placeholder).
- Nommer un média dans les manchetes.

---

## 2. Fichiers à analyser avant toute modification

- Shell mobile : layout `100svh`, `#mobile-scroll`, header mobile 52 px, bottom nav 5 items.
- Composants actuels de la home mobile, du karaoké, de la recherche, de la Roda et du menu.
- La fonction isolée de lecture des URLs YouTube (inversion `youtube_music_url` = Short / `youtube_url` = YouTube Music). **Toujours passer par elle.**
- `isKaraokePublished()` et l'accès aux LRC.
- La source des musiques (Supabase) et le fallback `content/songs.json`.
- `scripts/generate-stubs.cjs` (parité SEO statique / React).
- `src/styles/a11y.css` (anneau de focus global).

---

## 3. Architecture

- Aucun nouveau serveur, aucune API générique : accès direct navigateur → Supabase sous RLS, comme aujourd'hui.
- Nouveaux composants isolés sous un dossier dédié mobile (par exemple `src/components/mobile/`), rendus uniquement sous 768 px.
- Tokens de couleur, rayons, ombres et typographie : ceux de `DESIGN.md`. Pas de webfont. Pas de nouvelle teinte.
- Assets Caipivara dans le repo (produits une fois, pas de Supabase Storage) :
  - `public/images/caipivara-3d-480.webp`, `public/images/caipivara-3d-960.webp`
  - `public/videos/caipivara/caipivara-idle.{mp4,webm}` + `caipivara-idle-poster.webp`
  - `public/videos/caipivara/caipivara-dance.{mp4,webm}` + `caipivara-dance-poster.webp`

---

## 4. Comportements

### 4.1 Início — feed plein écran
- Zone vidéo = hauteur de l'écran moins la bottom nav. Le Short 9:16 couvre la zone (comportement « cover », perte latérale ≈ 4 %).
- **Chargement en deux temps :** la miniature YouTube s'affiche d'abord (élément LCP), puis le lecteur YouTube IFrame API (`youtube-nocookie.com`, `autoplay=1`, `mute=1`, `playsinline=1`, `loop=1`, `playlist=<id>`, `controls=0`) se charge après le premier rendu. Fondu vers la vidéo quand l'état passe à PLAYING.
- **Repli :** si PLAYING n'arrive pas en 3 s (mode économie d'énergie, économie de données), la miniature reste avec « Toque para ouvir ». Jamais d'écran vide.
- **Calque au-dessus de l'iframe :** l'utilisateur ne touche jamais l'interface YouTube. Tap n'importe où sur la vidéo ou sur « Toque para ouvir » → `unMute()` (+ `playVideo()` si en repli). Second tap → `mute()`.
- **Haut :** « A Música da Segunda » + chip « Esta semana » sur un dégradé sombre de lisibilité.
- **Bas gauche (sur dégradé sombre) :** titre 900, manchete factuelle, ligne de karaoké (voir ci-dessous), fine barre de progression en bas de la zone vidéo (depuis `getCurrentTime()` / durée).
- **Colonne droite :** avatar Caipivara (cercle 56 px, recadré tête), puis Letra (ouvre le LyricsDialog existant), Cantar (vers le karaoké de cette musique, affiché seulement si `isKaraokePublished()`), Compartilhar (Web Share API, repli copie du lien).
- **Caipivara :** au repos, bulle « Psiu! Saiu a música da semana. » tant que le son n'est pas activé. Quand l'état réel du lecteur est « son actif + PLAYING », l'avatar passe en animation de danse. L'état vient du lecteur, pas du clic.
- **Ligne de karaoké sur la vidéo :** seulement si le karaoké de la musique est publié. Synchro par lecture de `getCurrentTime()` et des LRC existants, en lecture seule. Visible uniquement avec le son actif. Sinon, la zone n'existe pas (pas de placeholder).
- **Un seul jaune par zone :** son coupé = bouton « Toque para ouvir » ; son actif = ligne de karaoké. Rien d'autre en jaune sur la vidéo.
- **Semaines précédentes — navigation par glissement vertical, façon TikTok (décidé le 2026-09-25, étape 4b) :**
  - Ordre : la plus récente en premier. Glisser vers le haut = semaine précédente ; glisser vers le bas = revenir vers la plus récente.
  - Aucun glissement horizontal (conflit avec le geste retour d'iOS).
  - Un seul lecteur YouTube, réutilisé d'une chanson à l'autre (`loadVideoById`). Si le son a été activé, il reste activé en changeant de chanson.
  - Seules les miniatures des chansons voisines sont préchargées ; jamais un deuxième lecteur.
  - Accessibilité : les mêmes changements sont possibles au clavier (flèches haut/bas) et par deux boutons avec `aria-label` pour les lecteurs d'écran.
  - Indice discret « Deslize para a semana anterior », affiché tant que l'utilisateur n'a jamais glissé.
  - `prefers-reduced-motion` : le changement se fait sans animation de défilement.

### 4.2 Karaokê — liste
- En tête : carte « Música da semana » (Caipivara + titre + bouton jaune « Cantar agora ») si le karaoké de la semaine est publié. Sinon, la carte met en avant la dernière musique dont le karaoké est publié.
- Lien « Festa na TV » vers le flux existant.
- Liste : uniquement les musiques avec `isKaraokePublished()`, plus récentes en premier, bouton « Cantar ».
- Icône de l'onglet : icône de paroles, pas de micro (le karaoké fonctionne sans micro).

### 4.3 Karaokê — lecture (restyle uniquement)
- Ligne en cours : remplissage jaune mot à mot + petite balle jaune, comme la signature décrite dans `DESIGN.md`.
- Lignes chantées à 30 % de blanc, ligne suivante à 72 %, fondu haut et bas par masque.
- Barre de contrôle : revenir d'une ligne, pause (seul élément jaune), bouton « Aprender ».
- **Bouton « Aprender » : affiché uniquement pour les musiques qui ont une fiche Modo Aprender** (pilotes actuels). Masqué sinon, sans placeholder.
- Aucune modification du moteur de synchro.

### 4.4 Pesquisa
- Champ de recherche (titre, manchete, paroles) en haut.
- Chips des thèmes existants (catégories réelles du site).
- Chips « Por mês » : uniquement les mois qui ont des musiques (logique monthsWithSongs).
- Sans saisie : liste « Recentes ». Avec saisie sans résultat : message court + suggestions de musiques récentes, jamais une liste vide seule.
- Eyebrow avec le nombre réel de musiques, calculé.

### 4.5 Roda
- Roue avec la Caipivara au centre, pointeur blanc en haut.
- « Girar a roda » (seul élément jaune) : rotation d'environ 3 s, puis carte « A roda escolheu » avec la musique tirée au hasard, qui mène à sa page.
- Tirage parmi toutes les musiques publiées. Double tap pendant la rotation ignoré.
- `prefers-reduced-motion` : pas de rotation, résultat affiché directement.

### 4.6 Menu
- En tête : avatar Caipivara, nom, slogan « Nova música toda segunda-feira ».
- Lignes : Festa na TV, Aprender português, Arquivo, Sobre o projeto, Newsletter (Buttondown `amusicadasegunda`).
- Plateformes en pastilles neutres. Pas de couleur de marque en dehors du lien de la plateforme concernée.
- Aucun témoignage, chiffre d'audience ou presse (voir `PRODUCT.md`).

---

## 5. Dimensions et appareils de test

- Viewports : 360 × 800, 390 × 844, 430 × 932.
- iOS Safari, Android Chrome, WebView Capacitor.
- Zones de sécurité (`env(safe-area-inset-*)`) respectées en haut et en bas.

## 6. Cas limites

- La musique de la semaine n'a pas de Short : afficher la miniature/pochette et le bouton Letra ; le calque vidéo ne se charge pas.
- Pas de karaoké publié : pas de bouton Cantar, pas de ligne de karaoké, aucune mention.
- Pas de manchete renseignée : la ligne disparaît, sans placeholder.
- YouTube bloqué ou lent : repli miniature, jamais d'écran noir.
- Supabase indisponible : fallback `content/songs.json` (à régénérer, voir étape 1).
- Titres longs : deux lignes maximum, puis ellipse.

## 7. Accessibilité

- Cibles tactiles ≥ 44 px. Vrais `<button>` et `<a>`. `aria-label` sur les boutons icône.
- Anneau de focus global de `a11y.css` visible partout.
- Contraste ≥ 4,5:1 sur le texte (dégradés de lisibilité sous le texte posé sur la vidéo).
- `prefers-reduced-motion` : pas de danse, pas de pulse, pas de balayage, pas de rotation.
- Le bouton son annonce son état (« Ouvir com som » / « Silenciar »).

## 8. Contraintes de performance

- LCP = miniature du Short, pas l'iframe.
- L'iframe YouTube se charge après le premier rendu, jamais avant.
- Une seule iframe YouTube dans la page à tout moment.
- Boucles Caipivara : < 1 Mo chacune, `preload="metadata"`, poster.
- Aucune régression Lighthouse mobile (performance, accessibilité, SEO) par rapport à `main`.

## 9. SEO

- Toute modification de contenu indexable est faite dans les composants React **et** dans les stubs `generate-stubs.cjs`.
- Les pages `/musica/:slug/` ne changent pas dans cette spec.

## 10. Procédure de test par étape

- `npm run build` sans erreur ni warning nouveau.
- Test manuel sur les trois viewports.
- Vérification que le desktop (≥ 768 px) est pixel-identique à `main`.
- `/impeccable audit` ciblé sur les écrans modifiés, sans nouveau problème bloquant.

---

## 11. Étapes (une par une, validation entre chaque)

**Étape 0 — Analyse (lecture seule).** Lire les fichiers de la section 2. Rendre un rapport : composants concernés, routes, où brancher le rendu mobile, fonction YouTube, accès LRC, risques. Aucune modification.

**Étape 1 — Assets et données.** Renommer les vidéos (`caipivara-idle`, `caipivara-dance`), compresser en MP4 + WebM < 1 Mo, extraire les posters, ajouter les WebP. Régénérer `content/songs.json` depuis Supabase. Remplacer tout compteur en dur par un calcul.

**Étape 2 — Shell mobile.** Bottom nav opaque #050505, icône Karaokê, header transparent sur Início uniquement.

**Étape 3 — Início, vidéo.** Miniature → IFrame API → fondu, cover, repli 3 s, tap son on/off.

**Étape 4 — Início, calques.** Titre, manchete, barre de progression, colonne droite, Caipivara (bulle, danse selon l'état réel).

**Étape 4b — Início, navigation entre les semaines.** Glissement vertical (haut = semaine précédente, bas = retour), lecteur unique réutilisé (`loadVideoById`, son conservé), préchargement des seules miniatures voisines, flèches haut/bas et deux boutons accessibles, indice « Deslize para a semana anterior » jusqu'au premier glissement, sans animation sous `prefers-reduced-motion`. Voir §4.1.

**Étape 5 — Início, ligne de karaoké synchronisée** (conditionnée à `isKaraokePublished()`).

**Étape 6 — Karaokê liste.**

**Étape 7 — Karaokê lecture (restyle).**

**Étape 8 — Pesquisa.**

**Étape 9 — Roda.**

**Étape 10 — Menu.**

**Étape 11 — Vérification finale.** Accessibilité, mouvement réduit, performance, parité SEO, `/impeccable audit`, `review-animations`.

---

## 12. Critères d'acceptation (binaires)

- [ ] Sous 768 px, la home affiche le Short de la semaine en plein écran, son coupé, sans action de l'utilisateur (ou la miniature + « Toque para ouvir » si l'autoplay est bloqué).
- [ ] Un tap active le son ; un second le coupe.
- [ ] Aucun écran vide ni placeholder, sur aucun des cas limites de la section 6.
- [ ] Jamais plus d'un élément jaune par zone.
- [ ] La Caipivara danse uniquement quand le son joue réellement.
- [ ] La ligne de karaoké n'apparaît que pour les musiques au karaoké publié.
- [ ] Le bouton Aprender n'apparaît que pour les musiques avec fiche.
- [ ] Aucun nombre de musiques écrit en dur.
- [ ] Desktop (≥ 768 px) identique à `feat/homepage-desktop` ; interface TV identique à `main`.
- [ ] Moteur LRC et schéma Supabase inchangés.
- [ ] Toutes les animations s'arrêtent avec `prefers-reduced-motion`.
- [ ] Lighthouse mobile ≥ `main` sur performance, accessibilité et SEO.

**Étape 4b — navigation entre les semaines :**

- [ ] Glisser vers le haut affiche la semaine précédente ; glisser vers le bas revient vers la plus récente. La plus récente est affichée en premier.
- [ ] Aucun glissement horizontal ne change de chanson (le geste retour d'iOS reste intact).
- [ ] Il n'existe jamais plus d'une iframe YouTube dans la page, pendant et après un changement de chanson.
- [ ] Le lecteur est réutilisé (`loadVideoById`) : si le son était actif, il reste actif sur la nouvelle chanson ; s'il était coupé, il reste coupé.
- [ ] Seules les miniatures des chansons voisines (précédente et suivante) sont préchargées ; aucune autre vidéo ni aucun autre lecteur n'est chargé.
- [ ] Les flèches haut/bas du clavier et deux boutons avec `aria-label` (semaine précédente / semaine suivante) produisent les mêmes changements que le glissement.
- [ ] Aux extrémités (chanson la plus récente, chanson la plus ancienne), le bouton et le geste sans destination sont inopérants et le bouton correspondant n'est pas proposé.
- [ ] L'indice « Deslize para a semana anterior » est visible tant que l'utilisateur n'a jamais glissé, puis ne réapparaît plus.
- [ ] Avec `prefers-reduced-motion`, le changement de chanson se fait sans animation de défilement.

## 13. Livrables par étape

- Diff de l'étape uniquement.
- Rapport court : ce qui a été fait, fichiers touchés, tests passés, points ouverts.
- Arrêt et attente de validation.
