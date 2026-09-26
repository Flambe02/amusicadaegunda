# Addendum au spec homepage desktop — arbitrages étape zéro

Ce document complète `spec-homepage-desktop.md`. En cas de contradiction, c'est l'addendum qui fait foi.

Périmètre inchangé : desktop uniquement, à partir de 1024 px. La branche `MobileHomeApp` et `mobileNavItems` ne sont touchées en aucun cas.

---

## 1. Mini-player

Mon spec était fondé sur une hypothèse fausse. Il n'existe pas de mini-player persistant, seulement un bloc `sticky bottom-4` interne à la branche desktop de `Home.jsx`.

**Décision : conserve le comportement exact d'aujourd'hui.** Il reste dans la homepage, il continue de disparaître à la navigation, il garde son mécanisme d'iframe YouTube masquée chargée au premier clic. Tu peux le déplacer dans l'arbre de la nouvelle homepage si la refonte l'impose, à condition que le comportement observable soit identique.

Le rendre réellement persistant est une fonctionnalité distincte, avec une duplication à résorber côté `Song.jsx`. Hors périmètre. Ne l'entreprends pas.

Le critère d'acceptation « le mini-player fonctionne exactement comme avant » se lit donc : même position, même déclenchement, même disparition à la navigation.

---

## 2. Images du hero

`cover_image` étant vide sur les soixante-quatre chansons, mon repli était inapplicable.

**Décision : `heroImage` devient un champ que je remplis à la main, chaque semaine, pour la chanson courante uniquement.** Une image large par semaine, pas soixante-quatre. Le catalogue rétroactif n'en aura jamais.

Chaîne de repli, dans cet ordre :

1. `heroImage` si présent
2. artwork généré au build par `getSongArtwork`, en recadrage large avec `object-fit: cover` et point d'ancrage centré
3. vignette YouTube en `hqdefault`, jamais `maxresdefault` qui renvoie une erreur sur une partie du catalogue
4. aplat de couleur unie de la charte, sans texte ni placeholder

Ne construis pas le hero sur une vignette de Short. Un cadre 9:16 recadré en 16:9 donne un résultat illisible. Si l'étape 2 de la chaîne échoue, passe directement à l'aplat.

**Inversion des champs.** Le rapport documente que `youtube_url` contient le lien YouTube Music et `youtube_music_url` le lien Shorts. Ne corrige pas cette inversion en base, elle sortirait du périmètre. Traite-la dans une fonction de lecture unique, isolée et commentée, et fais passer tous les usages de la homepage par elle.

**Quatorze chansons sans lien Shorts.** Elles n'ont donc pas de vidéo. Le cas limite 3 du spec s'applique : `Assistir agora` devient `Ouvir agora`, la durée n'est pas affichée, la lecture passe par le player audio existant.

---

## 3. Navigation

`Notícias` et `Enviar notícia` n'existent pas. Je ne veux ni lien mort, ni renvoi trompeur vers le blog.

**Décision : ils sortent de la barre.** Aucune fonctionnalité n'est créée.

Barre horizontale desktop, de gauche à droite :

- logo et nom du projet, qui est un lien vers la racine
- `Início`, `Músicas`, `Karaokê`, `Roda`, `Sobre`
- icône de recherche, qui reprend la route `Pesquisa` existante

`Catálogo` fusionne dans `Músicas`. `Blog`, `TV` et `Aprender` descendent en pied de page et gardent leurs routes actuelles. Aucune route n'est supprimée, aucune redirection n'est ajoutée.

Conséquence sur le jaune : la barre de navigation n'a plus de bouton plein. La page conserve donc exactement deux boutons jaunes, `Assistir agora` et `Surpreenda-me`, ce qui renforce le critère d'acceptation d'origine.

---

## 4. Balise h1

**Décision : oui, modifie `generate-stubs.cjs`.**

- le `h1` injecté devient le titre de la chanson de la semaine
- le nom du projet passe en `p` ou en texte de lien de marque, jamais en titre
- supprime le `h1` de marque du bloc masqué à `Home.jsx:639`, ainsi que le bloc lui-même
- supprime également le bloc mort `shouldRenderLegacyDesktop` à `Home.jsx:1183`

Garde-fou de non-régression, à vérifier par `curl` avant et après : le HTML statique doit continuer à contenir le nom du projet, la phrase de présentation, les douze catégories en liens, et les huit chansons récentes en liens. Seul le niveau de titre change.

---

## 5. Deux points que ton rapport soulève sans les poser

**`SongListItem` est un `button`.** Les cartes du carrousel doivent être des balises `a` avec un `href` réel vers `/musica/:slug/`. C'est ce qui rend le catalogue explorable par un moteur de recherche et ouvrable dans un nouvel onglet. Conversion à faire dans le cadre de l'étape 5, en conservant le comportement de clic actuel.

**Le message vide de `HistoryDrawer.jsx:151` entre dans le périmètre.** Le tiroir s'ouvre depuis la homepage, il applique donc la même règle que l'étape 1 : bascule sur le mois complet le plus récent, ou masquage. Aucune formulation d'absence de publication ne doit être visible depuis la homepage.

---

## 6. Ordre d'exécution confirmé

Démarre par l'étape 1, la correction de l'état vide, y compris `HistoryDrawer`. Livre-la seule et arrête-toi.

Les étapes 2 à 7 suivent ensuite, une par une, avec validation entre chacune.
