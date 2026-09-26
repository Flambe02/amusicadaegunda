# Modo Aprender — état des lieux et plan d'exécution

Document vivant. Mis à jour à chaque lot. Référence produit : `plan-apprendre-portugais-amusicadasegunda.md` (racine du repo).

## ⚠️ Pivot (à lire en premier)

Le « Lot C » décrit plus bas (parcours guidé en 7 étapes : intro → écoute → compréhension →
exercices → répétition → karaokê → résultat) **a été audité puis abandonné** après un test
utilisateur réel : trop scolaire, le karaokê n'arrivait qu'en 7ᵉ position sur 8, deux écrans
entiers sans aucun son. Remplacé par un MVP radicalement plus simple : **un seul écran**,
`/apprendre/:slug` monte directement `KaraokePlayer` en `learningMode` (traduction FR forcée
+ pastille « découverte » ≤3 par chanson, ouvrant une micro-carte légère). Voir le rapport
d'audit et le détail technique dans l'historique de conversation ; le reste de ce document
(Lot A/B/C ci-dessous) est conservé comme **trace historique** de ce qui a été essayé et
pourquoi — les fichiers `src/components/learn/lesson-steps/*` et `src/lib/learnProgress.js`
existent toujours dans le repo mais ne sont plus importés nulle part.

## 0. Constat de départ (important)

Contrairement à ce que l'on pourrait supposer en lisant uniquement le document produit, **une bêta « Modo Aprender » existe déjà et est mergée sur `main`** (commit `e9e376ec feat(learn): add Modo Aprender beta`). Ce document part de cet existant : il ne le recrée pas.

Ce qui existe déjà et qui est **conservé tel quel** :
- Contenu pédagogique par chanson en JSON versionné (`src/content/learn/<slug>.json`) pour 2 chansons : `eu-sou-um-ovo`, `camarada-quer-cpf`.
- `src/lib/learnContent.js` : chargement + validation fail-closed du contenu (`buildLearnIndex`, `buildStudySheet`).
- `LearnPanel` (lecture ligne à ligne, tap pour révéler la traduction, expressions, contexte culturel) et `StudySheetPanel` (objectif, point de grammaire, exercices, résumé) — montés comme onglets `Aprender` / `Ficha` dans `LyricsDialog`, sur la page chanson (`/musica/:slug`).
- `src/lib/vocabNotebook.js` + `VocabNotebookSheet` : carnet de vocabulaire localStorage, alimenté par un tap-to-collect pendant le karaoké (`KaraokePlayer.jsx`) et consultable depuis le mode lecture.
- Landing `/apprendre` (`src/pages/Apprender.jsx`) : hero, liste des 2 chansons pilotes avec pastilles d'expressions, formulaire d'inscription Buttondown.
- Suite de tests dédiée (`src/**/__tests__/*learn*`, `vocabNotebook.test.js`, `Apprender.test.jsx`, etc.).

## 1. Architecture existante

**Stack** : React 18 + Vite 6, JavaScript majoritairement (`.jsx`/`.js`), quelques fichiers `.ts` isolés et opportunistes (pas de `tsconfig.json` racine, pas de script `typecheck`). Tailwind CSS pour le style, shadcn/ui (Radix) pour les primitives (`src/components/ui/*`). `react-router-dom` v7, routes centralisées dans `src/config/routes.js` (tableau `ROUTES`, lazy-loading systématique sauf `Home`). Pas de state manager global — state local + hooks + quelques Context ciblés (admin).

