# Spec — Refonte de la homepage desktop

Projet : A Música da Segunda (amusicadasegunda.com)
Périmètre : homepage desktop uniquement
Format d'exécution : séquentiel, avec validation explicite entre chaque étape

---

## 1. Périmètre verrouillé

Ne pas modifier, ne pas refactorer, ne pas « améliorer au passage » :

- le moteur de synchronisation LRC et tout le code karaoké
- le layout mobile et tablette, c'est-à-dire tout ce qui est en dessous de 1024 px
- l'application Android TV et tout code partagé avec elle
- les pages chanson individuelles (`/musica/:slug/`)
- le mini-player persistant en bas d'écran, qui doit continuer à fonctionner à l'identique
- le schéma Supabase : modifications additives uniquement, aucune colonne renommée ou supprimée
- la sortie SEO produite par `generate-stubs.cjs` : elle ne doit pas régresser

Si une modification demandée ci-dessous semble exiger de toucher un de ces éléments, arrête-toi et signale-le au lieu de procéder.

---

## 2. Étape zéro : inventaire, avant toute écriture de code

Avant de modifier un seul fichier, produis un rapport écrit contenant :

1. La liste des fichiers qui composent la homepage desktop actuelle, avec le rôle de chacun
2. La structure de données d'une chanson : tous les champs existants, leur type, leur origine (Supabase, JSON local, frontmatter, autre)
3. Le composant qui affiche le bloc « Nenhuma música publicada em setembro 2026 » et la condition exacte qui le déclenche
4. Comment la sidebar de navigation est construite, et si elle est partagée avec le mobile
5. Comment le mini-player est monté et où il vit dans l'arbre de composants
6. Le système de styles utilisé : Tailwind, CSS modules, styled-components, autre
7. Comment `generate-stubs.cjs` produit le HTML de la homepage

Attends ma validation avant de passer à l'étape 1.

---

## 3. Modèle de données

La refonte a besoin de champs qui n'existent probablement pas encore. Ils sont **additifs** et **tous optionnels**.

| Champ | Type | Usage | Exemple |
|---|---|---|---|
| `weekLabel` | string | Libellé de semaine sur le hero | `Semana de 31 de agosto` |
| `newsHeadline` | string | Manchette factuelle, sans nom de média | `PF apreende cartão, jatinho e helicóptero` |
| `hookLine` | string | Accroche courte, deux lignes maximum | `Vorcaro, cartão, jatinho e helicóptero. A PF encontrou o pacote completo.` |
| `contextWhat` | string | Colonne « O que aconteceu », une phrase | |
| `contextWhy` | string | Colonne « Por que virou música », une phrase | |
| `contextHow` | string | Colonne « Como virou música », une phrase | |
| `heroImage` | string | Image large du hero, ratio 16:9 minimum | |
| `durationSeconds` | number | Durée de la vidéo | `126` |
| `platformUrls` | objet | `{ spotify, appleMusic, youtubeMusic }` | |

**Règle de repli obligatoire.** Soixante-trois des soixante-quatre chansons du catalogue n'auront aucun de ces champs. Chaque composant doit se dégrader proprement :

- `weekLabel` absent : dériver du champ date existant, au format `Semana de {jour} de {mois}`
- `newsHeadline` absent : ne pas afficher le bandeau manchette du tout, ne jamais afficher un bandeau vide
- `hookLine` absent : utiliser les cent vingt premiers caractères de la description existante, coupés sur un mot entier, sans points de suspension
- `contextWhat`, `contextWhy`, `contextHow` : si les trois sont absents, ne pas afficher la bande de contexte ; si un ou deux seulement sont présents, afficher uniquement les colonnes renseignées, réparties sur la largeur
- `heroImage` absent : utiliser la cover existante en recadrage large avec `object-fit: cover`
- `durationSeconds` absent : ne pas afficher la durée
- `platformUrls` absent ou partiel : n'afficher que les plateformes qui ont une URL

