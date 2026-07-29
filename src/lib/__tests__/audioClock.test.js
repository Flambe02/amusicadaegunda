/**
 * Régression — CONTRAT D'HORLOGE entre l'audio LOCAL du studio de mots et l'horloge
 * CANONIQUE de la chanson (YouTube), celle des timings de frase.
 *
 * Constaté avant cette étape (vérifié dans le code) :
 *  1. L'offset était stocké dans `localStorage` sous `karaoke-audio-offset-${song.id}` —
 *     par CHANSON et par piste, jamais par FICHIER. Changer de MP3 réutilisait
 *     silencieusement l'ancienne calibration.
 *  2. `parseInt(localStorage.getItem(...), 10)` sur une clé absente donne NaN → 0 :
 *     « pas encore calibré » et « calibré à zéro » étaient indistinguables, et la
 *     capture de mots partait d'un offset supposé nul sans jamais le dire.
 *  3. La conversion `± offsetSec` était recopiée à la main dans ~10 endroits du studio.
 *  4. L'avertissement de durée ne disait rien de l'alignement du DÉBUT.
 *
 * La convention EXISTANTE est conservée (elle est déjà celle du contrat demandé) :
 *     canonique = local + offset        local = canonique − offset
 * Un offset positif = l'événement arrive PLUS TARD sur YouTube que dans le fichier local.
 */
import { describe, it, expect } from 'vitest';
import {
  CALIBRATION_VERSION, MAX_OFFSET_SECONDS,
  localAudioTimeToCanonical, canonicalTimeToLocalAudio, clampLocalSeek,
  normalizeOffsetSeconds, computeAnchorOffset, formatOffsetSeconds,
  fileIdentity, makeCalibration, parseCalibrationRecord,
  calibrationStatus, canCaptureWords, durationMismatch,
} from '@/lib/audioClock';

const FILE_A = { songId: 42, fileName: 'musica.mp3', fileSize: 5_242_880, lastModified: 1_700_000_000_000 };
const FILE_B = { songId: 42, fileName: 'musica.mp3', fileSize: 5_242_881, lastModified: 1_800_000_000_000 };

const calibrated = (over = {}) => makeCalibration({
  ...FILE_A, offsetSeconds: 1.75, method: 'manual-anchor', localDuration: 184.42, canonicalDuration: 186.17, ...over,
});

// ═══════════════════════════ A. MAPPING DIRECT ═══════════════════════════
describe('A. local → canonique', () => {
  it('applique l’offset dans le bon sens', () => {
    expect(localAudioTimeToCanonical(10, 2)).toBe(12);
    expect(localAudioTimeToCanonical(10, -2)).toBe(8);
    expect(localAudioTimeToCanonical(10, 0)).toBe(10);
  });

  it('préserve la précision fractionnaire (pas d’arrondi parasite)', () => {
    expect(localAudioTimeToCanonical(10.75, 1.75)).toBeCloseTo(12.5, 10);
    expect(localAudioTimeToCanonical(11, 1.75)).toBeCloseTo(12.75, 10);
    expect(localAudioTimeToCanonical(0.001, 0.0005)).toBeCloseTo(0.0015, 10);
  });

  it('renvoie NaN sur une entrée non finie plutôt qu’un nombre inventé', () => {
    expect(Number.isNaN(localAudioTimeToCanonical(Number.NaN, 1))).toBe(true);
    expect(Number.isNaN(localAudioTimeToCanonical(10, Number.NaN))).toBe(true);
  });
});

// ═══════════════════════════ B. MAPPING INVERSE ═══════════════════════════
describe('B. canonique → local', () => {
  it('retire l’offset', () => {
    expect(canonicalTimeToLocalAudio(12, 2)).toBe(10);
    expect(canonicalTimeToLocalAudio(12.5, 1.75)).toBeCloseTo(10.75, 10);
  });

  it('aller-retour sans perte dans les deux sens', () => {
    for (const [t, off] of [[10, 2], [10.75, 1.75], [63.129, -0.42], [0, 0]]) {
      expect(canonicalTimeToLocalAudio(localAudioTimeToCanonical(t, off), off)).toBeCloseTo(t, 10);
      expect(localAudioTimeToCanonical(canonicalTimeToLocalAudio(t, off), off)).toBeCloseTo(t, 10);
    }
  });
});

