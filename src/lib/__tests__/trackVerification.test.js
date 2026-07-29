/**
 * Régression — CIBLE DE CALIBRATION et VÉRIFICATION D'ALIGNEMENT (étape 6.1).
 *
 * Trois défauts constatés dans l'étape 6 (vérifiés dans le code) :
 *
 *  1. `onCalibrate={() => changeEditingMode(EDITING_MODE.WORD)}` IGNORAIT le rôle reçu.
 *     Il ouvrait le studio de mots, dont l'état interne `activeTrack` ne connaît que
 *     'full' et 'vocals' — donc cliquer « Calibrar » sur Instrumental calibrait
 *     l'original ou la voix, et l'INSTRUMENTAL ne pouvait JAMAIS être calibré : il ne
 *     pouvait donc jamais devenir source de synchronisation ni servir à la réécoute.
 *
 *  2. `verifyTrackAlignment` écrivait `verification: 'verified'` au premier clic, SANS
 *     aucune écoute. La « confirmation humaine » ne confirmait rien.
 *
 *  3. Aucune protection contre un remplacement de fichier pendant une calibration ouverte.
 *
 * Ce module rend la CIBLE explicite (chanson + rôle + identité de fichier, gelée pendant
 * la session) et exige les DEUX écoutes avant de pouvoir confirmer un alignement.
 * Aucune de ces opérations ne touche à un timing.
 */
import { describe, it, expect } from 'vitest';
import {
  CALIBRATION_STALE_MESSAGE,
  startCalibrationTarget, calibrationTargetValid,
  startVerification, markHeard, canConfirmAlignment, verificationIsStale,
  comparisonSeekFor,
} from '@/lib/trackVerification';
import { TRACK_ROLE } from '@/lib/localTracks';

const ID_B = 's21|instrumental.wav|29800000|1700000100000';
const ID_D = 's21|instrumental.wav|31000000|1800000000000';

// ═══════════════════ E. CIBLE DE CALIBRATION ═══════════════════
describe('E. la calibration vise un rôle EXPLICITE', () => {
  it('gèle le rôle et l’identité au moment du clic', () => {
    const t = startCalibrationTarget({ role: TRACK_ROLE.INSTRUMENTAL, fileIdentity: ID_B });
    expect(t.role).toBe(TRACK_ROLE.INSTRUMENTAL);
    expect(t.fileIdentity).toBe(ID_B);
  });

  it('refuse une cible sans rôle ou sans identité', () => {
    expect(startCalibrationTarget({ role: null, fileIdentity: ID_B })).toBe(null);
    expect(startCalibrationTarget({ role: TRACK_ROLE.VOCALS, fileIdentity: null })).toBe(null);
    expect(startCalibrationTarget()).toBe(null);
  });

  it('calibrer l’instrumental ne vise QUE l’instrumental', () => {
    const t = startCalibrationTarget({ role: TRACK_ROLE.INSTRUMENTAL, fileIdentity: ID_B });
    expect(calibrationTargetValid(t, {
      role: TRACK_ROLE.INSTRUMENTAL, fileIdentity: ID_B, ready: true,
    }).ok).toBe(true);
    // La même cible confrontée à un AUTRE rôle est invalide.
    expect(calibrationTargetValid(t, {
      role: TRACK_ROLE.VOCALS, fileIdentity: ID_B, ready: true,
    }).ok).toBe(false);
  });

  it('calibrer la voix ne vise QUE la voix', () => {
    const t = startCalibrationTarget({ role: TRACK_ROLE.VOCALS, fileIdentity: ID_B });
    expect(calibrationTargetValid(t, { role: TRACK_ROLE.VOCALS, fileIdentity: ID_B, ready: true }).ok).toBe(true);
    expect(calibrationTargetValid(t, { role: TRACK_ROLE.ORIGINAL, fileIdentity: ID_B, ready: true }).ok).toBe(false);
  });

  it('un changement de piste de LECTURE ne peut pas rediriger la calibration', () => {
    // La cible ne contient aucune notion de preview : elle est structurellement immunisée.
    const t = startCalibrationTarget({ role: TRACK_ROLE.INSTRUMENTAL, fileIdentity: ID_B });
    expect(Object.keys(t).sort()).toEqual(['fileIdentity', 'role']);
  });

  it('un fichier REMPLACÉ pendant la calibration fait rejeter le résultat', () => {
    const t = startCalibrationTarget({ role: TRACK_ROLE.INSTRUMENTAL, fileIdentity: ID_B });
    const r = calibrationTargetValid(t, {
      role: TRACK_ROLE.INSTRUMENTAL, fileIdentity: ID_D, ready: true,
    });
    expect(r.ok).toBe(false);
    expect(r.message).toBe(CALIBRATION_STALE_MESSAGE);
    expect(CALIBRATION_STALE_MESSAGE).toBe('A faixa foi alterada. Inicie a calibração novamente.');
  });

  it('un fichier RETIRÉ pendant la calibration fait rejeter le résultat', () => {
    const t = startCalibrationTarget({ role: TRACK_ROLE.INSTRUMENTAL, fileIdentity: ID_B });
    const r = calibrationTargetValid(t, { role: TRACK_ROLE.INSTRUMENTAL, fileIdentity: null, ready: false });
    expect(r.ok).toBe(false);
    expect(r.message).toBe(CALIBRATION_STALE_MESSAGE);
  });

  it('un audio devenu illisible fait rejeter le résultat', () => {
    const t = startCalibrationTarget({ role: TRACK_ROLE.VOCALS, fileIdentity: ID_B });
    expect(calibrationTargetValid(t, { role: TRACK_ROLE.VOCALS, fileIdentity: ID_B, ready: false }).ok).toBe(false);
  });

  it('sans cible ouverte, rien n’est valide (aucune écriture accidentelle)', () => {
    expect(calibrationTargetValid(null, { role: TRACK_ROLE.VOCALS, fileIdentity: ID_B, ready: true }).ok).toBe(false);
  });
});