Aucun de ces cas ne doit produire un bloc vide, un placeholder, ou un texte du type « non disponible ».

---

## 4. Étape 1 : correction de l'état vide

Priorité maximale, indépendante du reste de la refonte.

Le bloc qui affiche « Nenhuma música publicada em setembro 2026 » annonce au visiteur que le projet ne produit rien, alors que la promesse du site est une chanson chaque semaine.

Comportement attendu : si le mois courant ne contient aucune chanson, le bloc affiche le mois complet le plus récent qui en contient, avec son libellé réel. Si le catalogue entier est vide, le bloc ne s'affiche pas.

Le message « Nenhuma música publicada » ne doit apparaître nulle part sur la homepage, quelles que soient les données.

Critère d'acceptation : en simulant une date au premier jour d'un mois sans publication, la homepage n'affiche aucun message d'absence et présente le mois précédent.

---

## 5. Étape 2 : navigation

La sidebar verticale actuelle est remplacée par une barre horizontale sur desktop.

Structure de gauche à droite :

- logo et nom du projet
- `Início` (état actif), `Músicas`, `Karaokê`, `Notícias`, `Sobre`
- icône de recherche
- bouton `Enviar notícia`, seul bouton plein de la barre

`Blog` et `Catálogo` sont fusionnés dans `Músicas` ou descendus en pied de page, selon ce que révèle l'inventaire. `TV`, `Roda`, `Pesquisa` et `Sobre` sont réorganisés comme ci-dessus.

La navigation mobile n'est pas concernée et ne doit pas changer.

Le mini-player persistant reste en place, inchangé, quelle que soit la page.

---

## 6. Étape 3 : hero

Zone pleine largeur, hauteur cible entre 480 et 560 px, jamais dépendante de la hauteur du viewport.

Composition, de haut en bas dans la colonne gauche :

1. **Bandeau manchette** : filet vertical jaune de 2 px, puis `weekLabel`, séparateur, `newsHeadline`. Taille 12 px. Aucun nom de média.
2. **Sur-titre** : `A notícia desta semana virou música`, en lettrage espacé, 12 px, gris clair
3. **Titre créatif** : la valeur du champ titre existant, très grande taille
4. **Accroche** : `hookLine`, deux lignes maximum
5. **Rangée d'actions** :
   - `Assistir agora`, bouton jaune plein, seul élément saturé de la zone, icône lecture
   - `Entenda a notícia`, contour
   - paire segmentée `Letra` / `Cantar` dans un même conteneur bordé
   - durée en texte gris à droite
6. **Rangée plateformes** : libellé `Ouvir e seguir`, puis pastilles Spotify, Apple Music, YouTube Music. Fond transparent, bordure fine, icône en couleur de marque, texte gris clair. Puis une pastille icône seule pour le partage.

La colonne droite occupe environ quarante pour cent de la largeur et affiche `heroImage`.

**Contrainte de lisibilité, non négociable.** Un dégradé sombre est appliqué par le composant au-dessus de l'image, de la gauche vers la droite, opacité minimale 0,75 sur le tiers gauche. La lisibilité du titre ne doit jamais dépendre de la luminosité de l'image de la semaine. Vérifie ce comportement avec une image volontairement claire.

Le bouton `Assistir agora` ouvre la vidéo en overlay sur le site. Il ne doit pas rediriger vers YouTube.

`Letra` et `Cantar` ouvrent le composant `LyricsDialog` existant, respectivement sur l'onglet paroles et sur le mode karaoké. Réutilise le composant, ne le duplique pas.

---

## 7. Étape 4 : bande de contexte

Directement sous le hero, pleine largeur, trois colonnes d'égale largeur séparées par des filets d'un pixel.

Titres de colonnes, en jaune, 11 px : `O que aconteceu`, `Por que virou música`, `Como virou música`.
Contenu : une phrase par colonne, 13 px, gris clair.

