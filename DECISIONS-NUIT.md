# Décisions de la nuit du 2026-09-26 (refonte mobile, travail en autonomie)

Chaque décision qui revenait normalement à Florent : la question, l'option choisie (la plus prudente et la plus simple, cohérente avec la spec, l'addendum, PRODUCT.md et DESIGN.md), pourquoi, et comment revenir en arrière.

---

## 1. Suite de tests « en une seule commande » en local

- **Question** : la règle est de lancer la suite complète en une commande, comme la CI (`npm run test:run`, pool threads). En local (dossier OneDrive), ce lancement se fige après 16 fichiers, sans erreur (resté bloqué 4 h). Le même blocage survient avec `--pool=forks` en parallèle. Lancés un par un, les 70 fichiers passent tous.
- **Option choisie** : en local, la suite complète est lancée en une seule commande avec les fichiers exécutés l'un après l'autre : `npx vitest run --pool=forks --no-file-parallelism` (≈ 5 min, un seul verdict, erreurs non gérées comprises). La CI GitHub garde `npm run test:run` et reste la référence : elle est vérifiée après chaque push.
- **Pourquoi** : c'est la commande la plus proche de la CI qui aboutit sur cette machine (la CI exécute aussi les fichiers l'un après l'autre, `singleThread`) ; aucun fichier de configuration n'est modifié.
- **Revenir en arrière** : rien à défaire (aucun fichier changé). Pour réessayer la commande exacte de la CI : `npm run test:run`.

## 2. Étape 5 — sur quelles chansons afficher la ligne de karaokê du feed

- **Question** : la règle de la nuit dit « si tu ne peux pas vérifier la synchronisation d'une chanson, la ligne n'est pas affichée ». Je ne peux pas écouter.
- **Option choisie** :
  - **chanson sans Short** : ligne affichée. Le feed y joue `youtube_url`, qui est la vidéo même du lecteur karaokê, et lit le même timing (`resolveSongTiming`). La synchro est identique par construction. Aujourd'hui, une seule chanson est concernée : « O Croissant » ;
  - **Short** (26 chansons) : ligne masquée. Un Short est un extrait de la chanson, avec un décalage inconnu par rapport aux paroles. On l'active chanson par chanson après ton test, dans une liste dédiée (`FEED_KARAOKE_SHORT_VERIFIED_SLUGS`).
- **Pourquoi** : cela applique la règle à la lettre. On ne montre jamais des paroles décalées ; la ligne existe et fonctionne, et il ne reste qu'à l'activer.
- **Revenir en arrière** :
  - pour activer un Short vérifié : ajouter son slug dans `src/components/mobile/feed/feedKaraoke.js` (`FEED_KARAOKE_SHORT_VERIFIED_SLUGS`) ;
  - pour tout afficher sans vérification : dans `canShowFeedKaraoke`, renvoyer `true` pour `mode === 'video'`.

## 3. Catálogo — alignement du titre

- **Question** : maintenant que le titre a sa propre ligne, faut-il l'aligner à gauche ou le centrer ?
- **Option choisie** : centré, comme la colonne du bas (barre et boutons centrés) et le texte d'accueil « Toque em mim… ».
- **Pourquoi** : c'est cohérent avec le reste de la colonne centrée sous la Caipivara.
- **Revenir en arrière** : dans `CaipivaraStage.jsx`, bloc du titre : remplacer `justify-center` par `justify-start` et ajouter `text-left`.

## 4. Bannière « Instalar no iPhone » au-dessus du Catálogo (non modifiée)

- **Constat** : pour un nouveau visiteur sur iPhone, la bannière d'installation (qui existait déjà, `InstallAppBanner.jsx`, fixée à 88 px du bas) recouvre la barre de progression et les boutons du Catálogo, jusqu'à ce qu'on la ferme.
- **Option choisie** : ne rien changer cette nuit. Cette bannière est hors du périmètre de la refonte et se ferme d'un tap. Elle est notée dans `TODO-apres-refonte.md`.
- **Revenir en arrière** : sans objet.

## 5. Étape 7 — où appliquer le restyle du lecteur karaokê