**Chansons / paroles / karaoké** :
- `Song.getBySlug(slug)` (`src/api/entities.js` → `src/api/supabaseService.js`) charge une chanson depuis Supabase, avec repli sur `content/songs.json` (statique, sans `lrc_content`).
- `src/lib/lrc.js` : parsing LRC, `isKaraokePublished(song)`, `resolveLyricsText(song)`.
- `src/lib/timingModel.js` : `resolveSongTiming(song)` → lignes unifiées (`timing_data` structuré si présent, sinon `parseLrc(lrc_content)`). C'est la même source utilisée par le karaoké ET par `LearnPanel`.
- `src/components/karaoke/KaraokePlayer.jsx` : lecteur karaoké complet, déjà câblé au carnet de vocabulaire (tap-to-collect une expression active pendant le chant).
- Montage : la page chanson (`src/pages/Song.jsx`) rend `<KaraokePlayer song={song} onClose={...} />` conditionnellement (`isKaraokeOpen && hasKaraoke`). C'est le pattern réutilisé pour la leçon pilote plutôt que de dupliquer le lecteur.

**Supabase** : client dans `src/lib/supabase.js`. Tables migrées : uniquement `songs` (+ colonnes karaoké/timing), `festa_queue`, `push_subscriptions`. **Aucune table `lessons`/`expressions`/`exercises`/`user_lesson_progress`** — choix délibéré déjà documenté dans le code (`learnContent.js` : « le générateur de stubs lit des fichiers locaux, et une panne Supabase ne doit pas vider le mode Aprender »).

**Authentification** : uniquement admin (`supabase.auth` + table `admins`, `ProtectedAdmin.jsx`). Aucun compte visiteur/apprenant.