La bande entière est cliquable et mène vers `Entenda a notícia`.

Comportement de repli défini en section 3.

---

## 8. Étape 5 : carrousel des semaines

Titre de section : `As notícias das últimas semanas`. Lien `Ver todas` aligné à droite.

Cinq cartes visibles, ratio 4:3, gap de 12 px. La carte de la semaine en cours porte une bordure jaune de 1,5 px.

Sous chaque cover : titre de la chanson, puis sur une ligne secondaire la date et la catégorie séparées par un point médian.

Pas de description, pas de compteur de vues, pas de compteur de likes, nulle part.

---

## 9. Étape 6 : roleta

Bande pleine largeur, fond légèrement plus clair que la page, filets en haut et en bas.

À gauche : titre `Não sabe o que ouvir`, puis une ligne secondaire indiquant le nombre de chansons du catalogue en toutes lettres et la mécanique.
À droite : bouton `Surpreenda-me`, jaune plein, icône de rafraîchissement.

C'est le second et dernier bouton jaune de la page. Aucun autre élément de la homepage ne doit utiliser le jaune en fond plein.

Le nombre de chansons est calculé dynamiquement, jamais codé en dur.

---

## 10. Étape 7 : pied de page

Ligne un : signature `Notícia. Humor. Música.` à gauche, décompte vers la prochaine publication à droite, formulé comme une promesse éditoriale et non comme une minuterie brute.

Ligne deux, en petit : `Arquivo 2026`, `Guia da paródia`, `Apprendre le portugais`, `Contato`.

Si l'heure de publication est dépassée et qu'aucune nouvelle chanson n'est parue, le décompte est masqué. Il ne doit jamais afficher une valeur négative ni `0d 00h 00m`.

---

## 11. Dimensions et points de rupture

- Ce spec s'applique à partir de 1024 px de large
- Conteneur de contenu : largeur maximale 1440 px, centré, marges latérales de 32 px
- En dessous de 1024 px, le layout mobile existant s'applique sans modification
- Entre 1024 et 1280 px : le carrousel passe de cinq à quatre cartes, la bande de contexte reste sur trois colonnes

---

## 12. Cas limites à traiter explicitement

1. Titre de chanson très long, plus de trente caractères : le titre se réduit par paliers, il ne déborde jamais et ne chevauche jamais l'image
2. `heroImage` claire sur toute sa surface : le dégradé garantit la lisibilité
3. Chanson sans vidéo : `Assistir agora` est remplacé par `Ouvir agora`, la durée n'est pas affichée
4. Aucune URL de plateforme : la rangée entière disparaît, y compris son libellé
5. Catalogue avec moins de cinq chansons : le carrousel affiche ce qui existe sans cases vides
6. Chargement lent de `heroImage` : couleur de fond unie, jamais de saut de mise en page
7. Décompte dépassé : masqué
8. Mode contraste élevé du système : les bordures fines restent visibles

---

## 13. Accessibilité

- Contraste minimum 4,5:1 pour tout texte au-dessus de 14 px, mesuré sur la zone la plus claire de l'image derrière lui
- Ordre de tabulation : navigation, puis actions du hero de gauche à droite, puis plateformes, puis contexte, puis carrousel, puis roleta, puis pied de page
- Anneau de focus visible sur tous les éléments interactifs, y compris les pastilles plateformes
- Les icônes seules portent un `aria-label` explicite
- Les icônes décoratives portent `aria-hidden`
- Le bandeau manchette est lu comme un seul groupe, pas comme trois fragments
- La bande de contexte cliquable est un lien, pas un div avec un gestionnaire de clic

---

## 14. Performance