// ═════════════════ C. CAPTURE D'UN MOT (temps canonique stocké) ═════════════════
describe('C. un mot capté sur l’audio local est stocké en temps CANONIQUE', () => {
  it('local 10 avec offset +2 se stocke à 12, dans les bornes de frase 12→18', () => {
    const stored = localAudioTimeToCanonical(10, 2);
    expect(stored).toBe(12);
    expect(stored).toBeGreaterThanOrEqual(12);
    expect(stored).toBeLessThanOrEqual(18);
  });

  it('local 11 avec offset +1.75 se stocke à 12.75 (jamais 11)', () => {
    expect(localAudioTimeToCanonical(11, 1.75)).toBeCloseTo(12.75, 10);
  });
});

// ═══════════════════════════ D. NAVIGATION ═══════════════════════════
describe('D. rejouer un mot stocké cherche la bonne position locale', () => {
  it('canonique 12 avec offset +2 → local 10', () => {
    expect(canonicalTimeToLocalAudio(12, 2)).toBe(10);
  });
  it('canonique 12.75 avec offset +1.75 → local 11', () => {
    expect(canonicalTimeToLocalAudio(12.75, 1.75)).toBeCloseTo(11, 10);
  });
});

// ═══════════════ E. CALIBRATION ABSENTE ≠ ZÉRO ═══════════════
describe('E. une calibration ABSENTE n’est pas un zéro calibré', () => {
  const identity = fileIdentity(FILE_A);

  it('aucun enregistrement → statut « missing »', () => {
    expect(calibrationStatus(null, identity)).toBe('missing');
    expect(calibrationStatus(undefined, identity)).toBe('missing');
  });

  it('la capture de mots est BLOQUÉE sans calibration', () => {
    expect(canCaptureWords(null, identity)).toBe(false);
  });

  it('aucun offset n’est supposé : le statut ne fournit pas de valeur par défaut', () => {
    expect(normalizeOffsetSeconds(null)).toBe(null);
    expect(normalizeOffsetSeconds(undefined)).toBe(null);
    expect(normalizeOffsetSeconds('')).toBe(null);
  });
});

// ═══════════════ F. ZÉRO EXPLICITEMENT CALIBRÉ ═══════════════
describe('F. un zéro explicitement confirmé est une vraie calibration', () => {
  const identity = fileIdentity(FILE_A);
  const zero = makeCalibration({ ...FILE_A, offsetSeconds: 0, method: 'explicit-zero' });

  it('statut « calibrated » et capture autorisée', () => {
    expect(zero.offsetSeconds).toBe(0);
    expect(zero.status).toBe('calibrated');
    expect(calibrationStatus(zero, identity)).toBe('calibrated');
    expect(canCaptureWords(zero, identity)).toBe(true);
  });

  it('se distingue d’une calibration absente', () => {
    expect(calibrationStatus(zero, identity)).not.toBe(calibrationStatus(null, identity));
    expect(zero.method).toBe('explicit-zero');
  });
});

// ═══════════════════ G. CHANGEMENT DE FICHIER ═══════════════════
describe('G. une calibration n’est jamais réutilisée pour un autre fichier', () => {
  it('la calibration du fichier A ne s’applique pas au fichier B', () => {
    const rec = calibrated();
    expect(calibrationStatus(rec, fileIdentity(FILE_A))).toBe('calibrated');
    expect(calibrationStatus(rec, fileIdentity(FILE_B))).toBe('stale-file');
    expect(canCaptureWords(rec, fileIdentity(FILE_B))).toBe(false);
  });

  it('même nom mais taille différente = autre identité', () => {
    expect(fileIdentity({ ...FILE_A, fileSize: 999 })).not.toBe(fileIdentity(FILE_A));
  });

  it('même nom mais lastModified différent = autre identité', () => {
    expect(fileIdentity({ ...FILE_A, lastModified: 1 })).not.toBe(fileIdentity(FILE_A));
  });

  it('le MÊME fichier inchangé retrouve sa calibration', () => {
    expect(fileIdentity({ ...FILE_A })).toBe(fileIdentity(FILE_A));
    expect(canCaptureWords(calibrated(), fileIdentity(FILE_A))).toBe(true);
  });

  it('l’identité ne contient aucun chemin absolu', () => {
    const id = fileIdentity({ ...FILE_A, fileName: 'C:/Users/moi/Musique/musica.mp3' });
    expect(id).not.toContain('C:/Users');
    expect(id).not.toContain('moi');
  });
});

