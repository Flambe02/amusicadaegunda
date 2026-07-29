/**
 * audioClock — CONTRAT D'HORLOGE entre l'audio LOCAL du studio de mots et l'horloge
 * CANONIQUE de la chanson. Fonctions PURES, aucun DOM, aucun réseau, aucun stockage.
 *
 * ═══ L'HORLOGE CANONIQUE ═══
 * C'est celle de la vidéo YouTube, la même que les timings de FRASE. Tout ce qui est
 * ENREGISTRÉ (`lrc_content`, `timing_data`, `time`/`endTime`/`words[].start`/`.end`) est
 * en temps canonique, en secondes absolues depuis le début de la chanson. Le fichier
 * audio local est un OUTIL D'ÉDITION : le timing enregistré ne doit jamais dépendre de
 * sa présence.
 *
 * ═══ LA CONVENTION ═══
 *     canonique = local + offset
 *     local     = canonique − offset
 *
 * Un offset POSITIF signifie que l'événement arrive PLUS TARD sur YouTube que dans le
 * fichier local (typiquement : la vidéo a une intro que le MP3 n'a pas).
 *
 * C'est la convention DÉJÀ en place dans le studio (`videoTime = audioTime + offsetSec`) :
 * on la conserve et on l'expose sous des noms explicites, au lieu de recopier `± offsetSec`
 * dans une dizaine d'endroits — c'est ainsi qu'une erreur de signe se glisse.
 *
 * ═══ CE QUE CE MODULE NE FAIT PAS ═══
 * Aucun décalage en masse de timings existants. Recalibrer n'affecte QUE les futures
 * captures et l'aperçu local ; les temps canoniques déjà enregistrés sont intouchables.
 */

/** Version du format d'enregistrement de calibration (stockage local uniquement). */
export const CALIBRATION_VERSION = 1;

/** Borne raisonnable : au-delà, c'est une faute de saisie, pas un décalage d'intro. */
export const MAX_OFFSET_SECONDS = 600;

// Écarts de durée local ↔ canonique (secondes / ratio) au-delà desquels on alerte.
const DURATION_WARN_SEC = 2;
const DURATION_SEVERE_RATIO = 0.05;

// ───────────────────────────── Conversions ─────────────────────────────

/** Temps LOCAL (fichier audio) → temps CANONIQUE (chanson/YouTube). */
export function localAudioTimeToCanonical(localTime, offsetSeconds) {
  if (!Number.isFinite(localTime) || !Number.isFinite(offsetSeconds)) return Number.NaN;
  return localTime + offsetSeconds;
}

/** Temps CANONIQUE (chanson/YouTube) → temps LOCAL (fichier audio). */
export function canonicalTimeToLocalAudio(canonicalTime, offsetSeconds) {
  if (!Number.isFinite(canonicalTime) || !Number.isFinite(offsetSeconds)) return Number.NaN;
  return canonicalTime - offsetSeconds;
}

/**
 * Borne une CIBLE DE NAVIGATION locale dans [0, duration]. À n'utiliser QUE juste avant
 * de toucher `audio.currentTime` : le temps canonique enregistré n'est jamais borné ni
 * réécrit (un mot canonique à 1 s avec un offset de +5 s reste à 1 s ; seule la tête de
 * lecture locale est ramenée à 0).
 */
export function clampLocalSeek(localTime, duration) {
  if (!Number.isFinite(localTime)) return 0;
  const lo = Math.max(0, localTime);
  if (!Number.isFinite(duration) || duration <= 0) return lo; // durée inconnue → pas de borne haute
  return Math.min(lo, duration);
}

/**
 * Valide un offset en secondes. Renvoie un nombre fini, ou `null` si la valeur est
 * inutilisable — `null` signifie « pas d'offset », JAMAIS « offset de zéro ».
 */
export function normalizeOffsetSeconds(value) {
  if (typeof value === 'boolean' || value === null || value === undefined || value === '') return null;
  const n = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
  if (typeof value === 'object') return null;
  if (!Number.isFinite(n)) return null;
  if (Math.abs(n) > MAX_OFFSET_SECONDS) return null;
  return n;
}

/**
 * Offset calculé depuis DEUX repères du même événement musical :
 * `offset = repèreCanonique − repèreLocal`. Renvoie null si un repère est invalide.
 */
export function computeAnchorOffset(canonicalAnchor, localAnchor) {
  if (!Number.isFinite(canonicalAnchor) || !Number.isFinite(localAnchor)) return null;
  if (canonicalAnchor < 0 || localAnchor < 0) return null;
  return normalizeOffsetSeconds(canonicalAnchor - localAnchor);
}

/** Affichage pt-BR signé, à la milliseconde : « +1,750 s », « −0,420 s », « 0,000 s ». */
export function formatOffsetSeconds(offsetSeconds) {
  if (!Number.isFinite(offsetSeconds)) return '—';
  const abs = Math.abs(offsetSeconds).toFixed(3).replace('.', ',');
  const sign = offsetSeconds > 0 ? '+' : offsetSeconds < 0 ? '−' : '';
  return `${sign}${abs} s`;
}

// ───────────────────── Identité du fichier local ─────────────────────

