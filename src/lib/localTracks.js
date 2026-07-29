/**
 * localTracks — FAIXAS LOCAIS : les trois pistes audio importées à la main depuis
 * l'ordinateur de l'administrateur (typiquement des stems produits par UVR5).
 * Fonctions PURES : aucun DOM, aucun réseau, aucun stockage.
 *
 * ═══ CE QUE CE MODULE N'EST PAS ═══
 * Ni un second moteur de calibration (on réutilise `@/lib/audioClock` et le magasin
 * `useAudioCalibration`), ni un second brouillon de timing, ni un mixeur, ni une
 * séparation de sources, ni un alignement automatique. Il gère l'IMPORT, la
 * VÉRIFICATION et le CHOIX de piste.
 *
 * ═══ INVARIANTS ═══
 *  • `file` et `objectUrl` sont de la donnée de SESSION : jamais dans l'état chanson,
 *    jamais dans le brouillon, jamais dans le payload karaokê ;
 *  • le timing enregistré reste CANONIQUE : canonique = local + offset (étape 4) ;
 *  • une calibration appartient à (chanson, RÔLE, identité de fichier) — jamais copiée
 *    silencieusement d'un fichier à un autre ;
 *  • une durée semblable n'est PAS une preuve d'alignement ;
 *  • retirer ou remplacer une piste ne touche à aucun timing.
 */
import { fileIdentity, canonicalTimeToLocalAudio, localAudioTimeToCanonical, clampLocalSeek } from '@/lib/audioClock';
import { CAPTURE_SOURCE } from '@/lib/karaokeWorkshop';

/** Les trois rôles de piste locale. */
export const TRACK_ROLE = {
  ORIGINAL: 'original',
  INSTRUMENTAL: 'instrumental',
  VOCALS: 'vocals',
};

/** Étiquettes pt-BR. */
export const TRACK_LABEL = {
  [TRACK_ROLE.ORIGINAL]: 'Áudio original',
  [TRACK_ROLE.INSTRUMENTAL]: 'Instrumental',
  [TRACK_ROLE.VOCALS]: 'Voz isolada',
};

/**
 * Clé de magasin de calibration par rôle. On CONSERVE les clés historiques `full` et
 * `vocals` : les calibrations déjà réalisées par l'administrateur restent valides.
 */
export const CALIBRATION_KEY_FOR_ROLE = {
  [TRACK_ROLE.ORIGINAL]: 'full',
  [TRACK_ROLE.INSTRUMENTAL]: 'instrumental',
  [TRACK_ROLE.VOCALS]: 'vocals',
};

/** Tolérances de comparaison de durée (secondes). */
export const DURATION_TOLERANCE_SEC = 0.25;
export const DURATION_WARN_SEC = 1;

// Types MIME refusés d'emblée. On ne se fie PAS à l'extension : c'est la capacité réelle
// de décodage (une durée finie et positive) qui tranche.
const NON_AUDIO_TYPE_RE = /^(image|video|text|application)\//i;

/** Piste vide (aucun fichier sélectionné). */
export function emptyTrack(role) {
  return {
    role,
    fileName: null,
    fileSize: null,
    lastModified: null,
    fileIdentity: null,
    objectUrl: null,
    mimeType: null,
    duration: 0,
    loadStatus: 'empty', // 'empty' | 'loading' | 'ready' | 'error'
    offsetSeconds: null,
    error: null,
  };
}

/**
 * Valide un fichier audio de façon sûre et légère (aucune bibliothèque audio).
 * `duration` doit venir du décodage réel par le navigateur.
 * @returns {{ ok: boolean, message: string|null }}
 */
export function validateAudioFile({ size, type, duration } = {}) {
  if (typeof type === 'string' && type && NON_AUDIO_TYPE_RE.test(type)) {
    return { ok: false, message: 'Este formato de áudio não é compatível com o navegador.' };
  }
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, message: 'O arquivo selecionado não contém áudio válido.' };
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    return { ok: false, message: 'O arquivo selecionado não contém áudio válido.' };
  }
  return { ok: true, message: null };
}

/**
 * Compare la durée d'une piste à celle de la référence. PREUVE FAIBLE : deux fichiers de
 * même durée peuvent avoir des débuts décalés. Ne modifie jamais un timing et ne rend
 * jamais une piste calibrée.
 * @returns {{ level: 'unknown'|'ok'|'warn'|'mismatch', deltaSec: number|null, label: string }}
 */