// ═══════════════════ H. ISOLATION PAR CHANSON ═══════════════════
describe('H. une calibration ne traverse pas les chansons', () => {
  it('chanson 42 ≠ chanson 43 pour le même fichier', () => {
    expect(fileIdentity({ ...FILE_A, songId: 43 })).not.toBe(fileIdentity(FILE_A));
    expect(calibrationStatus(calibrated(), fileIdentity({ ...FILE_A, songId: 43 }))).toBe('stale-file');
  });
});

// ═══════════════════ I. OFFSET INVALIDE ═══════════════════
describe('I. offsets invalides rejetés ou normalisés', () => {
  it('rejette NaN, Infinity et les non-nombres', () => {
    for (const bad of [Number.NaN, Infinity, -Infinity, 'abc', {}, [], true, null, undefined]) {
      expect(normalizeOffsetSeconds(bad)).toBe(null);
    }
  });

  it('accepte les nombres finis, y compris négatifs et fractionnaires', () => {
    expect(normalizeOffsetSeconds(0)).toBe(0);
    expect(normalizeOffsetSeconds(-2.25)).toBe(-2.25);
    expect(normalizeOffsetSeconds('1.75')).toBe(1.75); // champ numérique de l'UI
  });

  it('rejette au-delà du maximum justifié', () => {
    expect(normalizeOffsetSeconds(MAX_OFFSET_SECONDS)).toBe(MAX_OFFSET_SECONDS);
    expect(normalizeOffsetSeconds(MAX_OFFSET_SECONDS + 1)).toBe(null);
    expect(normalizeOffsetSeconds(-MAX_OFFSET_SECONDS - 1)).toBe(null);
  });

  it('rejette un enregistrement malformé ou d’une version inconnue', () => {
    expect(parseCalibrationRecord(null)).toBe(null);
    expect(parseCalibrationRecord('pas du json')).toBe(null);
    expect(parseCalibrationRecord({})).toBe(null);
    expect(parseCalibrationRecord({ ...calibrated(), version: 999 })).toBe(null);
    expect(parseCalibrationRecord({ ...calibrated(), offsetSeconds: 'x' })).toBe(null);
    expect(parseCalibrationRecord({ ...calibrated(), fileIdentity: '' })).toBe(null);
  });

  it('accepte un enregistrement valide, y compris sérialisé en JSON', () => {
    const rec = calibrated();
    expect(parseCalibrationRecord(rec)).toMatchObject({ offsetSeconds: 1.75, status: 'calibrated' });
    expect(parseCalibrationRecord(JSON.stringify(rec))).toMatchObject({ offsetSeconds: 1.75 });
    expect(rec.version).toBe(CALIBRATION_VERSION);
  });
});

// ═══════════════════ J. NAVIGATION NÉGATIVE ═══════════════════
describe('J. un temps local négatif borne la NAVIGATION, jamais la donnée', () => {
  it('canonique 1 avec offset +5 → cible de seek bornée à 0', () => {
    const local = canonicalTimeToLocalAudio(1, 5);
    expect(local).toBe(-4);                       // la conversion dit la vérité…
    expect(clampLocalSeek(local, 180)).toBe(0);   // …seule la cible média est bornée
  });

  it('borne aussi au-delà de la durée locale', () => {
    expect(clampLocalSeek(500, 180)).toBe(180);
    expect(clampLocalSeek(90, 180)).toBe(90);
    expect(clampLocalSeek(90, 0)).toBe(90);       // durée inconnue → pas de borne haute
    expect(clampLocalSeek(Number.NaN, 180)).toBe(0);
  });

  it('ne réécrit PAS le temps canonique stocké', () => {
    const canonicalStored = 1;
    clampLocalSeek(canonicalTimeToLocalAudio(canonicalStored, 5), 180);
    expect(canonicalStored).toBe(1);
  });
});

