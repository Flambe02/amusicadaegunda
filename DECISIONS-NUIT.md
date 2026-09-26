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
