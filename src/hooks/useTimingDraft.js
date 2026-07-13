import { useCallback, useRef } from 'react';

/**
 * Brouillon LOCAL (localStorage) du travail de synchronisation en cours, par chanson.
 *
 * But : ne JAMAIS perdre le travail après un refresh accidentel ou une fermeture.
 * Ce n'est PAS le système de versions permanent (ça, c'est song_timing_versions en
 * base). Le brouillon est effacé après une sauvegarde serveur confirmée, et conservé
 * si la sauvegarde échoue.
 *
 * @param {string|number} songId
 */
export function useTimingDraft(songId) {
  const key = `karaoke-timing-draft-${songId}`;

  // Instantané du brouillon présent AU MONTAGE (pour proposer la récupération une
  // seule fois, sans être écrasé par les écritures suivantes de cette session).
  const initialRef = useRef(undefined);
  if (initialRef.current === undefined) {
    initialRef.current = readDraft(key);
  }

  const saveDraft = useCallback((lines, baseSignature) => {
    try {
      localStorage.setItem(key, JSON.stringify({
        songId, lines, baseSignature, savedAt: new Date().toISOString(),
      }));
      return true;
    } catch {
      return false; // quota plein / storage indisponible → l'échec ne casse rien
    }
  }, [key, songId]);

  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }, [key]);

  return { initialDraft: initialRef.current, saveDraft, clearDraft };
}

function readDraft(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.lines)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Signature légère et déterministe d'un tableau de lignes (pour détecter « sale »).
 * Inclut le timing par mot (Stage 2) : sans ça, éditer/distribuer/capturer des mots
 * ne change PAS la signature (time/endTime/text de la ligne restent identiques), donc
 * ni la pastille « Alterações não salvas » ni l'autosave local ne se déclenchent — les
 * corrections mot-à-mot semblent alors ignorées alors qu'elles existent bien en mémoire.
 */
export function linesSignature(lines) {
  if (!Array.isArray(lines)) return '';
  return lines
    .map((l) => {
      const wordsSig = Array.isArray(l.words) && l.words.length > 0
        ? l.words.map((w) => `${w.start ?? ''}:${w.end ?? ''}:${w.text ?? ''}`).join(',')
        : '';
      return `${l.time ?? ''}|${l.endTime ?? ''}|${l.text ?? ''}|${wordsSig}`;
    })
    .join('\n');
}