export function compareTrackDuration(trackDuration, referenceDuration) {
  const a = Number.isFinite(trackDuration) && trackDuration > 0 ? trackDuration : null;
  const b = Number.isFinite(referenceDuration) && referenceDuration > 0 ? referenceDuration : null;
  if (a === null || b === null) return { level: 'unknown', deltaSec: null, label: 'Duração desconhecida' };
  const delta = a - b;
  const abs = Math.abs(delta);
  if (abs <= DURATION_TOLERANCE_SEC) return { level: 'ok', deltaSec: delta, label: 'Duração compatível' };
  if (abs <= DURATION_WARN_SEC) return { level: 'warn', deltaSec: delta, label: 'Pequena diferença de duração' };
  return {
    level: 'mismatch',
    deltaSec: delta,
    label: 'Duração diferente. Verifique se as faixas vieram do mesmo áudio.',
  };
}

/**
 * Étiquette d'état d'une piste — jamais une couleur seule.
 * @param {object} track
 * @param {'missing'|'stale-file'|'calibrated'} calibrationStatus
 * @param {'verified'|'pending'|null} [verification]
 */
export function trackStatusLabel(track, calibrationStatus, verification = null) {
  if (!track || track.loadStatus === 'empty') return 'Arquivo não selecionado';
  if (track.loadStatus === 'loading') return 'Carregando';
  if (track.loadStatus === 'error') return 'Arquivo inválido';
  if (calibrationStatus === 'calibrated') {
    return verification === 'pending' ? 'Alinhamento a verificar' : 'Calibrado';
  }
  return 'Não calibrado';
}

/** Une piste chargée ET calibrée pour SON identité peut servir de source de capture. */
export function canUseForSync(track, calibrationStatus) {
  return Boolean(track && track.loadStatus === 'ready' && calibrationStatus === 'calibrated');
}

/** Idem pour la réécoute exacte d'une frase. */
export function canReviewWithTrack(track, calibrationStatus) {
  return canUseForSync(track, calibrationStatus);
}

/**
 * Bascule de piste en PRÉSERVANT la position canonique.
 *
 *   canonique      = localSource + offsetSource
 *   localCible     = canonique − offsetCible      (bornée à la seule cible média)
 *
 * `canonicalTime` est null si la piste SOURCE n'est pas calibrée (il n'existe alors pas
 * de position canonique) ; `targetLocalTime` est null si la CIBLE ne l'est pas — l'appelant
 * joue alors la piste depuis sa propre position, sans prétendre à une équivalence.
 * @returns {{ canonicalTime: number|null, targetLocalTime: number|null }}
 */
export function switchTrackSeek({ fromLocalTime, fromOffset, toOffset, toDuration } = {}) {
  if (!Number.isFinite(fromOffset)) return { canonicalTime: null, targetLocalTime: null };
  const canonicalTime = localAudioTimeToCanonical(
    Number.isFinite(fromLocalTime) ? fromLocalTime : 0,
    fromOffset,
  );
  if (!Number.isFinite(toOffset)) return { canonicalTime, targetLocalTime: null };
  return {
    canonicalTime,
    targetLocalTime: clampLocalSeek(canonicalTimeToLocalAudio(canonicalTime, toOffset), toDuration),
  };
}

/**
 * Charge utile de calibration pour « Usar a calibração do áudio original ».
 *
 * Autorisée SEULEMENT si : l'original est calibré, le stem s'est chargé, la durée est dans
 * la tolérance, ET l'utilisateur a confirmé explicitement que le stem vient du même audio
 * sans coupe. Ne copie QUE le nombre — la calibration créée est scopée à l'identité DU
 * STEM — et démarre en `verification: 'pending'` : « Alinhamento a verificar » jusqu'à un
 * test d'écoute réel. Jamais déduite d'un nom de fichier ni d'une durée seule.
 *
 * @returns {{ offsetSeconds:number, method:string, verification:'pending' }|null}
 */
export function sharedCalibrationPayload({
  originalCalibration, track, durationLevel, confirmed,
} = {}) {
  if (confirmed !== true) return null;
  if (!originalCalibration || !Number.isFinite(originalCalibration.offsetSeconds)) return null;
  if (!track || track.loadStatus !== 'ready') return null;
  if (durationLevel !== 'ok' && durationLevel !== 'warn') return null;
  return {
    offsetSeconds: originalCalibration.offsetSeconds,
    method: 'copied-from-original',
    verification: 'pending',
  };
}

