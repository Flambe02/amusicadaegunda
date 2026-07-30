/**
 * Propriété de la SESSION AUDIO LOCALE PARTAGÉE — fonction PURE.
 *
 * La session audio de l'admin (`useLocalAudioSession` dans AdminLayout) est partagée
 * entre « Sincronizar karaokê » et « Guia de tom » d'une MÊME chanson, pour ne pas
 * demander deux fois le même fichier. Elle ne vit donc pas dans un composant remonté
 * par chanson (`key={song.id}`) : sans règle explicite, elle SURVIT au changement de
 * chanson.
 *
 * Bug constaté le 2026-07-29 (vérifié dans le code) : la version précédente ne nettoyait
 * la session que lors d'un passage DIRECT d'une chanson à une autre. À la fermeture de
 * l'éditeur, elle remettait seulement le propriétaire à `null` sans vider l'audio —
 * si bien qu'en ouvrant la chanson suivante, le test « propriétaire différent ? »
 * échouait (`null !== B` mais `null == null` court-circuitait) et le fichier de la
 * chanson PRÉCÉDENTE restait chargé. KaraokeSyncTool voyait alors un `fileName` déjà
 * rempli et sautait sa propre restauration (« déjà de l'audio — ne pas écraser »),
 * donc la chanson B affichait le .wav de la chanson A.
 *
 * D'où ce point de décision unique, sans court-circuit possible.
 */

export const SHARED_AUDIO_ACTION = {
  KEEP: 'keep',       // l'audio appartient à la chanson active — ne rien faire
  CLAIM: 'claim',     // un fichier vient d'arriver — l'attribuer à la chanson active
  CLEAR: 'clear',     // l'audio appartient à une AUTRE chanson (ou plus à aucune) — vider
  RELEASE: 'release', // aucun audio — le propriétaire doit redevenir null
};

/**
 * Que faire de la session partagée ?
 *
 * @param {{ ownerId: string|number|null, activeId: string|number|null, hasAudio: boolean }} state
 *   `ownerId`  = chanson à laquelle l'audio actuellement chargé est attribué
 *   `activeId` = chanson dont un éditeur est ouvert (null = tout est fermé)
 * @returns {{ action: string }}
 */
export function sharedAudioAction({ ownerId = null, activeId = null, hasAudio = false } = {}) {
  // Pas d'audio : rien à protéger, mais le propriétaire ne doit pas rester périmé.
  if (!hasAudio) return { action: ownerId == null ? SHARED_AUDIO_ACTION.KEEP : SHARED_AUDIO_ACTION.RELEASE };

  // De l'audio sans propriétaire = il vient d'être chargé pour la chanson ouverte.
  // Si plus rien n'est ouvert, il n'a plus de raison d'exister.
  if (ownerId == null) {
    return { action: activeId == null ? SHARED_AUDIO_ACTION.CLEAR : SHARED_AUDIO_ACTION.CLAIM };
  }

  // Comparaison en STRING : `openKaraoke` peut passer un id numérique là où le
  // précédent était une string (ou l'inverse) — un `!==` strict provoquerait un
  // nettoyage intempestif de la chanson qu'on vient d'ouvrir.
  const sameSong = activeId != null && String(ownerId) === String(activeId);
  return { action: sameSong ? SHARED_AUDIO_ACTION.KEEP : SHARED_AUDIO_ACTION.CLEAR };
}