- `heroImage` est l'élément LCP : chargement prioritaire, `fetchpriority="high"`, aucune animation d'entrée
- Formats modernes avec repli, largeurs multiples via `srcset`
- Tout ce qui est sous la ligne de flottaison est en chargement différé, y compris les covers du carrousel
- Aucune bibliothèque supplémentaire ajoutée pour le carrousel : défilement CSS natif
- Le poids total de la homepage ne doit pas augmenter de plus de quinze pour cent par rapport à la version actuelle. Mesure avant et après, et rapporte les deux chiffres.

---

## 15. SEO

- Le titre de la chanson, `newsHeadline`, `hookLine` et les trois phrases de contexte doivent figurer dans le HTML produit par `generate-stubs.cjs`, pas uniquement injectés au runtime
- Les balises Open Graph existantes sont conservées
- Un seul `h1` sur la page : le titre de la chanson de la semaine
- Vérification obligatoire avec le Google Rich Results Test ou `curl`, pas avec un outil de rendu JavaScript

---

## 16. Procédure de test

1. Lancer en local et vérifier chaque étape à 1280, 1440 et 1920 px de large
2. Simuler une chanson sans aucun des nouveaux champs et vérifier les sept comportements de repli de la section 3
3. Simuler une date sans publication dans le mois courant
4. Remplacer `heroImage` par une image blanche et vérifier la lisibilité du titre
5. Naviguer toute la page au clavier uniquement, du premier au dernier élément
6. Vérifier que le mini-player continue de jouer pendant la navigation entre les sections
7. Exécuter `generate-stubs.cjs` et inspecter le HTML produit avec `curl`
8. Mesurer le poids de page et le LCP avant et après

---

## 17. Critères d'acceptation

Chaque critère est vrai ou faux, sans interprétation.

- [ ] Le texte « Nenhuma música publicada » n'apparaît sur la homepage dans aucun état de données
- [ ] La page contient exactement deux boutons à fond jaune plein : `Assistir agora` et `Surpreenda-me`
- [ ] Les liens Spotify, Apple Music et YouTube Music sont présents, cliquables, et en traitement bordé et non plein
- [ ] `Assistir agora` ouvre la vidéo sur le site sans redirection externe
- [ ] `Letra` et `Cantar` ouvrent le composant `LyricsDialog` existant, sur le bon onglet
- [ ] La semaine et la manchette factuelle apparaissent au-dessus du titre créatif
- [ ] La bande de contexte affiche trois colonnes quand les données existent, et disparaît entièrement quand elles n'existent pas
- [ ] Le titre du hero reste lisible avec une image de fond entièrement blanche
- [ ] Aucun compteur de vues, de likes ou de partages n'est affiché
- [ ] Le nombre de chansons de la roleta est calculé dynamiquement
- [ ] Le décompte n'affiche jamais de valeur négative ou nulle
- [ ] Le layout en dessous de 1024 px est identique à celui d'avant la refonte, vérifié par comparaison visuelle
- [ ] Le mini-player fonctionne exactement comme avant
- [ ] Le HTML produit par `generate-stubs.cjs` contient le titre, la manchette et les phrases de contexte
- [ ] Aucun fichier du périmètre verrouillé de la section 1 n'a été modifié

---

## 18. Ce qui n'est pas dans ce spec

À ne pas implémenter, même si cela semble cohérent :

- le Top 10 et tout classement
- le vote sur la prochaine actualité
- les commentaires et les réactions
- la bande apprentissage du portugais, qui se limite ici à un lien texte en pied de page
- les cartes meme
- les comptes utilisateurs et les favoris
- la refonte de la page chanson, qui fera l'objet d'un spec distinct

---

## 19. Méthode de travail

Exécute les étapes dans l'ordre, de la section 4 à la section 10. Après chaque étape :

1. Montre le résultat visuel
2. Liste les fichiers modifiés
3. Attends ma validation avant de passer à la suivante

Ne regroupe pas plusieurs étapes dans un seul lot de modifications. Si une étape révèle un obstacle non prévu par ce spec, arrête-toi et décris le problème plutôt que de choisir seul une solution.
