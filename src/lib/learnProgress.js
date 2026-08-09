/**
 * Progression d'une leçon guidée (`/apprendre/:slug`) — stockage `localStorage`, pas
 * de compte, pas de synchronisation multi-appareil (même choix que le carnet de
 * vocabulaire, voir `vocabNotebook.js`). Une entrée par leçon (clé = `songSlug`).
 *
 * Dégradation silencieuse en navigation privée / storage plein : toute écriture qui
 * échoue est avalée, jamais remontée comme erreur visible — l'utilisateur peut
 * toujours parcourir une leçon sans persistance, il perd juste la reprise.
 *
 * Schéma versionné (`-v1`) pour permettre une migration sans casser les entrées déjà
 * enregistrées chez un visiteur revenant sur le site.
 */

export const LEARN_PROGRESS_KEY = 'learn-progress-v1';

/**
 * @typedef {{
 *   songSlug: string,
 *   status: 'in_progress' | 'completed',
 *   currentStepId: string,
 *   completedStepIds: string[],
 *   exerciseAnswers: Record<string, boolean>,
 *   repeatedExpressionIds: string[],
 *   startedAt: string,
 *   completedAt: string|null,
 *   lastActivityAt: string,
 * }} LessonProgress
 */

/**
 * Lit la totalité des progressions enregistrées. Ne lève jamais.
 * @returns {Record<string, LessonProgress>}
 */
function readAll() {
  try {
    const raw = JSON.parse(localStorage.getItem(LEARN_PROGRESS_KEY) || '{}');
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  } catch {
    return {};
  }
}

function writeAll(all) {
  try {
    localStorage.setItem(LEARN_PROGRESS_KEY, JSON.stringify(all));
    return true;
  } catch {
    return false; // storage plein / navigation privée : dégradation silencieuse
  }
}

/**
 * Progression d'une leçon précise, ou `null` si jamais commencée.
 * @param {string} songSlug
 * @returns {LessonProgress|null}
 */
export function getLessonProgress(songSlug) {
  if (!songSlug) return null;
  return readAll()[songSlug] || null;
}

/**
 * Démarre (ou réinitialise) une leçon : crée l'entrée si absente, sinon la renvoie
 * telle quelle (idempotent — visiter deux fois l'étape d'intro ne doit pas effacer
 * une progression déjà en cours).
 * @param {string} songSlug
 * @param {string} firstStepId
 * @returns {LessonProgress|null} la progression courante, ou null si le storage est indisponible
 */
export function startLesson(songSlug, firstStepId) {
  if (!songSlug || !firstStepId) return null;
  const all = readAll();
  if (all[songSlug]) return all[songSlug];

  const now = new Date().toISOString();
  const entry = {
    songSlug,
    status: 'in_progress',
    currentStepId: firstStepId,
    completedStepIds: [],
    exerciseAnswers: {},
    repeatedExpressionIds: [],
    startedAt: now,
    completedAt: null,
    lastActivityAt: now,
  };
  all[songSlug] = entry;
  return writeAll(all) ? entry : entry; // état renvoyé même si l'écriture a échoué
}

/**
 * Avance la leçon à l'étape suivante et marque l'étape précédente comme terminée.
 * @param {string} songSlug
 * @param {string} completedStepId étape qui vient d'être validée
 * @param {string} nextStepId étape suivante à afficher
 * @returns {boolean} succès de l'écriture (dégradation silencieuse sinon)
 */
export function advanceStep(songSlug, completedStepId, nextStepId) {
  if (!songSlug || !completedStepId || !nextStepId) return false;
  const all = readAll();
  const entry = all[songSlug];
  if (!entry) return false;

  entry.currentStepId = nextStepId;
  if (!entry.completedStepIds.includes(completedStepId)) {
    entry.completedStepIds.push(completedStepId);
  }
  entry.lastActivityAt = new Date().toISOString();
  return writeAll(all);
}

/**
 * Enregistre le résultat d'un exercice (pour le calcul du score à l'étape Résultat).
 * @param {string} songSlug
 * @param {string} exerciseId identifiant stable de l'exercice (ex. `exercise-0`)
 * @param {boolean} correct
 * @returns {boolean} succès
 */
export function recordExerciseAnswer(songSlug, exerciseId, correct) {
  if (!songSlug || !exerciseId) return false;
  const all = readAll();
  const entry = all[songSlug];
  if (!entry) return false;

  entry.exerciseAnswers[exerciseId] = correct === true;
  entry.lastActivityAt = new Date().toISOString();
  return writeAll(all);
}

/**
 * Marque une expression comme répétée à voix haute (étape Répétition).
 * @param {string} songSlug
 * @param {string} expressionId
 * @returns {boolean} succès
 */
export function markExpressionRepeated(songSlug, expressionId) {
  if (!songSlug || !expressionId) return false;
  const all = readAll();
  const entry = all[songSlug];
  if (!entry) return false;

  if (!entry.repeatedExpressionIds.includes(expressionId)) {
    entry.repeatedExpressionIds.push(expressionId);
  }
  entry.lastActivityAt = new Date().toISOString();
  return writeAll(all);
}

/**
 * Marque la leçon comme terminée (étape Résultat atteinte).
 * @param {string} songSlug
 * @returns {boolean} succès
 */
export function completeLesson(songSlug) {
  if (!songSlug) return false;
  const all = readAll();
  const entry = all[songSlug];
  if (!entry) return false;

  entry.status = 'completed';
  entry.completedAt = new Date().toISOString();
  entry.lastActivityAt = entry.completedAt;
  return writeAll(all);
}

/**
 * Réinitialise une leçon (bouton « Refaire la leçon » de l'écran Résultat) en
 * repartant de la première étape, sans perdre les autres leçons enregistrées.
 * @param {string} songSlug
 * @param {string} firstStepId
 * @returns {LessonProgress|null}
 */
export function resetLesson(songSlug, firstStepId) {
  if (!songSlug || !firstStepId) return null;
  const all = readAll();
  delete all[songSlug];
  writeAll(all);
  return startLesson(songSlug, firstStepId);
}

/**
 * Score d'exercices sous la forme `{ correct, total }`, pour l'écran Résultat.
 * @param {LessonProgress|null} progress
 * @returns {{ correct:number, total:number }}
 */
export function computeExerciseScore(progress) {
  if (!progress) return { correct: 0, total: 0 };
  const answers = Object.values(progress.exerciseAnswers || {});
  return { correct: answers.filter(Boolean).length, total: answers.length };
}
