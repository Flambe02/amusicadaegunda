/**
 * Niveau d'apprenant pour le Modo Aprender — MVP : stockage local isolé, séparé de
 * `karaokeOptions.js` (qui régit le karaokê brésilien normal) et de `learnProgress.js`
 * (parcours en 7 étapes, non utilisé par l'écran actuel).
 *
 * Ce n'est PAS un cursus (pas de A1/A2/B1) : le niveau sert uniquement à choisir QUEL
 * jeu de `learning_moments` une chanson propose (voir `buildLearningMoments` dans
 * `learnContent.js`).
 *
 * Préparé pour la V2 (Profil/Réglages) sans la construire : `getLearnLevel`/
 * `setLearnLevel` sont le seul point de contact avec le stockage. Le jour où le niveau
 * doit venir d'un profil utilisateur plutôt que du navigateur, seules ces deux
 * fonctions changent d'implémentation — aucun appelant n'a besoin d'être modifié.
 */

export const LEARN_LEVELS = Object.freeze(['beginner', 'intermediate', 'advanced']);
export const DEFAULT_LEARN_LEVEL = 'beginner';

const KEY = 'learn-level-v1';

/**
 * Niveau actuellement choisi (persisté), ou `DEFAULT_LEARN_LEVEL` si jamais choisi ou
 * si le storage est indisponible. Ne lève jamais.
 * @returns {'beginner'|'intermediate'|'advanced'}
 */
export function getLearnLevel() {
  try {
    const raw = localStorage.getItem(KEY);
    return LEARN_LEVELS.includes(raw) ? raw : DEFAULT_LEARN_LEVEL;
  } catch {
    return DEFAULT_LEARN_LEVEL;
  }
}

/**
 * Mémorise le niveau choisi pour les prochaines visites de `/apprendre`.
 * @param {string} level
 * @returns {boolean} succès (dégradation silencieuse sinon — storage plein/navigation privée)
 */
export function setLearnLevel(level) {
  if (!LEARN_LEVELS.includes(level)) return false;
  try {
    localStorage.setItem(KEY, level);
    return true;
  } catch {
    return false;
  }
}