**Persistance locale** : pas de wrapper générique. Pattern à suivre = `src/lib/vocabNotebook.js` (clé namespacée `-v1`, lecture/écriture toujours dans un `try/catch`, dégradation silencieuse, jamais de throw vers l'appelant).

**Analytics** : `src/lib/analytics.js` → `trackEvent(name, params)`, wrapper fin sur `window.gtag`, no-op si absent. Utilisé ailleurs (`Karaoke.jsx`, `useAppUpdate.jsx`) mais **jamais appelé dans le code Modo Aprender actuel** — terrain vierge.

**Admin** : `src/components/admin/*` a un pattern CRUD générique (liste + formulaire modal + drawer de détail + dialog de suppression) pour les chansons, réutilisable plus tard pour des leçons. Rien n'existe aujourd'hui pour éditer le contenu pédagogique — c'est du JSON édité à la main.

## 2. État actuel de `/apprendre` face au plan produit

| Fonctionnalité du plan | État | Détail |
|---|---|---|
| Landing avec hero, proposition de valeur | partiel | Hero présent, mais pas le hero exact du plan (§5.1), pas de bloc « Comment ça marche », pas d'aperçu interactif |
| Cartes de leçon avec niveau/durée/thème/progression | absent | La landing liste juste les 2 titres + pastilles d'expression, pas de niveau/durée/état |
| Parcours en étapes (intro → écoute → compréhension → exercices → répétition → karaoké → résultat) | absent | Ce qui existe est un **contenu consultable** (2 onglets dans une modale sur la page chanson), pas une **séquence guidée** avec navigation, progression et écran de résultat |
| Question de compréhension globale après 1ère écoute | absent | — |
| Compréhension ligne à ligne avec traduction/explication | existant | `LearnPanel`, réutilisable tel quel |
| Exercices variés (≥3 types) | partiel | `StudySheetPanel` : 2 types (`multiple_choice`, `fill_blank`) |
| Répétition (écouter/afficher/marquer répété) | absent | — |
| Karaoké intégré à la leçon | existant (réutilisable) | `KaraokePlayer` déjà monté par chanson sur `/musica/:slug` ; il suffit de le monter pareil depuis la leçon |
| Écran de résultat | absent | — |
| Progression sans compte (localStorage) | partiel | Existe pour le carnet de vocabulaire, **pas** pour l'état d'une leçon (étape courante, score, reprise) |
| Carnet de vocabulaire | existant | `vocabNotebook.js` + `VocabNotebookSheet`, fonctionnel |
| Révision espacée | reporté | Hors périmètre de ce lot (Phase 4 du plan), et déjà noté comme volontairement absent dans le code existant |
| Analytics dédiés | absent | `trackEvent` existe, aucun événement `learn_*` n'est envoyé |
| Back-office pédagogique | absent | Contenu = JSON à la main, pas d'UI admin |
| Tables Supabase dédiées | reporté (décision actée) | Design volontaire : JSON versionné + localStorage, pas de Supabase pour le contenu pédagogique en bêta |

## 3. Décisions techniques retenues pour ce lot

- **Modèle pédagogique** : pas de nouvelles interfaces TypeScript strictes — le projet est JS avec JSDoc opportuniste et sans étape de typecheck. On prolonge la convention existante : JSDoc typedefs (unions discriminées via `@typedef` sur `type`) directement dans `src/lib/learnContent.js`, à côté de `buildLearnIndex`/`buildStudySheet` déjà documentés de la même façon. Cohérent avec « respecte strictement les conventions du dépôt ».
- **Contenu pédagogique** : extension **additive** des fiches JSON existantes (`src/content/learn/<slug>.json`) avec un bloc `lesson_meta` (niveau, durée, thème, objectifs, question de compréhension globale, phrases de répétition). Les validateurs existants (`buildLearnIndex`, `buildStudySheet`) ne changent pas de contrat ; un nouveau validateur fail-closed `buildLessonMeta()` s'ajoute à côté.
- **Progression sans compte** : nouveau module `src/lib/learnProgress.js`, calqué sur `vocabNotebook.js` (clé `learn-progress-v1`, try/catch systématique, fonctions pures, jamais de throw). Une entrée par leçon : `status`, `currentStepId`, `completedStepIds`, `exerciseAnswers`, `score`, `startedAt`, `completedAt`, `lastActivityAt`.
- **Synchronisation Supabase après connexion** : hors périmètre — il n'existe aucun compte visiteur dans le projet ; en créer un serait un chantier d'auth à part entière, non demandé par ce lot et non couvert par le plan comme prioritaire (§14 : « ne pas repousser le MVP »). Le module `learnProgress.js` est écrit pour qu'un futur sync Supabase puisse lire/écrire le même shape sans réécriture.
- **Navigation entre étapes** : `ApprenderLesson.jsx` pilote un tableau ordonné d'étapes (`STEPS`) et fait le switch de rendu lui-même ; chaque étape est un sous-composant pur dans `src/components/learn/lesson-steps/` (props in, callback `onComplete` out). Pas de composant `LessonStepRenderer` séparé (un seul point d'appel, l'abstraction n'aurait rien ajouté) ni de routeur imbriqué (pas de sous-routes par étape) — l'étape courante vit dans l'état de la page + `learnProgress`, plus simple à reprendre après rafraîchissement.
- **Exercices** : `buildStudySheet` étendu avec un 3ᵉ type `true_false` (vrai/faux), en plus de `multiple_choice` et `fill_blank` déjà là. Réutilisé à la fois par `StudySheetPanel` (déjà en prod) et par l'étape Exercices de la leçon — améliore l'existant plutôt que de le dupliquer.
- **Karaoké** : la leçon monte `<KaraokePlayer song={song} onClose={...}/>` exactement comme `Song.jsx`, aucune duplication du moteur de sync.
- **Répétition (MVP)** : affiche les 2-3 expressions ciblées de la leçon (texte + sens), un bouton « Já repeti » qui coche l'état dans `learnProgress`, et remonte le lecteur YouTube existant (`YouTubeEmbed`) pour ré-écouter la chanson pendant l'exercice — pas de tentative de seek précis vers un timestamp (ni `YouTubeEmbed` ni `KaraokePlayer` n'exposent d'API « jouer ce segment » sans travail d'intégration conséquent) et pas d'enregistrement micro dans ce lot (le plan l'autorise en option seulement « si simple et robuste » — reporté, noté ci-dessous).
- **Analytics** : appels directs à `trackEvent()` (pas de nouvelle couche d'abstraction) avec les noms d'événements du plan (§8/§11), documentés en §6 ci-dessous.
- **Compatibilité multi-langues future** : les champs de traduction restent des chaînes `*_fr` nommées explicitement (pas `translation: {fr: ...}` généralisé) — cohérent avec le contenu déjà en prod ; une extension multilingue restera un renommage de champs contenu, pas une réécriture du moteur.

## 4. Ce qui est explicitement reporté (hors de ce lot)

- Compte utilisateur visiteur / sync Supabase de la progression.
- Révision espacée (Phase 4 du plan).
- Back-office pédagogique (Phase 6).
- Prononciation avec score (Phase 7) — MVP répétition sans micro.
- Deuxième leçon industrialisée / back-office (Phase 5-6) — le contenu `camarada-quer-cpf` n'a volontairement pas reçu de `lesson_meta` fabriqué dans ce lot (voir Lot A ci-dessous) ; il reste utilisable via les onglets Aprender/Ficha existants.
- Landing « aperçu interactif » embarqué (§5.4 du plan) — la landing gagne le bloc « Comment ça marche » et des cartes de leçon avec état, mais pas un mini-exercice live sur la page elle-même.

## 5. Checklist d'exécution (ce lot)

### Lot A. Fondations
- [x] `src/lib/learnContent.js` : ajout `buildLessonMeta()` (validation fail-closed) — fichiers concernés : `src/lib/learnContent.js`, `src/lib/__tests__/learnContent.test.js`
- [x] `src/lib/learnContent.js` : `buildStudySheet()` étendu au type `true_false`
- [x] `src/content/learn/eu-sou-um-ovo.json` : bloc `lesson_meta` complet
- [ ] `src/content/learn/camarada-quer-cpf.json` : bloc `lesson_meta` — **non fait dans ce lot**. Décision : plutôt que d'y mettre un `TODO_CONTENT` (qui exigerait quand même une question de compréhension avec une « bonne » réponse fabriquée — c'est exactement le type de contenu définitif inventé que la mission interdit), le fichier reste inchangé. `buildLessonMeta()` renvoie `null`, la carte affiche « Em breve » sur la landing, `/apprendre/camarada-quer-cpf` affiche « Aula indisponível ». Reste utilisable via les onglets Aprender/Ficha existants.
- [x] `src/lib/learnProgress.js` : store localStorage de progression de leçon, tests dédiés

### Lot C. Leçon pilote (priorité — c'est la première livraison)
- [x] Route `/apprendre/:slug` → `src/pages/ApprenderLesson.jsx`, enregistrée dans `src/config/routes.js` (+ `getCurrentPage()`)
- [x] Étapes en composants séparés (`src/components/learn/lesson-steps/`) : `IntroStep`, `ListeningStep`, `UnderstandingStep` (enveloppe `LearnPanel`), `ExerciseStep` (réutilise `ExerciseItem`/`buildStudySheet`, 3 types dont `true_false`), `RepetitionStep`, `KaraokeStep` (monte `KaraokePlayer` existant), `ResultStep`
- [x] Reprise d'une leçon commencée (lecture de `learnProgress` au montage) — testé (`ApprenderLesson.test.jsx`)
- [x] Événements analytics à chaque transition d'étape

### Lot B. Landing (amélioration, pas refonte totale)
- [x] Bloc « Comment ça marche » (3 étapes : Escute / Entenda / Cante e pratique)
- [x] Cartes de leçon avec niveau, durée, thème, état de progression, CTA vers `/apprendre/:slug` (ou repli `/musica/:slug` si pas de `lesson_meta`)
- [x] Événement `learning_landing_viewed` / `lesson_card_clicked` / `signup_prompt_viewed`

### Lot D. Carnet / progression
- [x] Déjà existant (`vocabNotebook.js`) — analytics `expression_saved` ajouté au point de collecte existant (`KaraokePlayer.jsx`)

### Qualité
- [x] Tests ajoutés : `learnProgress.test.js` (14 tests — persistence, reprise, dégradation storage), `buildLessonMeta`/`true_false` dans `learnContent.test.js` (+19 tests), `ExerciseItem.test.jsx` (4 tests, rendu `true_false`), `ApprenderLesson.test.jsx` (5 tests — parcours, sauvegarde par étape, reprise, fail-closed)
- [x] Tests existants mis à jour sans changement de comportement pour les cas déjà couverts : `Apprender.test.jsx` (nouvelle cible de lien pour la leçon pilote), `StudySheetPanel.jsx` refactorée (moteur d'exercice extrait dans `ExerciseItem.jsx`) — `StudySheetPanel.test.jsx` repasse sans modification
- [x] Lint — 0 erreur, 1 warning attendu (`ExerciseItem.jsx` exporte un composant + un helper, warning fast-refresh non bloquant)
- [x] Tests unitaires — chaque fichier touché relancé individuellement avec `--pool=forks` (convention projet), tous verts
- [x] Build (`npx vite build`) — succès, nouveaux chunks `ApprenderLesson`, `ExerciseItem`, `learnProgress` correctement séparés (lazy-loading confirmé)

## 6. Événements analytics instrumentés

| Événement | Où | Propriétés |
|---|---|---|
| `learning_landing_viewed` | `Apprender.jsx` au montage | — |
| `lesson_card_clicked` | `Apprender.jsx`, clic sur une carte | `lesson_slug`, `lesson_status` |
| `lesson_started` | `ApprenderLesson.jsx`, première visite d'une leçon | `lesson_slug` |
| `lesson_resumed` | `ApprenderLesson.jsx`, reprise d'une leçon en cours | `lesson_slug`, `step_id` |
| `lesson_step_viewed` | `ApprenderLesson.jsx`, à chaque étape affichée | `lesson_slug`, `step_id`, `step_type` |
| `lesson_step_completed` | `ApprenderLesson.jsx`, à chaque étape validée | `lesson_slug`, `step_id`, `step_type` |
| `exercise_answered` | `ExerciseStep.jsx`, par exercice corrigé | `lesson_slug`, `exercise_index`, `exercise_type`, `correct` |
| `expression_saved` | `KaraokePlayer.jsx`, au moment de `addVocabEntry` (collecte pendant le chant) | `expression_id`, `song_slug` |
| `pronunciation_completed` | Étape Répétition, phrase marquée répétée | `lesson_slug`, `expression_id` |
| `karaoke_started` | Étape Karaoké, ouverture de `KaraokePlayer` | `lesson_slug`, `song_slug` |
| `lesson_completed` | Étape Résultat affichée | `lesson_slug`, `score`, `duration_seconds` |
| `signup_prompt_viewed` | `Apprender.jsx`, affichage du formulaire Buttondown | — |

Ne collecte aucun texte libre ni donnée vocale.

## 7. Variables d'environnement

Aucune nouvelle variable requise (contenu statique + localStorage + `window.gtag` déjà configuré).

## 8. Prochaines tâches recommandées (après ce lot)

1. Écrire le `lesson_meta` de `camarada-quer-cpf` (niveau, durée, thème, objectifs, question de compréhension) avec un vrai contenu éditorial — volontairement non fabriqué dans ce lot — et faire relire les deux fiches par un locuteur natif.
2. Répétition : explorer un vrai « jouer ce segment » (timestamp start/end) si `YouTubeEmbed`/`KaraokePlayer` gagnent une API de seek exploitable — actuellement hors de portée sans risque de casser la lecture existante.
3. Back-office pédagogique (Phase 6) une fois une 3ᵉ chanson demandée, pour ne plus éditer le JSON à la main.
4. Décider si/quand un compte visiteur (hors admin) est prioritaire avant de construire la sync Supabase de la progression.
