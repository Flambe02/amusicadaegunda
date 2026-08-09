# Ajouter une leçon au Modo Aprender

Guide pratique pour ajouter une nouvelle leçon guidée (`/apprendre/:slug`), sans toucher aux composants React. Voir `docs/apprendre-implementation-status.md` pour le contexte produit et les décisions techniques.

Une leçon = un fichier JSON dans `src/content/learn/<slug>.json`, où `<slug>` est le slug canonique de la chanson (celui de son URL publique `/musica/<slug>`, obtenu avec `deriveSongSlug({ title })` dans `src/lib/learnContent.js`).

## 1. Associer une chanson

- La chanson doit exister dans Supabase (table `songs`), avec un titre publié.
- Vérifie que son karaoké est synchronisé (`lrc_content` ou `timing_data` renseigné, `karaoke_published !== false`) si tu veux que l'étape Karaoké de la leçon fonctionne — sinon elle affichera « Karaokê indisponível » et restera franchissable (pas bloquant).
- Ajoute le slug à `LEARN_SLUGS` dans `src/lib/learnContent.js`.

## 2. Créer le fichier de fiche

Copie la structure de `src/content/learn/eu-sou-um-ovo.json` comme modèle. Champs obligatoires :

```json
{
  "slug": "<slug>",
  "title": "<Titre affiché>",
  "lrcLineCount": <nombre exact de lignes LRC>,
  "segments": [ { "from": 0, "to": 1, "fr": "...", "expression_id": "..." } ],
  "expressions": [ { "id": "...", "term": "...", "meaning_fr": "...", "register": "..." } ],
  "cultural_context_fr": "...",
  "study_sheet": { ... },
  "lesson_meta": { ... }
}
```

`lrcLineCount` doit correspondre EXACTEMENT au nombre de lignes que renvoie `resolveSongTiming(song).lines` pour cette chanson (voir `src/lib/timingModel.js`). Un écart désactive tout le Modo Aprender pour cette chanson (garde-fou fail-closed dans `buildLearnIndex`) — plutôt que d'afficher une traduction décalée.

## 3. Définir le niveau, la durée, le thème et les objectifs

Bloc `lesson_meta` (validé par `buildLessonMeta()` dans `src/lib/learnContent.js`) :

```json
"lesson_meta": {
  "level": "A1-A2",
  "duration_minutes": 8,
  "theme": "nourriture, prix, frustration",
  "learning_goals": ["Comprendre et utiliser cadê", "..."],
  "comprehension_question": {
    "prompt_pt": "Sobre o que fala a música, principalmente?",
    "options": [
      { "text": "...", "correct": true },
      { "text": "...", "correct": false }
    ]
  },
  "repetition_expression_ids": ["cade", "tempero"]
}
```

`repetition_expression_ids` est optionnel : sans lui, l'étape Répétition utilise toutes les `expressions` de la fiche. `comprehension_question.options` doit contenir exactement une option `correct: true`.

Sans `lesson_meta` valide, la fiche reste utilisable dans les onglets Aprender/Ficha de la page chanson (`LyricsDialog`), mais `/apprendre/:slug` affiche « Aula indisponível » — c'est l'état actuel de `camarada-quer-cpf.json`, en attente d'un vrai `lesson_meta` édité.

## 4. Ajouter les expressions

Dans `expressions` (racine du fichier), 3 à 5 entrées :

```json
{ "id": "cade", "term": "cadê", "meaning_fr": "...", "register": "familier" }
```

`id` doit être unique dans la fiche — c'est lui qui relie une `expression_id` de `segments` (traduction ligne à ligne) et les identifiants utilisés par le carnet de vocabulaire (`vocabNotebook.js`).

## 5. Ajouter les passages (traduction ligne à ligne)

Dans `segments` : chaque entrée couvre une plage `[from, to]` INCLUSIVE d'index de lignes LRC (0-indexé), avec une traduction française pour le groupe entier. Les plages doivent couvrir toutes les lignes sans trou ni recouvrement (garde-fous `buildLearnIndex`). `expression_id` est optionnel — ne l'ajoute que sur les plages qui introduisent une des expressions ci-dessus.

## 6. Ajouter les exercices

Dans `study_sheet.exercises` (au moins 3, idéalement 5-8 dans une leçon complète), trois types possibles :

- `multiple_choice` : `{ "type": "multiple_choice", "prompt_pt": "...", "options": [{ "text": "...", "correct": true|false }] }` — exactement une option `correct: true`.
- `fill_blank` : `{ "type": "fill_blank", "prompt_pt": "...", "answer": "...", "distractors": ["...", "..."] }` — `distractors` optionnel (champ libre sinon).
- `true_false` : `{ "type": "true_false", "prompt_pt": "...", "answer": true|false }`.

## 7. Ajuster les timings

Rien à faire ici si le karaoké de la chanson est déjà synchronisé (Workshop admin existant, voir `project_karaoke.md`) — la leçon guidée réutilise les mêmes lignes que le karaoké (`resolveSongTiming`), aucune synchronisation séparée à faire.

## 8. Tester la leçon

En local :

1. `npm run dev`
2. Ouvre `/apprendre` — la carte de la chanson doit apparaître avec niveau/durée/thème et le bouton « Começar »/« Continuar » (pas « Em breve »).
3. Ouvre `/apprendre/<slug>` et parcours les 7 étapes une fois : introduction, écoute + question, compréhension, exercices, répétition, karaoké, résultat.
4. Vérifie la reprise : recharge la page en cours de leçon, la progression doit reprendre à la même étape (stockée dans `localStorage`, clé `learn-progress-v1`).
5. Vérifie que `buildLearnIndex`/`buildStudySheet`/`buildLessonMeta` renvoient bien un résultat non-null pour cette fiche — le plus simple est d'ajouter le fichier JSON aux fixtures de `src/lib/__tests__/learnContent.test.js` et de lancer `npx vitest run --pool=forks src/lib/__tests__/learnContent.test.js` (voir `project_local_validation_playbook.md` — toujours `--pool=forks`, jamais le pool `threads` par défaut sur ce chemin OneDrive).

## 9. Publier la leçon

Aucune étape de publication séparée : le contenu est versionné dans le repo (`src/content/learn/<slug>.json`), donc il part en production au prochain déploiement (`npm run deploy`, jamais `npm run build` seul en local — voir `feedback_deploy_workflow.md` / `project_local_validation_playbook.md`). Il n'y a pas de statut brouillon/publié séparé pour l'instant : dès que le fichier est mergé sur `main` avec un `lesson_meta` valide et le slug dans `LEARN_SLUGS`, la leçon est visible.

## Limites actuelles (à connaître avant d'ajouter du contenu)

- Pas d'interface d'administration pour ce contenu — édition JSON directe uniquement (Phase 6 du plan produit, reportée).
- Pas de compte visiteur ni de synchronisation multi-appareil de la progression — tout est en `localStorage`.
- L'étape Répétition n'offre pas de lecture précise d'un segment audio (pas de seek start/end) — elle réaffiche le lecteur YouTube complet de la chanson.
