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
- Zone vidéo = hauteur de l'écran moins la bottom nav. Le Short 9:16 couvre la zone (comportement « cover », perte latérale de 11 à 13 % selon l'écran). **Cadrage (décision du 2026-09-25) :** la vidéo a exactement le cadrage de la miniature qui la précède, sans agrandissement supplémentaire (réglage `SHORTS_UI_ZOOM` = 1,0, conservé pour pouvoir y revenir). YouTube affiche parfois son interface Shorts pendant toute la lecture (variante tirée au hasard par YouTube) : c'est accepté.
- **Chargement en deux temps :** la miniature YouTube s'affiche d'abord (élément LCP), puis le lecteur YouTube IFrame API (`youtube-nocookie.com`, `autoplay=1`, `mute=1`, `playsinline=1`, `controls=0` ; **ni `loop=1` ni `playlist=<id>`**, qui figeaient la boucle sur la première vidéo) se charge après le premier rendu. Fondu vers la vidéo **environ 0,3 s après le début de la lecture** (PLAYING) — juste le temps d'éviter l'image noire du démarrage —, au premier chargement comme après chaque glissement, que le son soit coupé ou non. *(Révisé le 2026-09-25 : un délai de 4 s laissait l'image figée pendant que la musique jouait, ressenti comme pire que l'interface YouTube.)* L'interface de démarrage de YouTube (titre en haut, logo « Shorts » en bas à droite) reste alors visible environ 3 s : c'est accepté. La boucle est gérée par l'application (retour au début juste avant la fin), pas par `loop=1&playlist=<id>`, et un seul lecteur est réutilisé (`loadVideoById`).
- **Repli :** si PLAYING n'arrive pas en 3 s (mode économie d'énergie, économie de données), la miniature reste avec « Toque para ouvir ». Jamais d'écran vide.
- **Calque au-dessus de l'iframe :** l'utilisateur ne touche jamais l'interface YouTube. Le premier geste de la visite (tap, glissement, flèche, bouton) active le son (`unMute()`, + `playVideo()` si en repli) ; « Toque para ouvir » n'apparaît que si le lecteur est réellement muet. Ensuite, tap = pause / lecture ; le son se coupe par le bouton Som de la colonne. Détail : addendum H.2.
- **Aucun dégradé, voile ni scrim sur la vidéo** (addendum H.1.3). Le texte et les icônes posés sur la vidéo restent lisibles par une ombre douce seulement (`feedStyles.js`).
- **Haut :** « A Música da Segunda » + ruban éphémère de la semaine (2,5 s, addendum H.3.1), pas de chip permanent.
- **Bas gauche :** titre 900 (28 px son coupé, 15 px compact son actif), ligne de karaoké (voir ci-dessous), barre de progression manipulable en bas de la zone vidéo (depuis `getCurrentTime()` / durée). Pas de manchete tant qu'aucune colonne dédiée n'existe.
- **Colonne droite (icônes pleines sans rond, addendum H.5.1) :** Som (seulement son actif), Letra, História (seulement si `description`), Cantar (vers le karaoké de cette musique, affiché seulement si `isKaraokePublished()`), Compartilhar (Web Share API, repli copie du lien).
- **Caipivara :** pas d'avatar, pas de bulle « Psiu », pas de danse sur le feed (addendum H.3.4). La Caipivara vit dans le header (image fixe) et sur la scène du Catálogo.
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