- **Question** : `KaraokePlayer` sert au desktop, à la TV, à la page d'une chanson et au Modo Aprender. Où appliquer le style mobile ?
- **Option choisie** : seulement sur l'écran ouvert depuis O Palco (onglet Karaokê mobile), avec une prop `mobileShell` passée par la copie mobile de `/karaoke`. Le lecteur ouvert depuis la page d'une chanson ou depuis une leçon Aprender garde son style actuel.
- **Pourquoi** : c'est le plus prudent pour tenir « desktop identique, TV identique ». Sans cette prop, le rendu est inchangé, et un test le vérifie. C'est aussi le parcours décrit par la spec (onglet Karaokê actif).
- **Revenir en arrière** : retirer `mobileShell` dans `src/pages/Karaoke.jsx` (copie mobile). Tout le reste dépend de cette prop.

## 6. Étape 7 — contenu de la barre de contrôle mobile

- **Question** : la spec prévoit « revenir d'une ligne, pause, Aprender ». Que deviennent Voltar 10 s, Repetir, Mixer et Finalizar ?
- **Option choisie** : sur mobile, la barre du bas contient exactement « Linha anterior », Pausar et Aprender (seulement pour une chanson avec fiche). Le Mixer reste accessible par l'icône de l'en-tête (déjà présente), et « Voltar » en haut à gauche ferme le lecteur. La note d'énergie reste affichée à la fin naturelle de la chanson quand le medidor est actif.
- **Pourquoi** : c'est la lecture littérale de la spec, avec un seul jaune (la pause).
- **Revenir en arrière** : dans `KaraokePlayer.jsx`, bloc `data-km-controls="mobile"` : ajouter les boutons voulus (ceux du `footer.km-controls` desktop, juste en dessous).

## 7. Étape 7 — ce que fait « Aprender »

- **Question** : le bouton Aprender doit-il ouvrir le panneau Aprender de Letra, ou la leçon ?
- **Option choisie** : un lien vers la leçon de la chanson (`/apprendre/<slug>`, l'écran Modo Aprender existant), qui met la musique en pause. La détection est celle du panneau Letra (`hasLearnContent`) : aujourd'hui « Camarada Quer CPF » et « Eu Sou um Ovo ».
- **Pourquoi** : c'est l'écran existant le plus simple et le plus complet, sans nouveau panneau à superposer au lecteur.
- **Revenir en arrière** : remplacer le `<Link>` du bloc mobile par un bouton qui ouvre ce que tu préfères.

## 8. Étape 7 — lignes au-delà de la suivante

- **Question** : la spec fixe les lignes chantées à 30 % et la suivante à 72 %, sans rien dire des lignes plus loin.
- **Option choisie** : 40 % de blanc, soit entre les deux. Les deux lignes déjà chantées restent visibles à 30 %.
- **Revenir en arrière** : `mShellColor` dans `KaraokePlayer.jsx`.

## 9. Étape 12 — critère « Lighthouse mobile ≥ main » non tenu sur la performance

- **Constat** : l'accessibilité est meilleure (100 contre 99), le SEO est égal (100), mais la performance est plus basse sur l'accueil (médiane ≈ 39 contre 49) et sur `/karaoke` (≈ 51 contre 58). Le CLS de l'accueil vaut 0,32 dans la plupart des mesures.
- **Option choisie** : ne rien changer en profondeur cette nuit. L'écart vient surtout du feed vidéo, qui est le choix produit. Une tentative contre le CLS (voisines cachées au repos) n'a rien changé à la mesure : elle a été annulée, pour ne pas toucher au geste de glissement juste avant ton test. Détail et pistes : `TODO-apres-refonte.md` §14.
- **Revenir en arrière** : sans objet (aucun changement conservé).

## 10. Étape 5 — comment juger la synchro des Shorts sans les afficher

- **Question** : la ligne est masquée sur les Shorts tant qu'ils ne sont pas vérifiés. Comment les vérifier sans la voir ?
- **Option choisie** : un mode de vérification limité au serveur de dev (`import.meta.env.DEV`, donc absent du build de production). Sur https://192.168.0.163:5443/, ouvrir `/?musica=<slug>&verificar-karaoke=1` : la ligne s'affiche sur tous les Shorts pendant la session, et `?verificar-karaoke=0` l'arrête.
- **Pourquoi** : c'est le moyen le plus simple de faire ton test chanson par chanson, sans rien exposer aux visiteurs.
- **Revenir en arrière** : supprimer `isShortsVerifyMode` dans `feedKaraoke.js` et son appel dans `canShowFeedKaraoke`.
