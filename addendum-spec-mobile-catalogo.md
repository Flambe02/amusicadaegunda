# Addendum — Spec mobile : navigation, page Catálogo, Menu simplifié

Complète `spec-mobile-redesign.md`. En cas de conflit, cet addendum prévaut sur les sections 4.4, 4.5, 4.6 et sur les étapes 8, 9 et 10.
Référence visuelle : artboard « Catálogo » du canvas « A Música da Segunda — Mobile Caipivara ».
Les étapes 4b à 7 de la spec restent inchangées.

---

## A. Barre de navigation : 5 éléments, façon TikTok

*Révisé le 2026-09-25 (remplace la barre à 4 onglets de l'étape 8).*

- Ordre : **Início**, **Karaokê**, **[Caipivara au centre]**, **Buscar**, **Menu**.
- Fond noir pur, filet supérieur très discret (1 px, blanc à 10 %), pas d'ombre ni de flou.
- Onglet actif : icône pleine blanche + libellé en gras. Inactifs : icône en contour, blanc à 60 %. Plus de jaune sur l'onglet actif.
- Au centre : la Caipivara (visage) dans une pastille jaune arrondie d'environ 46 × 34 px, sans libellé, `aria-label` « Catálogo ». Elle ouvre `/catalogo`. C'est le seul jaune de la barre. Active (léger contour blanc) sur `/catalogo` et les pages qui parcourent les musiques (`/musica`, fiches, catégories, arquivo).
- « Buscar » ouvre directement le panneau de recherche de l'étape 10, depuis n'importe quel écran. En attendant l'étape 10, il mène à `/catalogo` (décision du 2026-09-25). Il n'est jamais affiché comme actif.
- Pesquisa et Roda ne sont plus des onglets. Leurs routes redirigent vers `/catalogo` sous 768 px (pas de lien mort). `/musica` reste accessible et indexable.
- Le bouton « i » du header de l'Início est supprimé (doublon du Menu). Le header garde la Caipivara (logo fixe) et le nom.
- Section navigation de `DESIGN.md` et tests de `Layout` à jour.

## B. Page Catálogo (`/catalogo`) — la scène de la Caipivara

**Principe :** un écran plein, comme une scène. La Caipivara est la seule chose qui bouge. Aucune liste sur l'écran principal.

**Composition (du haut vers le bas) :**
- Fond Stage Black, un seul halo jaune doux derrière la Caipivara, une ombre au sol sous elle.
- La Caipivara en pied, grande et centrée (≈ 250 px de large sur 390 px d'écran), jouant la boucle `caipivara-idle` en continu.
- Sous elle, une seule ligne façon sous-titre (≈ 20 px, 800) : « Toque em mim e eu escolho uma música pra você. »
- ~~Barre de recherche en bas de la scène~~ — *supprimée le 2026-09-25 : l'onglet « Buscar » de la nav suffit.*
- `h1` visuellement masqué : « Catálogo de músicas ».

**Tap sur la Caipivara (toute sa surface est un bouton, avec `aria-label`)** — *révisé le 2026-09-25 : c'est la musique qui se lance, pas la vidéo (principe de la Roda). L'étape « Que tal / Ouvir / Outra » est supprimée ; pas de changement de page.*
1. Une chanson est tirée (publiée, avec un lien `youtube_url` lisible, jamais la précédente) et **sa musique démarre tout de suite**, son lancé dans le geste du tap (contrainte iOS).
   - Source : la même que la Roda, `youtube_url` (la chanson entière, pas le Short).
   - Lecteur : le moteur YouTube du feed (`useShortPlayer`), un seul lecteur, invisible, sans boucle (`loop: false`). Pas de second système.
   - Pour que le son parte dans le geste, le lecteur est créé à l'arrivée sur la page avec une première chanson tirée d'avance, en muet ; le premier tap la reprend au début et rétablit le son. Les taps suivants chargent la chanson suivante sur le même lecteur, dans le geste (`loadNow`).
   - Si le navigateur refuse le son, la Caipivara reste au repos et le bouton ▶ relance.
2. En même temps, une animation est tirée parmi les trois (jamais deux fois la même à la suite) : `caipivara-hat`, `caipivara-flip`, `caipivara-samba`. Elle joue une fois, puis la Caipivara enchaîne sur la boucle `caipivara-dance` tant que la musique joue avec le son. Retour à la boucle de repos en pause ou à la fin de la chanson. Fondu de retour : 150 ms pour `hat`, ≈ 400 ms pour `flip` et `samba` (ils ne finissent pas dans la pose de repos).
3. Sous la Caipivara, discret : titre, mois et année, fine barre de progression (lecture seule), bouton pause/lecture.
4. Deux liens secondaires : « História » (le panneau du feed, seulement si `description` existe) et « Ver o clipe » (`/?musica=<slug>`, le feed sur cette chanson).
5. Nouveau tap = nouvelle animation + nouvelle chanson. Taps répétés pendant une animation : ignorés.
6. Seule la coquille mobile de `Layout` monte la scène (un seul lecteur audio). La Roda desktop est inchangée.

**Recherche (onglet « Buscar » de la nav, depuis n'importe quel écran) :** un panneau monte du bas (≈ 94 % de la hauteur), fond #111217, coins 26 px, poignée en haut.
- En tête : champ de recherche (titre, manchete, paroles) + « Cancelar » à droite, façon iOS. Le clavier s'ouvre directement.
- « Por mês · année » : pastilles des seuls mois qui ont des musiques ; le mois le plus récent sélectionné par défaut (pastille blanche pleine).
- « Por tema » : pastilles des catégories réelles.
- Grille 3 colonnes de miniatures 9:16 (miniature du Short, titre en bas sur un dégradé), filtrée par le mois ou le thème choisi, ou par la recherche.
- Recherche sans résultat : phrase courte + musiques récentes en dessous. Jamais de grille vide seule.
- Fermeture : Cancelar, glissement vers le bas, Escape.
- Le lien « Ver todas as músicas » vers `/musica` apparaît en bas de la grille.

**Mouvement réduit (`prefers-reduced-motion`) :** Caipivara en image fixe (pas de boucle, pas d'animation ni de danse), la musique part directement au tap ; panneau sans glissement.

**Données :** aucun nombre en dur. Si Supabase est indisponible, `content/songs.json` suffit pour la scène et la grille.

## C. Assets Caipivara à ajouter

Fichiers fournis par Florent, à placer puis à traiter comme à l'étape 1 (sans audio, MP4 + WebM, poster WebP, < 1 Mo chacun, originaux dans `design/caipivara/source/`) :
- `caipivara-hat`, `caipivara-flip`, `caipivara-samba`.
- Chaque clip doit commencer et finir dans la pose de repos. Si le début ou la fin ne raccorde pas avec la boucle `caipivara-idle`, couper le clip au plus près de la pose de repos plutôt que de laisser un saut visible.
- Les bords des vidéos se fondent dans le fond de la page (masque radial), pour qu'aucun rectangle ne soit visible.
- Chargement : la boucle de repos au chargement de la page ; les trois animations en `preload="metadata"`, puis chargées au premier tap ou quand le navigateur est inactif.

## D. Menu simplifié

- En tête : avatar Caipivara, « A Música da Segunda », « Nova música toda segunda-feira ».
- Lignes : Festa na TV, Aprender português, Sobre o projeto, Newsletter (Buttondown `amusicadasegunda`).
- Plus de lignes Roda, Pesquisa, Blog ou « Todas as músicas » (désormais dans Catálogo). Le Blog reste accessible par son URL et depuis Sobre.
- Plateformes d'écoute en pastilles neutres (pas de couleur de marque hors de leur propre lien).
- Aucun témoignage, chiffre d'audience ou presse.

---

## G. Décisions complémentaires (validées le 2026-09-25)

Elles précisent les sections ci-dessus et prévalent sur elles en cas de doute. Les décisions suivantes sont en section H.

1. **Redirections** : `/search` et `/roda` redirigent vers `/catalogo` **uniquement sous 768 px** (redirection côté client, depuis la copie mobile de la page). Sur desktop, les routes, les stubs et le sitemap restent inchangés.
2. **`/catalogo` sur desktop** (≥ 768 px) : redirection vers `/musica`. `/catalogo` est `noindex` et hors sitemap. *Révisé le 2026-09-25 :* il a un **stub `noindex`** (comme `/festa` et `/search`), sinon un rechargement ou un lien direct passait par `404.html`, qui renvoie vers `/`.
3. **« Ouvir »** (devenu « Ver o clipe » avec la refonte audio) : navigation vers `/?musica=<slug>`. Le feed s'ouvre positionné sur cette chanson (le glissement reste possible dans les deux sens), son coupé (bouton lecture central, H.10), puis le paramètre est retiré de l'URL.
4. **Un seul halo** : celui qui est déjà dans les vidéos (projecteur et lueur au sol), bords fondus par le masque radial. Pas de halo CSS ajouté. En mouvement réduit, image fixe = poster du clip `caipivara-idle`.
5. **Recherche** : sur le titre, les paroles et `subtitle`. `subtitle` sert à la recherche mais n'est jamais affiché (pas de manchete tant qu'aucune colonne dédiée n'existe).
6. **Menu** : « Festa na TV » → `/festa`. « Newsletter » → le composant existant `ButtondownSignupForm`, dans un petit panneau qui s'ouvre depuis la ligne.

---

## H. Décisions prises depuis l'étape 8 (2026-09-25)

Elles prévalent sur les sections ci-dessus et sur `spec-mobile-redesign.md` en cas de doute.

### H.1 Feed Início — vidéo
1. **Pas de zoom** : `SHORTS_UI_ZOOM = 1.0` (constante gardée dans `MobileFeed.jsx`). Le cadrage de la vidéo est celui de la miniature. L'interface YouTube de démarrage (~3 s) et la variante « UI Shorts permanente » sont acceptées.
2. **Vidéo affichée 0,3 s après PLAYING** (`REVEAL_DELAY_MS = 300` dans `useShortPlayer.js`), au premier chargement comme après chaque glissement, son coupé ou non. Un délai long (4 à 6 s) laissait une image figée pendant que la musique jouait : rejeté.
3. **Aucun dégradé, voile ni scrim sur la vidéo.** Lisibilité par ombres uniquement (`src/components/mobile/feed/feedStyles.js`) : `TEXT_SHADOW` sur le texte, `ICON_SHADOW` (même ombre en `drop-shadow`) sur les icônes. Ne jamais rajouter de voile sans demander.
4. **Titre compact** (15 px, son actif) : opacité 100 % et ombre plus dense (`TEXT_SHADOW_DENSE`).

### H.2 Feed Início — son et gestes (modèle TikTok)
1. Arrivée : vidéo muette + bouton lecture central (H.10). **Le premier geste de la visite active le son**, quel qu'il soit : tap, glissement vers une autre semaine, flèche du clavier, bouton. Le haut-parleur barré n'apparaît que si le lecteur est réellement muet.
2. Ensuite, **tap sur la vidéo = pause / lecture**. En pause : miniature floutée + icône lecture par-dessus le bloc central de YouTube.
3. **Barre de progression manipulable** en bas de la vidéo (`data-scrubber`, zone tactile de 24 px, trait 3 → 6 px pendant le geste, temps « m:ss / m:ss »). Ce geste ne change jamais de semaine.
4. **Clavier** : ↑/↓ = semaine précédente / suivante, Espace = pause / lecture, ←/→ = −5 s / +5 s. Deux boutons `sr-only` « Semana anterior » / « Semana seguinte ».
5. La boucle de la vidéo est gérée par l'app (retour à 0 juste avant la fin), pas par YouTube.

### H.3 Feed Início — calques
1. **Ruban éphémère** à la place du chip permanent de la semaine (`WeekRibbon.jsx`) : « Nova · esta semana » si la chanson est sortie cette semaine (lun → dim, heure de São Paulo), sinon « mois année » (ex. « setembro 2026 »). Visible 2,5 s à l'arrivée de la vidéo et après chaque glissement, puis disparaît.
2. **Colonne de droite**, de haut en bas : **Som** (seulement quand le son est actif, « Silenciar »), **Letra**, **História** (seulement si `description` n'est pas vide), **Cantar** (seulement si `isKaraokePublished`, → `/karaoke?musica=<slug>`), **Compartilhar** (Web Share, sinon copie du lien).
3. **Panneau História** (`FeedStorySheet.jsx`) : monte du bas, fond #111217, coins 26 px ; titre, « mois année · thème » (toujours mois et année, même pour la chanson de la semaine), description, lien « Ver a página da música ». La vidéo continue derrière, sans voile. Focus piégé dans le panneau et rendu au bouton à la fermeture.
4. Pas de bulle « Psiu », pas d'avatar Caipivara animé sur le feed.

### H.4 Catálogo — la musique se lance au tap (remplace B.1 à B.5 d'origine)
1. **Tap sur la Caipivara = une chanson démarre tout de suite**, son lancé dans le geste (iOS). Source : `youtube_url` (comme la Roda). Lecteur : celui du feed (`useShortPlayer`), invisible, avec l'option `loop: false` ; pas de second système. Une première chanson est tirée d'avance et tourne en muet ; le premier tap la reprend au début avec le son. Les taps suivants chargent la chanson suivante dans le geste (`loadNow`).
2. Tirage parmi les chansons publiées **avec un lien lisible**, jamais la précédente.
3. La Caipivara joue une animation (hat, flip ou samba, jamais deux fois la même à la suite), puis **danse** (`caipivara-dance`) tant que la musique joue avec le son ; boucle de repos en pause, à la fin, ou si le navigateur refuse le son (le bouton ▶ relance).
4. Sous la Caipivara, discret : **titre, mois et année, fine barre de progression, bouton pause / lecture**. Liens secondaires **« História »** (même panneau que le feed, si description) et **« Ver o clipe »** (`/?musica=<slug>`, le feed sur cette chanson).
5. **Retap = nouvelle animation + nouvelle chanson.** Taps pendant une animation : ignorés.
6. **Plus d'étape « Que tal / Ouvir / Outra »**, pas de changement de page.
7. Mouvement réduit : image fixe, musique lancée directement.
8. **Raccords** : fondu de retour d'environ 400 ms pour `samba` et `flip` (150 ms pour `hat`).
9. Seule la coquille mobile de `Layout` monte la scène (un seul lecteur audio). La Roda desktop reste inchangée.
10. **Plus de barre de recherche sur la scène** : l'onglet « Buscar » de la nav suffit.

### H.5 Icônes façon TikTok
1. **Colonne de droite du feed** : plus de ronds sombres. Icônes pleines blanches de 32 px posées sur la vidéo avec ombre portée douce ; libellés 12 px semi-gras blancs avec ombre ; zone tactile ≥ 44 × 44 px ; colonne proche du bord droit, espacement régulier, largeur du plus long libellé. Icônes dans `src/components/mobile/icons/FilledIcons.jsx`.
2. **Barre de navigation à 5 éléments** : voir section A (révisée). Início, Karaokê, [pastille Caipivara jaune = Catálogo, seul jaune de la barre], Buscar, Menu. « Buscar » mène à `/catalogo` en attendant le panneau de l'étape 10.
3. **Chevauchement accepté (décision du 2026-09-25)** : sans les ronds, la variante « UI Shorts permanente » de YouTube (ses propres boutons j'aime / partager) chevauche notre colonne. C'est accepté : **aucun fond derrière nos icônes** (ce serait un voile sur la vidéo).

### H.6 Ordre des étapes restantes
Étapes 8 et 9 faites (nav, scène Catálogo, puis leurs révisions ci-dessus). Reste, dans l'ordre :
1. **Étape 10 — Recherche** : panneau global monté dans `Layout`, ouvert par « Buscar » depuis n'importe quel écran (le clavier s'ouvre) ; contenu selon la section B (« Recherche »).
2. **Étape 11 — Menu simplifié** (section D, décision G.6).
3. **Étape 5 — Karaokê sur le Short** : ligne de karaokê sur la vidéo ; si elle est désynchronisée, ne pas l'afficher.
4. **Étape 6 — Karaokê « O Palco »** (carrousel 3D, micro, état dégradé « O karaokê volta já ») : voir spec §4.2, qui remplace la liste (décision du 2026-09-25). Onglet Karaokê et « Cantar » = micro.
5. **Étape 7 — Lecteur karaokê restylé.**
6. **Étape 12 — Vérification finale.**

### H.4 bis — Catálogo après le test sur iPhone (2026-09-25, remplace H.4.4)
1. **« Outra »** (icône piste suivante + libellé) à côté de pause : même tirage que la Caipivara (animation + chanson suivante). Le tap sur la Caipivara reste un geste secondaire, annoncé par « Ou toque em mim » sous elle, jusqu'au premier changement de chanson par ce tap (mémorisé sur l'appareil, `amds-catalogo-retap`).
2. **Ruban** : le ruban éphémère du feed (`WeekRibbon`) à chaque nouvelle chanson ; plus de ligne mois / année sous le titre.
3. **Colonne d'icônes à droite, identique au feed** (`FeedRail.jsx`, partagé) : Letra (le `LyricsDialog` du feed), História (si description), Cantar (si karaokê publié), Compartilhar, **Clipe** (`/?musica=<slug>`). Le bas de l'écran ne garde que titre, barre de progression, pause et Outra.
4. **Plus de bouton ⓘ** dans l'en-tête mobile, sur aucune page (l'onglet Menu le remplace). Desktop inchangé.

### H.9 Feed — Som et Ouvir (2026-09-25, remplace H.3.2)
1. **Som** sort de la colonne : petite icône haut-parleur en haut à droite de la vidéo, à l'emplacement de l'ancien bouton ⓘ, visible seulement une fois le son activé.
2. **Colonne du feed**, de haut en bas : Ouvir (seulement si `youtube_url`), Letra, História, Cantar, Compartilhar. **Colonne du Catálogo** (page ou calque) : Letra, História, Cantar, Compartilhar, Clipe.
3. **Ouvir = calque, pas changement de page.** Au tap (icône casque), dans le geste : le lecteur du feed charge `youtube_url` et rétablit le son (même iframe, jamais rechargée), puis l'adresse devient `/?ouvir=<slug>` (une entrée d'historique). La scène du Catálogo s'affiche au-dessus du feed (devenu inerte) et emprunte ce lecteur, sans boucle : Caipivara qui danse, pause, Outra, colonne, ruban. La pastille Catálogo de la nav est active.
4. **Fermeture** : Retour, onglet Início ou Clipe (`/?musica=<slug>`). Le même lecteur recharge le Short de la diapositive (ou de la chanson du Clipe), son conservé.
5. **Repli** : si le son n'a pas pu partir (lecteur pas prêt, ouverture directe de l'adresse), le calque affiche « Toque para ouvir » (jaune, seul jaune de la zone) sous la Caipivara.
6. La page `/catalogo` (pastille de la nav) garde son propre lecteur. Quitter l'Início vers une autre page coupe la musique, comme avant.

### H.10 Feed — son coupé sans gros bouton jaune (2026-09-25, remplace H.2.1 pour l'affichage)
1. **Plus de gros bouton jaune « Toque para ouvir »** au centre de la vidéo.
2. ~~Pastille « Toque para ativar o som »~~ — *remplacée après le test iPhone (2026-09-25)* par un **grand bouton lecture au centre de la vidéo** : cercle blanc translucide ≈ 72 px avec ▶, **pas de jaune**, `aria-label` « Ouvir com som ». Visible dès l'arrivée et jusqu'au premier geste de la visite, puis plus jamais (même si l'utilisateur coupe le son ensuite).
3. **Tant que le son est coupé**, un haut-parleur barré reste en petit en haut à droite (emplacement de Som) ; un tap dessus active le son. Son actif : haut-parleur plein (Silenciar).
4. Règle inchangée : le premier geste (tap n'importe où, glissement, flèche) active le son.
5. **Refus** (iOS, économie d'énergie) : si le son est toujours coupé ≈ 0,9 s après un geste qui l'a demandé, le bouton lecture central revient.
6. Le calque Ouvir garde son « Toque para ouvir » jaune (H.9.5) : c'est une autre zone, sans vidéo.

### H.7 Méthode
- Une étape à la fois, rapport de la section 13 de la spec, arrêt et attente de validation explicite. Un commit par décision.
- **Plus de captures d'écran dans les rapports** : Florent teste lui-même sur son téléphone. Les vérifications au navigateur (Playwright) continuent, mais seuls leurs résultats figurent dans le rapport.

### H.8 Réponses anticipées (2026-09-25)
1. **Étape 10, chanson sans Short dans la grille** : miniature YouTube de `youtube_url` recadrée en 9:16, sinon la pochette, sinon une vignette sombre avec le titre. Jamais de case vide.
2. **Étape 10, mois + thème** : les deux filtres se combinent. Sans résultat : phrase courte + chansons récentes.
3. **Étape 10, recherche tapée** : elle porte sur tout le catalogue ; les filtres mois / thème sont masqués pendant la saisie et reviennent quand la recherche est effacée.
4. **Étape 5** : la désynchronisation de la ligne de karaoké sur le Short est jugée chanson par chanson, pendant le test sur téléphone.
5. **Étape 7** : le bouton « Aprender » réutilise la détection existante des fiches Aprender (celle qui affiche le bouton Aprender dans le panneau Letra).

---

## E. Nouvelles étapes (remplacent les étapes 8, 9 et 10)

**Étape 8 — Navigation** (4 onglets, révisée le 2026-09-25 en barre à 5 éléments façon TikTok). Section A. Redirections Pesquisa et Roda. Suppression du bouton « i » de l'Início.

**Étape 9 — Catálogo, la scène.** Section B hors recherche, avec les assets de la section C.

**Étape 10 — Catálogo, la recherche.** Panneau de recherche de la section B.

**Étape 11 — Menu simplifié.** Section D.

**Étape 12 — Vérification finale.** (ancienne étape 11, inchangée)

## F. Critères d'acceptation ajoutés

- [ ] La nav mobile a exactement 5 éléments, dans l'ordre Início, Karaokê, [Caipivara], Buscar, Menu ; la pastille est son seul jaune.
- [ ] Les anciennes routes de Pesquisa et Roda mènent à `/catalogo`, sans erreur.
- [ ] Sur Catálogo, seule la Caipivara bouge ; aucune liste n'est visible avant l'ouverture de la recherche.
- [ ] Chaque tap joue une des trois animations, jamais deux fois la même à la suite, et lance tout de suite une musique différente de la précédente, avec le son (iPhone compris).
- [ ] La Caipivara danse tant que la musique joue ; repos en pause et à la fin.
- [ ] Aucun rectangle de vidéo n'est visible autour de la Caipivara.
- [ ] Un seul élément jaune à l'écran à tout moment.
- [ ] La recherche s'ouvre en un tap sur « Buscar », depuis n'importe quel écran, avec le clavier ouvert.
- [ ] Les mois proposés sont uniquement ceux qui ont des musiques.
- [ ] Aucune grille vide, aucun nombre en dur.
- [ ] Avec `prefers-reduced-motion`, aucune animation ne joue et la musique part directement.
- [ ] Desktop identique à `feat/homepage-desktop`, TV identique à `main`.