/** Étiquette de la source de synchronisation, identifiant le RÔLE. */
export function syncSourceLabelForRole(role) {
  if (role === TRACK_ROLE.ORIGINAL) return 'Fonte de sincronização: áudio original';
  if (role === TRACK_ROLE.INSTRUMENTAL) return 'Fonte de sincronização: instrumental';
  if (role === TRACK_ROLE.VOCALS) return 'Fonte de sincronização: voz isolada';
  if (role === CAPTURE_SOURCE.BLOCKED || role === 'blocked') return 'Fonte de sincronização: bloqueada';
  return 'Fonte de sincronização: YouTube';
}

/**
 * Étend la décision de l'étape 5.1 aux trois rôles.
 *
 *  • aucune piste locale chargée               → YOUTUBE (comportement historique) ;
 *  • rôle choisi, chargé et calibré            → LOCAL ;
 *  • des pistes existent mais le rôle choisi est absent, non calibré ou périmé, ou
 *    aucun rôle n'a été choisi                 → BLOCKED.
 *
 * Ne reçoit QUE `syncRole` : la piste de LECTURE ne peut donc pas, structurellement,
 * influencer la source de capture.
 */
export function captureSourceForTracks({ tracks, syncRole, calibrationStatusOf } = {}) {
  const list = tracks ? Object.values(tracks) : [];
  const anyLoaded = list.some((t) => t && t.loadStatus === 'ready');
  if (!anyLoaded) return CAPTURE_SOURCE.YOUTUBE;
  const track = syncRole ? tracks?.[syncRole] : null;
  if (!track) return CAPTURE_SOURCE.BLOCKED;
  const status = typeof calibrationStatusOf === 'function' ? calibrationStatusOf(syncRole) : 'missing';
  return canUseForSync(track, status) ? CAPTURE_SOURCE.LOCAL : CAPTURE_SOURCE.BLOCKED;
}

/**
 * Remplacement de fichier d'une piste. Un échec de validation PRÉSERVE la piste
 * précédente (même référence) et ne révoque rien. Sinon renvoie la nouvelle piste, l'URL
 * à révoquer, et repart NON calibrée (l'appelant restaure la calibration seulement si
 * l'identité correspond exactement à un enregistrement existant).
 *
 * @returns {{ track: object, revokeUrl: string|null, error: string|null }}
 */
export function replaceTrackFile(previous, { validation, next } = {}) {
  if (!validation || validation.ok !== true) {
    return { track: previous, revokeUrl: null, error: validation?.message ?? 'Escolha outro arquivo.' };
  }
  const role = previous?.role ?? next?.role ?? null;
  return {
    track: {
      ...emptyTrack(role),
      fileName: next?.fileName ?? null,
      fileSize: Number.isFinite(next?.fileSize) ? next.fileSize : null,
      lastModified: Number.isFinite(next?.lastModified) ? next.lastModified : null,
      fileIdentity: fileIdentity({ songId: next?.songId, ...next }),
      objectUrl: next?.objectUrl ?? null,
      mimeType: next?.mimeType ?? null,
      duration: Number.isFinite(next?.duration) ? next.duration : 0,
      loadStatus: 'ready',
    },
    revokeUrl: previous?.objectUrl ?? null,
    error: null,
  };
}

/**
 * Retire une piste de la SESSION. Renvoie l'URL à révoquer et une piste vide. Ne touche à
 * aucun timing, et ne supprime évidemment aucun fichier de l'ordinateur.
 * @returns {{ track: object, revokeUrl: string|null }}
 */
export function removeTrack(track) {
  return { track: emptyTrack(track?.role ?? null), revokeUrl: track?.objectUrl ?? null };
}

/** Message de confirmation avant retrait. */
export const REMOVE_TRACK_CONFIRM = 'Remover esta faixa do ateliê? Os tempos do karaokê não serão alterados.';

/** Confirmation exigée avant de copier la calibration de l'original. */
export const SHARED_CALIBRATION_CONFIRM = 'Confirma que esta faixa foi gerada a partir do mesmo áudio original, sem cortes no início ou no fim?';

/** Rappel de confidentialité affiché dans le panneau. */
export const LOCAL_ONLY_NOTICE = 'Os arquivos permanecem neste dispositivo e não são enviados para o servidor.';

/** Invitation à comparer avant de confirmer un alignement. */
export const ALIGNMENT_HINT = 'Compare o mesmo trecho nas duas faixas antes de confirmar o alinhamento.';

/** Blocage de capture quand la piste choisie n'est pas prête. */
export const TRACK_CAPTURE_BLOCKED = 'Calibre a faixa selecionada antes de sincronizar.';

/** Blocage de réécoute d'une frase sur une piste non calibrée. */
export const TRACK_REVIEW_BLOCKED = 'Calibre esta faixa para ouvir a frase no ponto correto.';
