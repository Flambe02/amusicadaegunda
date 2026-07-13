/**
 * localAudioSessionCache — cache EN MÉMOIRE (durée de la session/onglet) du fichier
 * audio local associé à une chanson, par song.id.
 *
 * But : quand un fichier vient d'être associé (Biblioteca) ou chargé, l'éditeur de
 * synchronisation le réutilise instantanément — sans re-sélectionner ni redemander
 * la permission — même en mode « manuel » (fallback) où il n'y a pas de handle
 * persistant. Rien n'est envoyé au réseau : on garde seulement une référence File.
 *
 * Volatile par nature : vidé au rechargement de la page. La persistance inter-session
 * reste assurée par le handle File System Access (voir audioHandleStore).
 */
const cache = new Map(); // String(songId) -> File

export function setSessionAudioFile(songId, file) {
  if (songId == null || !file) return;
  cache.set(String(songId), file);
}

export function getSessionAudioFile(songId) {
  if (songId == null) return null;
  return cache.get(String(songId)) || null;
}

export function deleteSessionAudioFile(songId) {
  if (songId == null) return;
  cache.delete(String(songId));
}