/**
 * Identité déterministe et respectueuse de la vie privée d'un fichier audio local POUR
 * UNE CHANSON. Métadonnées seulement — on ne lit jamais les octets du fichier, on ne
 * stocke aucun chemin absolu (seul le nom de base est retenu), rien n'est envoyé.
 *
 * Distingue bien : même chanson/autre fichier, autre chanson/même nom, même nom/taille
 * différente, fichier remplacé plus tard (lastModified), et le même fichier inchangé.
 *
 * La DURÉE est volontairement exclue : elle n'est connue qu'après décodage, l'identité
 * doit être stable dès la sélection du fichier.
 */
export function fileIdentity({ songId, fileName, fileSize, lastModified } = {}) {
  const base = String(fileName ?? '').split(/[/\\]/).pop() || 'sem-nome';
  const size = Number.isFinite(fileSize) ? fileSize : 0;
  const mtime = Number.isFinite(lastModified) ? lastModified : 0;
  return `s${songId ?? '?'}|${base}|${size}|${mtime}`;
}

/** Nom de base affichable (jamais un chemin). */
export function displayFileName(fileName) {
  return String(fileName ?? '').split(/[/\\]/).pop() || '';
}

// ───────────────────── Enregistrement de calibration ─────────────────────

/**
 * Construit un enregistrement de calibration. `offsetSeconds: 0` avec
 * `method: 'explicit-zero'` est une VRAIE calibration (l'utilisateur a confirmé que les
 * deux sources démarrent ensemble) — à ne jamais confondre avec l'absence
 * d'enregistrement. Ne contient aucun octet audio, aucun chemin.
 */
export function makeCalibration({
  songId, fileName, fileSize, lastModified,
  offsetSeconds, method = 'manual-anchor',
  localDuration = null, canonicalDuration = null,
  calibratedAt = null,
} = {}) {
  const offset = normalizeOffsetSeconds(offsetSeconds);
  if (offset === null) return null;
  return {
    version: CALIBRATION_VERSION,
    songId: songId ?? null,
    fileIdentity: fileIdentity({ songId, fileName, fileSize, lastModified }),
    fileName: displayFileName(fileName),
    fileSize: Number.isFinite(fileSize) ? fileSize : null,
    lastModified: Number.isFinite(lastModified) ? lastModified : null,
    localDuration: Number.isFinite(localDuration) ? localDuration : null,
    canonicalDuration: Number.isFinite(canonicalDuration) ? canonicalDuration : null,
    offsetSeconds: offset,
    method,
    calibratedAt: calibratedAt || null,
    status: 'calibrated',
  };
}

/**
 * Relit un enregistrement (objet ou JSON) en le validant. Renvoie null — donc « pas de
 * calibration », jamais un zéro implicite — si l'enregistrement est absent, malformé,
 * d'une version inconnue, ou si son offset est inutilisable.
 */
export function parseCalibrationRecord(raw) {
  if (raw == null) return null;
  let obj = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { return null; }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  if (obj.version !== CALIBRATION_VERSION) return null;
  if (typeof obj.fileIdentity !== 'string' || obj.fileIdentity.length === 0) return null;
  const offset = normalizeOffsetSeconds(obj.offsetSeconds);
  if (offset === null) return null;
  return { ...obj, offsetSeconds: offset, status: 'calibrated' };
}

/**
 * Statut de calibration pour l'identité de fichier ACTUELLEMENT sélectionnée :
 *   'missing'    — aucun enregistrement utilisable (état initial, ou fichier jamais calibré)
 *   'stale-file' — un enregistrement existe, mais pour un AUTRE fichier / une autre chanson
 *   'calibrated' — enregistrement valide pour ce fichier précis
 */
export function calibrationStatus(record, identity) {
  const rec = parseCalibrationRecord(record);
  if (!rec) return 'missing';
  if (!identity || rec.fileIdentity !== identity) return 'stale-file';
  return 'calibrated';
}

/**
 * La capture de NOUVEAUX mots depuis l'horloge locale est-elle autorisée ? Uniquement
 * avec une calibration valide pour CE fichier. Sans elle, chaque mot capté serait décalé
 * du même écart inconnu, sans que rien ne le signale.
 *
 * NB : ceci ne bloque QUE la création de timing depuis l'audio local. Consulter, retirer
 * un timing existant, changer de fichier ou fermer le studio reste toujours possible.
 */
export function canCaptureWords(record, identity) {
  return calibrationStatus(record, identity) === 'calibrated';
}

/** Offset utilisable pour CE fichier, ou null. Jamais de repli sur 0. */
export function activeOffsetSeconds(record, identity) {
  return canCaptureWords(record, identity) ? parseCalibrationRecord(record).offsetSeconds : null;
}

/**
 * Écart de durée local ↔ canonique — INDÉPENDANT de la calibration : deux fichiers de
 * durée identique peuvent avoir des débuts décalés, et un écart sévère reste un
 * avertissement même quand une calibration valide existe.
 * @returns {{ level: 'unknown'|'ok'|'warn'|'severe', deltaSec: number|null }}
 */
export function durationMismatch(localDuration, canonicalDuration) {
  const a = Number.isFinite(localDuration) && localDuration > 0 ? localDuration : null;
  const b = Number.isFinite(canonicalDuration) && canonicalDuration > 0 ? canonicalDuration : null;
  if (a === null || b === null) return { level: 'unknown', deltaSec: null };
  const delta = a - b;
  const abs = Math.abs(delta);
  if (abs > DURATION_WARN_SEC || abs / b > DURATION_SEVERE_RATIO) {
    return { level: abs / b > DURATION_SEVERE_RATIO ? 'severe' : 'warn', deltaSec: delta };
  }
  return { level: 'ok', deltaSec: delta };
}