### 4.2 Karaokê — « O Palco » (remplace la liste, décision du 2026-09-25)
Pas de liste : une scène (sous 768 px ; desktop inchangé). Tout le reste de l'ancienne page disparaît sur mobile (Me surpreenda, bulle « Deixe a sorte escolher », filtres, étiquettes de catégorie, pochettes génériques, recherche).
- **En-tête** : « Karaokê » (30 px, 900), « O palco é seu » en eyebrow ; à droite, une icône télé seule (`aria-label` « Festa na TV ») vers `/festa`.
- **Carrousel 3D horizontal** des chansons au karaokê publié (`isKaraokePublished()`), de la plus récente à la plus ancienne : cartes 9:16 d'environ 188 × 334 px, miniature du Short (même repli que la grille de recherche), titre en bas lisible par ombre de texte seulement. Carte centrale pleine taille et nette ; voisines décalées, pivotées en profondeur (perspective, `rotateY` ≈ 38°, `translateZ` négatif), atténuées (55 % puis 25 %) ; au-delà, invisibles. Navigation : glissement horizontal (seuil ≈ 30 px, jamais depuis les 24 px du bord gauche — geste retour d'iOS), tap sur une carte latérale, flèches (boutons et clavier). Transition ≈ 550 ms, courbe douce. Tap sur la carte centrale = Cantar.
- **Effets** : projecteur jaune (cône) sur la carte centrale, qui oscille lentement ; halo diffus de la couleur dominante de la miniature centrale (échantillonnée sur un canvas, repli neutre sombre), en fondu ; petit égaliseur animé sur la carte centrale.
- **Sous le carrousel** : mois et année (eyebrow), titre (24 px, 900), premier vers des LRC existantes qui se remplit en jaune en boucle (lecture seule, moteur intact). Sans paroles, la ligne n'existe pas.
- **En bas** : gros bouton micro jaune rond (≈ 76 px, seul jaune plein de l'écran) avec une onde qui pulse doucement ; il ouvre la lecture karaokê de la chanson centrale. Flèches précédent / suivant de part et d'autre.
- **Mouvement réduit** : pas de rotation 3D (cartes simplement décalées), pas d'oscillation, pas d'égaliseur, pas de pulsation, vers en jaune fixe.
- **État dégradé** (données karaokê indisponibles, repli `songs.json` sans LRC) : la chanson de la semaine seule au centre (sa carte mène au feed sur son Short), « O karaokê volta já » à la place du micro. Jamais d'écran vide.
- **Accessibilité** : le carrousel est une liste d'éléments focusables ; la chanson centrale est annoncée à chaque changement ; cibles ≥ 44 px.
- **Icônes** : onglet Karaokê de la barre = micro (plein et blanc actif, contour sinon) ; « Cantar » de la colonne (feed et Catálogo) = le même micro. *(Remplace « icône de paroles, pas de micro » : le karaokê fonctionne toujours sans micro.)*

### 4.3 Karaokê — lecture (restyle uniquement)
- Ligne en cours : remplissage jaune mot à mot + petite balle jaune, comme la signature décrite dans `DESIGN.md`.
- Lignes chantées à 30 % de blanc, ligne suivante à 72 %, fondu haut et bas par masque.
- Barre de contrôle : revenir d'une ligne, pause (seul élément jaune), bouton « Aprender ».
- **Bouton « Aprender » : affiché uniquement pour les musiques qui ont une fiche Modo Aprender** (pilotes actuels). Masqué sinon, sans placeholder.
- Aucune modification du moteur de synchro.

### 4.4 Pesquisa
> Remplacée par la recherche en panneau de l'addendum (section B, décisions G.5 et H.8).

- Champ de recherche (titre, paroles et `subtitle`) en haut. `subtitle` sert à la recherche mais n'est jamais affiché.
- Chips des thèmes existants (catégories réelles du site).
- Chips « Por mês » : uniquement les mois qui ont des musiques (logique monthsWithSongs).
- Sans saisie : liste « Recentes ». Avec saisie sans résultat : message court + suggestions de musiques récentes, jamais une liste vide seule.
- Eyebrow avec le nombre réel de musiques, calculé (écran Pesquisa d'origine ; le panneau de l'addendum n'en affiche pas).

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
- Contraste ≥ 4,5:1 sur le texte. Sur la vidéo du feed, par ombre portée uniquement (pas de dégradé, addendum H.1.3).
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

- `npx vite build` sans erreur ni warning nouveau (pas `npm run build` en local : son prebuild interroge Supabase et réécrit `content/`, son postbuild écrit `docs/` et notifie IndexNow).
- Test manuel sur les trois viewports.
- Vérification que le desktop (≥ 768 px) est pixel-identique à `feat/homepage-desktop`, et l'interface TV identique à `main`.
- `/impeccable audit` ciblé sur les écrans modifiés, sans nouveau problème bloquant.

---

## 11. Étapes (une par une, validation entre chaque)

> **Ordre d'exécution révisé (2026-09-25).** L'addendum `addendum-spec-mobile-catalogo.md` remplace les étapes 8, 9 et 10 ci-dessous par ses étapes 8 à 11. Ordre retenu après l'étape 4b : **8 → 9 → 10 → 11** (addendum : nav à 4 onglets, Catálogo scène, Catálogo recherche, Menu simplifié), puis **5 → 6 → 7** (karaokê), puis **12** (vérification finale, ex-étape 11). *Mis à jour le 2026-09-25 : ordre des étapes restantes et décisions depuis l'étape 8 dans la section H de l'addendum (10 → 11 → 5 → 6 → 7 → 12).*

**Étape 0 — Analyse (lecture seule).** Lire les fichiers de la section 2. Rendre un rapport : composants concernés, routes, où brancher le rendu mobile, fonction YouTube, accès LRC, risques. Aucune modification.

**Étape 1 — Assets et données.** Renommer les vidéos (`caipivara-idle`, `caipivara-dance`), compresser en MP4 + WebM < 1 Mo, extraire les posters, ajouter les WebP. Régénérer `content/songs.json` depuis Supabase. Remplacer tout compteur en dur par un calcul.

**Étape 2 — Shell mobile.** Bottom nav opaque #050505, icône Karaokê, header transparent sur Início uniquement.

**Étape 3 — Início, vidéo.** Miniature → IFrame API → fondu, cover, repli 3 s, tap son on/off.

**Étape 4 — Início, calques.** Titre, manchete, barre de progression, colonne droite, Caipivara (bulle, danse selon l'état réel).

**Étape 4b — Início, navigation entre les semaines.** Glissement vertical (haut = semaine précédente, bas = retour), lecteur unique réutilisé (`loadVideoById`, son conservé), préchargement des seules miniatures voisines, flèches haut/bas et deux boutons accessibles, indice « Deslize para a semana anterior » jusqu'au premier glissement, sans animation sous `prefers-reduced-motion`. Voir §4.1.

**Étape 5 — Início, ligne de karaoké synchronisée** (conditionnée à `isKaraokePublished()`).

**Étape 6 — Karaokê « O Palco »** (§4.2, remplace la liste).

**Étape 7 — Karaokê lecture (restyle).**

**Étape 8 — Pesquisa.**

**Étape 9 — Roda.**

**Étape 10 — Menu.**

**Étape 11 — Vérification finale.** Accessibilité, mouvement réduit, performance, parité SEO, `/impeccable audit`, `review-animations`.

---

## 12. Critères d'acceptation (binaires)

- [ ] Sous 768 px, la home affiche le Short de la semaine en plein écran, son coupé, sans action de l'utilisateur (ou la miniature + « Toque para ouvir » si l'autoplay est bloqué).
- [ ] Le premier geste active le son ; ensuite un tap met en pause / relance, et le bouton Som de la colonne coupe le son.
- [ ] Aucun écran vide ni placeholder, sur aucun des cas limites de la section 6.
- [ ] Jamais plus d'un élément jaune par zone.
- [ ] Sur le Catálogo, la Caipivara danse uniquement quand le son joue réellement (le feed n'a plus d'avatar Caipivara).
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