// ═══════════════════ K. DURÉE ≠ ALIGNEMENT ═══════════════════
describe('K. l’écart de durée est indépendant de la calibration', () => {
  it('des durées proches n’impliquent pas un début calibré', () => {
    const m = durationMismatch(184.4, 184.6);
    expect(m.level).toBe('ok');
    expect(calibrationStatus(null, fileIdentity(FILE_A))).toBe('missing'); // toujours à calibrer
  });

  it('un écart sévère alerte MÊME avec une calibration valide', () => {
    const m = durationMismatch(120, 200);
    expect(m.level).toBe('severe');
    expect(m.deltaSec).toBeCloseTo(-80, 6);
    expect(canCaptureWords(calibrated(), fileIdentity(FILE_A))).toBe(true); // les deux sont séparés
  });

  it('durée inconnue = pas de verdict', () => {
    expect(durationMismatch(0, 200).level).toBe('unknown');
    expect(durationMismatch(200, null).level).toBe('unknown');
  });
});

// ═══════════════════ L. TIMINGS DE MOTS EXISTANTS ═══════════════════
describe('L. changer la calibration ne touche JAMAIS les mots déjà enregistrés', () => {
  const words = Object.freeze([
    { id: 'w1', text: 'aaa', start: 12.75, end: 13.4 },
    { id: 'w2', text: 'bbb', start: 13.4, end: 14.2 },
  ]);

  it('les valeurs canoniques sont inchangées après recalibration', () => {
    const before = JSON.parse(JSON.stringify(words));
    makeCalibration({ ...FILE_A, offsetSeconds: 9.5, method: 'manual-anchor' });
    expect(words).toEqual(before);
  });

  it('aucune fonction du module ne propose de décalage en masse', () => {
    // Garde-fou explicite : un décalage global est un outil FUTUR, avec aperçu,
    // décompte, confirmation et annulation. Il ne doit pas exister ici.
    return import('@/lib/audioClock').then((mod) => {
      const names = Object.keys(mod).join(' ').toLowerCase();
      expect(names).not.toMatch(/shiftall|bulkshift|rewriteall|applyoffsetto/);
    });
  });
});

// ═══════════════════ Affichage de l'offset ═══════════════════
describe('formatOffsetSeconds — lisible et signé, en pt-BR', () => {
  it('affiche le signe et la milliseconde avec une virgule décimale', () => {
    expect(formatOffsetSeconds(1.75)).toBe('+1,750 s');
    expect(formatOffsetSeconds(-0.42)).toBe('−0,420 s');
    expect(formatOffsetSeconds(0)).toBe('0,000 s');
  });
  it('reste sûr sur une valeur absente', () => {
    expect(formatOffsetSeconds(null)).toBe('—');
    expect(formatOffsetSeconds(Number.NaN)).toBe('—');
  });
});

// ═══════════════════ Calcul depuis deux repères ═══════════════════
describe('computeAnchorOffset — offset = canonique − local', () => {
  it('YouTube 12,500 s contre audio local 10,750 s donne +1,750 s', () => {
    expect(computeAnchorOffset(12.5, 10.75)).toBeCloseTo(1.75, 10);
  });
  it('gère un audio local en AVANCE sur la vidéo (offset négatif)', () => {
    expect(computeAnchorOffset(10, 12)).toBeCloseTo(-2, 10);
  });
  it('refuse des repères invalides', () => {
    expect(computeAnchorOffset(Number.NaN, 10)).toBe(null);
    expect(computeAnchorOffset(10, null)).toBe(null);
    expect(computeAnchorOffset(10, -1)).toBe(null); // un repère local négatif n'existe pas
  });
});
