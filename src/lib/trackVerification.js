/**
 * trackVerification — CIBLE DE CALIBRATION et VÉRIFICATION D'ALIGNEMENT d'une piste
 * locale. Fonctions PURES.
 *
 * Deux garanties que l'étape 6 n'assurait pas :
 *
 *  1. La calibration vise un RÔLE EXPLICITE. Elle était auparavant lancée sans le rôle
 *     cliqué, si bien qu'elle atterrissait sur la piste que le studio de mots avait
 *     sous la main — et l'instrumental n'était donc jamais calibrable. La cible est
 *     désormais gelée (rôle + identité de fichier) à l'ouverture, et revalidée avant
 *     écriture : si le fichier a été remplacé ou retiré entre-temps, le résultat est
 *     REJETÉ plutôt qu'appliqué au mauvais fichier.
 *
 *  2. Confirmer un alignement exige d'avoir RÉELLEMENT comparé : les deux écoutes
 *     (original puis stem, au MÊME point canonique, chacune avec SON offset) doivent
 *     avoir eu lieu dans la session courante. Un clic seul ne prouvait rien.
 *
 * C'est une confirmation HUMAINE : rien ici ne vérifie acoustiquement quoi que ce soit.
 * Aucune de ces opérations ne touche à un timing de frase ou de mot.
 */
import { canonicalTimeToLocalAudio, clampLocalSeek } from '@/lib/audioClock';
import { TRACK_ROLE } from '@/lib/localTracks';

/** Message quand la piste a changé pendant une calibration ouverte. */
export const CALIBRATION_STALE_MESSAGE = 'A faixa foi alterada. Inicie a calibração novamente.';

// ─────────────────────── Cible de calibration ───────────────────────

/**
 * Gèle la cible d'une session de calibration : le RÔLE cliqué et l'identité EXACTE du
 * fichier. Ne contient volontairement rien d'autre — aucune notion de piste de lecture —
 * donc changer la piste écoutée ne peut pas rediriger la calibration.
 * @returns {{ role: string, fileIdentity: string }|null}
 */
export function startCalibrationTarget({ role, fileIdentity } = {}) {
  if (!role || typeof fileIdentity !== 'string' || !fileIdentity) return null;
  return { role, fileIdentity };
}

/**
 * La cible est-elle toujours valide au moment d'écrire ? Le rôle doit correspondre,
 * l'identité de fichier être INCHANGÉE, et l'audio toujours lisible.
 * @returns {{ ok: boolean, message: string|null }}
 */
export function calibrationTargetValid(target, { role, fileIdentity, ready } = {}) {
  if (!target) return { ok: false, message: CALIBRATION_STALE_MESSAGE };
  if (target.role !== role) return { ok: false, message: CALIBRATION_STALE_MESSAGE };
  if (target.fileIdentity !== fileIdentity) return { ok: false, message: CALIBRATION_STALE_MESSAGE };
  if (!ready) return { ok: false, message: CALIBRATION_STALE_MESSAGE };
  return { ok: true, message: null };
}

// ─────────────────── Session de vérification d'alignement ───────────────────

/**
 * Démarre une session de comparaison pour un STEM (l'original n'a pas à être vérifié
 * contre lui-même). Mémorise le point canonique de comparaison, l'identité du fichier et
 * l'offset au moment du démarrage — tout changement rend la session périmée.
 * @returns {{ role, canonicalPoint, fileIdentity, offsetSeconds, heardOriginal, heardStem }|null}
 */
export function startVerification({ role, canonicalPoint, fileIdentity, offsetSeconds } = {}) {
  if (!role || role === TRACK_ROLE.ORIGINAL) return null;
  if (!Number.isFinite(canonicalPoint)) return null;
  if (typeof fileIdentity !== 'string' || !fileIdentity) return null;
  return {
    role,
    canonicalPoint,
    fileIdentity,
    offsetSeconds: Number.isFinite(offsetSeconds) ? offsetSeconds : null,
    heardOriginal: false,
    heardStem: false,
  };
}

/** Note qu'une des deux écoutes a eu lieu. `which` = 'original' | 'stem'. */
export function markHeard(session, which) {
  if (!session) return session;
  if (which === 'original') return { ...session, heardOriginal: true };
  if (which === 'stem') return { ...session, heardStem: true };
  return session;
}

/** « Está alinhada » n'est disponible qu'après les DEUX écoutes. */
export function canConfirmAlignment(session) {
  return Boolean(session && session.heardOriginal && session.heardStem);
}

/**
 * La session est-elle périmée ? Oui dès que le fichier, la calibration, le point de
 * comparaison ou le rôle change (y compris un retrait, où `fileIdentity` devient null).
 */
export function verificationIsStale(session, { role, canonicalPoint, fileIdentity, offsetSeconds } = {}) {
  if (!session) return true;
  if (session.role !== role) return true;
  if (session.fileIdentity !== fileIdentity) return true;
  if (session.canonicalPoint !== canonicalPoint) return true;
  const now = Number.isFinite(offsetSeconds) ? offsetSeconds : null;
  return session.offsetSeconds !== now;
}

/**
 * Cible de navigation pour une des deux écoutes. Le POINT CANONIQUE est le même pour les
 * deux ; seul l'offset change (celui de l'original, puis celui du stem). Seule la cible
 * média est bornée — le point canonique n'est jamais réécrit.
 * @returns {{ canonicalPoint: number, targetLocalTime: number|null }}
 */
export function comparisonSeekFor(session, offsetSeconds, which, duration) {
  const canonicalPoint = session?.canonicalPoint ?? null;
  if (!Number.isFinite(canonicalPoint) || !Number.isFinite(offsetSeconds)) {
    return { canonicalPoint, targetLocalTime: null };
  }
  // `which` n'entre pas dans le calcul : c'est l'offset fourni qui identifie la piste.
  // Le paramètre reste dans la signature pour rendre l'appel explicite côté UI.
  void which;
  return {
    canonicalPoint,
    targetLocalTime: clampLocalSeek(canonicalTimeToLocalAudio(canonicalPoint, offsetSeconds), duration),
  };
}