// ═══════════════════ F. WORKFLOW DE COMPARAISON ═══════════════════
describe('F. comparaison original ↔ stem avant de confirmer', () => {
  const base = { role: TRACK_ROLE.VOCALS, canonicalPoint: 12.5, fileIdentity: ID_B, offsetSeconds: 1.5 };

  it('démarre avec AUCUNE écoute faite', () => {
    const s = startVerification(base);
    expect(s.heardOriginal).toBe(false);
    expect(s.heardStem).toBe(false);
    expect(canConfirmAlignment(s)).toBe(false);
  });

  it('« Está alinhada » reste indisponible après UNE seule écoute', () => {
    let s = startVerification(base);
    s = markHeard(s, 'original');
    expect(canConfirmAlignment(s)).toBe(false);
    let s2 = markHeard(startVerification(base), 'stem');
    expect(canConfirmAlignment(s2)).toBe(false);
  });

  it('devient disponible après les DEUX écoutes, dans n’importe quel ordre', () => {
    let a = startVerification(base);
    a = markHeard(markHeard(a, 'original'), 'stem');
    expect(canConfirmAlignment(a)).toBe(true);
    let b = startVerification(base);
    b = markHeard(markHeard(b, 'stem'), 'original');
    expect(canConfirmAlignment(b)).toBe(true);
  });

  it('les deux écoutes visent le MÊME point canonique, chacune avec SON offset', () => {
    const s = startVerification(base);
    // original calibré à +1,750 ; stem à +1,500 ; point canonique commun 12,500
    expect(comparisonSeekFor(s, 1.75, 'original', 190).targetLocalTime).toBeCloseTo(10.75, 10);
    expect(comparisonSeekFor(s, 1.5, 'stem', 190).targetLocalTime).toBeCloseTo(11, 10);
    // Le point canonique est identique dans les deux cas.
    expect(comparisonSeekFor(s, 1.75, 'original', 190).canonicalPoint).toBe(12.5);
    expect(comparisonSeekFor(s, 1.5, 'stem', 190).canonicalPoint).toBe(12.5);
  });

  it('borne seulement la cible média, jamais le point canonique', () => {
    const s = startVerification({ ...base, canonicalPoint: 1 });
    const r = comparisonSeekFor(s, 5, 'stem', 190);
    expect(r.targetLocalTime).toBe(0);
    expect(r.canonicalPoint).toBe(1);
  });

  it('sans calibration de la piste visée, aucune navigation n’est proposée', () => {
    const s = startVerification(base);
    expect(comparisonSeekFor(s, null, 'stem', 190).targetLocalTime).toBe(null);
  });

  it('un marquage inconnu est ignoré', () => {
    const s = markHeard(startVerification(base), 'bidon');
    expect(s.heardOriginal).toBe(false);
    expect(s.heardStem).toBe(false);
  });

  it('la session est périmée si le FICHIER change', () => {
    const s = markHeard(markHeard(startVerification(base), 'original'), 'stem');
    expect(verificationIsStale(s, { ...base, fileIdentity: ID_D })).toBe(true);
  });

  it('la session est périmée si la CALIBRATION change', () => {
    const s = markHeard(markHeard(startVerification(base), 'original'), 'stem');
    expect(verificationIsStale(s, { ...base, offsetSeconds: 2.1 })).toBe(true);
  });

  it('la session est périmée si le POINT DE COMPARAISON change', () => {
    const s = markHeard(markHeard(startVerification(base), 'original'), 'stem');
    expect(verificationIsStale(s, { ...base, canonicalPoint: 30 })).toBe(true);
  });

  it('la session est périmée si la piste est RETIRÉE', () => {
    const s = markHeard(markHeard(startVerification(base), 'original'), 'stem');
    expect(verificationIsStale(s, { ...base, fileIdentity: null })).toBe(true);
  });

  it('la session reste valide tant que rien ne change', () => {
    const s = markHeard(markHeard(startVerification(base), 'original'), 'stem');
    expect(verificationIsStale(s, base)).toBe(false);
    expect(canConfirmAlignment(s)).toBe(true);
  });

  it('confirmer ne renvoie aucune donnée de timing : ça ne peut rien modifier', () => {
    const lines = [{ text: 'a', time: 12.5, endTime: 16 }];
    const before = JSON.parse(JSON.stringify(lines));
    const s = markHeard(markHeard(startVerification(base), 'original'), 'stem');
    expect(canConfirmAlignment(s)).toBe(true);
    expect(Object.keys(s).sort())
      .toEqual(['canonicalPoint', 'fileIdentity', 'heardOriginal', 'heardStem', 'offsetSeconds', 'role']);
    expect(lines).toEqual(before);
  });

  it('l’original n’a pas besoin d’être vérifié contre lui-même', () => {
    expect(startVerification({ ...base, role: TRACK_ROLE.ORIGINAL })).toBe(null);
  });

  it('sans point canonique, aucune session ne démarre', () => {
    expect(startVerification({ ...base, canonicalPoint: null })).toBe(null);
  });
});
