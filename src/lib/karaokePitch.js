/**
 * Karaokê grand écran — la hauteur des notes (K5, 2026-11-16). PUR, sans React.
 *
 * Seules quelques músicas ont une melodia de referência (`songs.pitch_map`, notes MIDI
 * générées hors ligne). Ces cartes contiennent aussi du bruit : des notes pendant
 * l'intro instrumentale, des sauts d'octave. Donc :
 *   - on ne garde que les notes qui tombent PENDANT les paroles (fenêtres de mots) ;
 *   - on compare à l'octave près (une voix grave et une voix aiguë chantent la même
 *     mélodie à une octave d'écart), avec une tolérance large (fête, pas conservatoire).
 */
import { detectPitch, frequencyToMidi } from './pitch/yin';

export const PITCH_TOLERANCE = 1.5; // demi-tons, octave repliée
export const MIN_PITCH_NOTES = 12; // en dessous, la carte ne vaut pas une piste

/** `midi` ramené à l'octave la plus proche de `target`. */
export function foldMidi(midi, target) {
  if (!Number.isFinite(midi) || !Number.isFinite(target)) return midi;
  return midi + 12 * Math.round((target - midi) / 12);
}

/** La voix chante-t-elle la note (à l'octave près) ? */
export function onPitch(midi, target, tolerance = PITCH_TOLERANCE) {
  if (!Number.isFinite(midi) || !Number.isFinite(target)) return false;
  return Math.abs(foldMidi(midi, target) - target) <= tolerance;
}

/**
 * Notes du jeu : celles de la carte (ms → s) qui chevauchent les mots d'une ligne
 * chantée, rattachées à cette ligne. `windows[i]` = fenêtres de mots de la ligne i.
 * Renvoie [] si la carte est trop maigre une fois filtrée.
 */
export function gameNotes(rawNotes, windows, owners) {
  if (!Array.isArray(rawNotes) || !rawNotes.length) return [];
  // Une fenêtre par MOT (pas par ligne) : une note entre deux mots — un « bip » de
  // synthé, l'instrumental au milieu d'une ligne — n'est pas à chanter.
  const spans = [];
  windows.forEach((words, line) => {
    if (owners[line] == null) return;
    words.forEach((w) => spans.push({ line, start: w.start - 0.1, end: w.end + 0.1 }));
  });
  const out = [];
  for (const n of rawNotes) {
    const start = n.startMs / 1000; const end = n.endMs / 1000;
    if (!(end > start) || !Number.isFinite(n.midi)) continue;
    if ((n.confidence ?? 1) < 0.5) continue;
    const span = spans.find((s) => start < s.end && end > s.start);
    if (!span) continue;
    out.push({ start: Math.max(start, span.start), end: Math.min(end, span.end), midi: n.midi, line: span.line });
  }
  out.sort((a, b) => a.start - b.start);
  return out.length >= MIN_PITCH_NOTES ? out : [];
}

/**
 * Plage verticale de la piste : du 10e au 90e centile (les notes aberrantes sont
 * repliées dedans à l'affichage), au moins une octave.
 */
export function laneRange(notes) {
  if (!notes.length) return { min: 48, max: 72 };
  const sorted = notes.map((n) => n.midi).sort((a, b) => a - b);
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];
  let min = at(0.1); let max = at(0.9);
  if (max - min < 12) { const mid = (min + max) / 2; min = mid - 6; max = mid + 6; }
  return { min: min - 1, max: max + 1 };
}

/** Une note (ou une voix) ramenée dans la plage affichée, par octaves. */
export function intoRange(midi, { min, max }) {
  let m = midi;
  while (m < min) m += 12;
  while (m > max) m -= 12;
  return m < min ? (min + max) / 2 : m;
}

/** La note attendue à l'instant t (secondes), ou null. Notes triées. */
export function expectedNoteAt(notes, t) {
  let lo = 0; let hi = notes.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (t < notes[mid].start) hi = mid - 1;
    else if (t >= notes[mid].end) lo = mid + 1;
    else return notes[mid];
  }
  return null;
}

/**
 * Hauteur de la voix dans un buffer (YIN) → MIDI, ou null (pas de note fiable).
 * Coûteux (≈ taille du buffer × 640) : à appeler ~20 fois par seconde, pas à chaque image.
 */
export function voiceMidi(buffer, sampleRate, { minRms = 0.004 } = {}) {
  const res = detectPitch(buffer, sampleRate, { threshold: 0.15, minFrequencyHz: 75, maxFrequencyHz: 1000 });
  if (!res.frequencyHz || res.probability < 0.7 || res.rms < minRms) return null;
  return frequencyToMidi(res.frequencyHz);
}
