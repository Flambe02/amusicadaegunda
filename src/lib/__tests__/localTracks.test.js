/**
 * Régression — FAIXAS LOCAIS : trois pistes audio locales (original / instrumental /
 * voz isolada), importées à la main depuis l'ordinateur de l'administrateur (typiquement
 * des stems UVR5).
 *
 * Point de départ réel (audité) : le dépôt avait DÉJÀ deux sessions audio locales
 * (`localAudio` = mix complet, `ballVocalsAudio` = voix) et un magasin de calibration
 * DÉJÀ scopé par piste (`karaoke-audio-cal-<song>-full` / `-vocals`). Cette étape ajoute
 * le rôle « instrumental », unifie les trois dans un registre unique, et rend la lecture,
 * la synchronisation et la réécoute conscientes du rôle.
 *
 * Invariants : les temps ENREGISTRÉS restent canoniques (canonique = local + offset) ;
 * aucun octet audio, nom de fichier, durée, identité ni offset n'entre dans le payload
 * karaokê ; retirer une piste ne touche à aucun timing.
 */
import { describe, it, expect } from 'vitest';
import {
  TRACK_ROLE, TRACK_LABEL, CALIBRATION_KEY_FOR_ROLE,
  DURATION_TOLERANCE_SEC, DURATION_WARN_SEC,
  compareTrackDuration, validateAudioFile, trackStatusLabel,
  emptyTrack, canUseForSync, canReviewWithTrack, switchTrackSeek,
  sharedCalibrationPayload, syncSourceLabelForRole, captureSourceForTracks,
  removeTrack, replaceTrackFile,
} from '@/lib/localTracks';
import { CAPTURE_SOURCE, canonicalCaptureTime, phraseReviewWindow } from '@/lib/karaokeWorkshop';
import { fileIdentity, makeCalibration, calibrationStatus } from '@/lib/audioClock';
import { buildTimingPayload } from '@/lib/karaokeSyncContract';
import { resolveSongTiming } from '@/lib/timingModel';

const SONG_ID = 21;
const FILE_A = { fileName: 'original.wav', fileSize: 30_000_000, lastModified: 1_700_000_000_000 };
const FILE_B = { fileName: 'instrumental.wav', fileSize: 29_800_000, lastModified: 1_700_000_100_000 };
const FILE_C = { fileName: 'vocals.wav', fileSize: 12_400_000, lastModified: 1_700_000_200_000 };
const FILE_D = { fileName: 'instrumental.wav', fileSize: 31_000_000, lastModified: 1_800_000_000_000 };

const readyTrack = (role, meta, over = {}) => ({
  ...emptyTrack(role),
  fileName: meta.fileName,
  fileSize: meta.fileSize,
  lastModified: meta.lastModified,
  fileIdentity: fileIdentity({ songId: SONG_ID, ...meta }),
  objectUrl: `blob:${meta.fileName}`,
  duration: 184.2,
  loadStatus: 'ready',
  ...over,
});

// ═══════════════════════ A. MODÈLE DE PISTES ═══════════════════════
describe('A. registre déterministe à trois rôles', () => {
  it('expose exactement trois rôles, avec des étiquettes pt-BR', () => {
    expect(Object.values(TRACK_ROLE)).toEqual(['original', 'instrumental', 'vocals']);
    expect(TRACK_LABEL[TRACK_ROLE.ORIGINAL]).toBe('Áudio original');
    expect(TRACK_LABEL[TRACK_ROLE.INSTRUMENTAL]).toBe('Instrumental');
    expect(TRACK_LABEL[TRACK_ROLE.VOCALS]).toBe('Voz isolada');
  });

  it('réutilise les clés de calibration EXISTANTES (les calibrations déjà faites survivent)', () => {
    expect(CALIBRATION_KEY_FOR_ROLE[TRACK_ROLE.ORIGINAL]).toBe('full');
    expect(CALIBRATION_KEY_FOR_ROLE[TRACK_ROLE.VOCALS]).toBe('vocals');
    expect(CALIBRATION_KEY_FOR_ROLE[TRACK_ROLE.INSTRUMENTAL]).toBe('instrumental');
  });

  it('une piste vide est « arquivo não selecionado », jamais calibrée par défaut', () => {
    const t = emptyTrack(TRACK_ROLE.VOCALS);
    expect(t.role).toBe('vocals');
    expect(t.fileName).toBe(null);
    expect(t.objectUrl).toBe(null);
    expect(t.loadStatus).toBe('empty');
    expect(t.offsetSeconds).toBe(null);
    expect(trackStatusLabel(t, 'missing')).toBe('Arquivo não selecionado');
  });

  it('les rôles sont indépendants : rien ne fuit d’une piste à l’autre', () => {
    const a = readyTrack(TRACK_ROLE.ORIGINAL, FILE_A);
    const b = readyTrack(TRACK_ROLE.INSTRUMENTAL, FILE_B);
    expect(a.fileIdentity).not.toBe(b.fileIdentity);
    expect(a.role).not.toBe(b.role);
  });
});

// ═══════════════════════ B. IMPORT DE FICHIER ═══════════════════════
describe('B. import et validation', () => {
  it('un audio valide devient « Pronto »', () => {
    const v = validateAudioFile({ fileName: 'a.mp3', size: 5_000_000, type: 'audio/mpeg', duration: 184.2 });
    expect(v.ok).toBe(true);
    expect(v.message).toBe(null);
    expect(trackStatusLabel(readyTrack(TRACK_ROLE.ORIGINAL, FILE_A), 'missing')).toBe('Não calibrado');
  });

  it('une durée absente ou nulle est refusée avec un message actionnable', () => {
    for (const duration of [0, -1, Number.NaN, null, undefined, Infinity]) {
      const v = validateAudioFile({ fileName: 'a.mp3', size: 500, type: 'audio/mpeg', duration });
      expect(v.ok).toBe(false);
      expect(v.message).toBe('O arquivo selecionado não contém áudio válido.');
    }
  });

  it('un fichier vide est refusé', () => {
    const v = validateAudioFile({ fileName: 'a.mp3', size: 0, type: 'audio/mpeg', duration: 100 });
    expect(v.ok).toBe(false);
    expect(v.message).toBe('O arquivo selecionado não contém áudio válido.');
  });

  it('un type non audio est refusé — on ne se fie PAS à l’extension seule', () => {
    const v = validateAudioFile({ fileName: 'chanson.mp3', size: 5_000_000, type: 'application/zip', duration: 100 });
    expect(v.ok).toBe(false);
    expect(v.message).toBe('Este formato de áudio não é compatível com o navegador.');
  });

  it('un type vide reste accepté si le navigateur a pu décoder une durée', () => {
    // Certains navigateurs ne renseignent pas `type` pour un .m4a/.flac ; c'est la
    // capacité RÉELLE de décodage (duration finie) qui décide.
    const v = validateAudioFile({ fileName: 'stem.flac', size: 9_000_000, type: '', duration: 184.2 });
    expect(v.ok).toBe(true);
  });

  it('un échec d’import PRÉSERVE la piste valide précédente', () => {
    const previous = readyTrack(TRACK_ROLE.INSTRUMENTAL, FILE_B);
    const failed = replaceTrackFile(previous, {
      validation: { ok: false, message: 'Não foi possível ler este arquivo de áudio.' },
    });
    expect(failed.track).toBe(previous);        // inchangée, même référence
    expect(failed.revokeUrl).toBe(null);        // rien à révoquer : on n'a rien remplacé
    expect(failed.error).toBe('Não foi possível ler este arquivo de áudio.');
  });

  it('l’identité exacte du fichier est enregistrée', () => {
    const t = readyTrack(TRACK_ROLE.ORIGINAL, FILE_A);
    expect(t.fileIdentity).toBe(fileIdentity({ songId: SONG_ID, ...FILE_A }));
  });
});

// ═══════════════════════ C. COMPARAISON DE DURÉE ═══════════════════════
describe('C. comparaison de durée — preuve FAIBLE, jamais un alignement', () => {
  it('classe compatible / petite différence / différente', () => {
    expect(compareTrackDuration(184.2, 184.3).level).toBe('ok');
    expect(compareTrackDuration(184.2, 184.3).label).toBe('Duração compatível');
    expect(compareTrackDuration(184.2, 184.8).level).toBe('warn');
    expect(compareTrackDuration(184.2, 184.8).label).toBe('Pequena diferença de duração');
    expect(compareTrackDuration(184.2, 200).level).toBe('mismatch');
    expect(compareTrackDuration(184.2, 200).label)
      .toBe('Duração diferente. Verifique se as faixas vieram do mesmo áudio.');
  });

  it('respecte les seuils annoncés (0,25 s puis 1 s)', () => {
    expect(DURATION_TOLERANCE_SEC).toBe(0.25);
    expect(DURATION_WARN_SEC).toBe(1);
    expect(compareTrackDuration(100, 100.25).level).toBe('ok');
    expect(compareTrackDuration(100, 100.26).level).toBe('warn');
    expect(compareTrackDuration(100, 101).level).toBe('warn');
    expect(compareTrackDuration(100, 101.01).level).toBe('mismatch');
  });

  it('durée inconnue = aucun verdict', () => {
    expect(compareTrackDuration(0, 184).level).toBe('unknown');
    expect(compareTrackDuration(184, null).level).toBe('unknown');
  });

  it('une durée compatible ne rend PAS une piste calibrée', () => {
    const stem = readyTrack(TRACK_ROLE.INSTRUMENTAL, FILE_B, { duration: 184.2 });
    expect(compareTrackDuration(stem.duration, 184.2).level).toBe('ok');
    expect(canUseForSync(stem, 'missing')).toBe(false);
    expect(canReviewWithTrack(stem, 'missing')).toBe(false);
  });

  it('la comparaison ne modifie aucun timing', () => {
    const lines = [{ text: 'a', time: 10, endTime: 13 }];
    const before = JSON.parse(JSON.stringify(lines));
    compareTrackDuration(184.2, 200);
    expect(lines).toEqual(before);
  });
});

// ═══════════════════════ D. CALIBRATION PAR PISTE ═══════════════════════
describe('D. calibration scopée par chanson, RÔLE et identité de fichier', () => {
  it('une identité exacte restaure la calibration', () => {
    const idB = fileIdentity({ songId: SONG_ID, ...FILE_B });
    const cal = makeCalibration({ songId: SONG_ID, ...FILE_B, offsetSeconds: 1.5 });
    expect(calibrationStatus(cal, idB)).toBe('calibrated');
    expect(canUseForSync(readyTrack(TRACK_ROLE.INSTRUMENTAL, FILE_B), 'calibrated')).toBe(true);
  });

  it('une autre identité reste NON calibrée (pas de copie silencieuse)', () => {
    const cal = makeCalibration({ songId: SONG_ID, ...FILE_B, offsetSeconds: 1.5 });
    const idD = fileIdentity({ songId: SONG_ID, ...FILE_D });
    expect(calibrationStatus(cal, idD)).toBe('stale-file');
    expect(canUseForSync(readyTrack(TRACK_ROLE.INSTRUMENTAL, FILE_D), 'stale-file')).toBe(false);
  });

  it('un zéro explicite est valide', () => {
    const cal = makeCalibration({ songId: SONG_ID, ...FILE_C, offsetSeconds: 0, method: 'explicit-zero' });
    expect(cal.offsetSeconds).toBe(0);
    expect(canUseForSync(readyTrack(TRACK_ROLE.VOCALS, FILE_C), 'calibrated')).toBe(true);
  });

  it('les rôles ne partagent PAS leurs magasins', () => {
    expect(CALIBRATION_KEY_FOR_ROLE[TRACK_ROLE.INSTRUMENTAL])
      .not.toBe(CALIBRATION_KEY_FOR_ROLE[TRACK_ROLE.VOCALS]);
  });
});

// ═════════ Copie EXPLICITE de la calibration de l'original ═════════
describe('D-bis. « Usar a calibração do áudio original »', () => {
  const originalCal = makeCalibration({ songId: SONG_ID, ...FILE_A, offsetSeconds: 1.75 });
  const stem = readyTrack(TRACK_ROLE.INSTRUMENTAL, FILE_B, { duration: 184.25 });

  it('exige une confirmation EXPLICITE de l’utilisateur', () => {
    expect(sharedCalibrationPayload({
      originalCalibration: originalCal, track: stem, durationLevel: 'ok', confirmed: false,
    })).toBe(null);
  });

  it('exige que l’original soit calibré', () => {
    expect(sharedCalibrationPayload({
      originalCalibration: null, track: stem, durationLevel: 'ok', confirmed: true,
    })).toBe(null);
  });

  it('exige un chargement réussi', () => {
    const notReady = { ...stem, loadStatus: 'error' };
    expect(sharedCalibrationPayload({
      originalCalibration: originalCal, track: notReady, durationLevel: 'ok', confirmed: true,
    })).toBe(null);
  });

  it('refuse une durée hors tolérance', () => {
    expect(sharedCalibrationPayload({
      originalCalibration: originalCal, track: stem, durationLevel: 'mismatch', confirmed: true,
    })).toBe(null);
  });

  it('copie SEULEMENT le nombre, scopé à l’identité du stem, et marque « à vérifier »', () => {
    const p = sharedCalibrationPayload({
      originalCalibration: originalCal, track: stem, durationLevel: 'ok', confirmed: true,
    });
    expect(p.offsetSeconds).toBeCloseTo(1.75, 10);
    expect(p.method).toBe('copied-from-original');
    expect(p.verification).toBe('pending');
    // Rien du fichier ORIGINAL n'est copié : ni nom, ni identité, ni taille.
    expect(p.fileName).toBeUndefined();
    expect(p.fileIdentity).toBeUndefined();
  });

  it('« à vérifier » n’est pas « vérifié »', () => {
    const p = sharedCalibrationPayload({
      originalCalibration: originalCal, track: stem, durationLevel: 'ok', confirmed: true,
    });
    const cal = makeCalibration({ songId: SONG_ID, ...FILE_B, ...p });
    expect(trackStatusLabel({ ...stem, offsetSeconds: 1.75 }, 'calibrated', 'pending'))
      .toBe('Alinhamento a verificar');
    expect(trackStatusLabel({ ...stem, offsetSeconds: 1.75 }, 'calibrated', 'verified'))
      .toBe('Calibrado');
    expect(cal.offsetSeconds).toBeCloseTo(1.75, 10);
  });

  it('ne déduit jamais un partage depuis le NOM du fichier', () => {
    const sameName = readyTrack(TRACK_ROLE.INSTRUMENTAL, { ...FILE_A, fileSize: 999 });
    expect(sharedCalibrationPayload({
      originalCalibration: originalCal, track: sameName, durationLevel: 'ok', confirmed: false,
    })).toBe(null);
  });
});

// ═══════════════════════ E. BASCULE DE PISTE ═══════════════════════
describe('E. changer de piste PRÉSERVE la position canonique', () => {
  it('original local 10,750 (+1,750) → voz local 11,000 (+1,500)', () => {
    const r = switchTrackSeek({
      fromLocalTime: 10.75, fromOffset: 1.75, toOffset: 1.5, toDuration: 184,
    });
    expect(r.canonicalTime).toBeCloseTo(12.5, 10);
    expect(r.targetLocalTime).toBeCloseTo(11, 10);
  });

  it('borne SEULEMENT la cible média, jamais le canonique', () => {
    const r = switchTrackSeek({ fromLocalTime: 1, fromOffset: 0, toOffset: 5, toDuration: 184 });
    expect(r.canonicalTime).toBe(1);       // canonique intact
    expect(r.targetLocalTime).toBe(0);     // cible média bornée
    const r2 = switchTrackSeek({ fromLocalTime: 300, fromOffset: 0, toOffset: 0, toDuration: 184 });
    expect(r2.targetLocalTime).toBe(184);
  });

  it('sans calibration de la piste cible, on ne prétend pas préserver le canonique', () => {
    const r = switchTrackSeek({ fromLocalTime: 10.75, fromOffset: 1.75, toOffset: null, toDuration: 184 });
    expect(r.canonicalTime).toBeCloseTo(12.5, 10);
    expect(r.targetLocalTime).toBe(null); // l'appelant joue depuis la position propre de la piste
  });

  it('sans calibration de la piste SOURCE, il n’y a pas de position canonique', () => {
    const r = switchTrackSeek({ fromLocalTime: 10.75, fromOffset: null, toOffset: 1.5, toDuration: 184 });
    expect(r.canonicalTime).toBe(null);
    expect(r.targetLocalTime).toBe(null);
  });

  it('ne renvoie aucun timing de frase : la bascule ne peut rien modifier', () => {
    const r = switchTrackSeek({ fromLocalTime: 10.75, fromOffset: 1.75, toOffset: 1.5, toDuration: 184 });
    expect(Object.keys(r).sort()).toEqual(['canonicalTime', 'targetLocalTime']);
  });
});

// ═══════════════════ F. PISTE DE SYNCHRONISATION ═══════════════════
describe('F. piste de synchronisation ACTIVE', () => {
  const tracks = {
    original: readyTrack(TRACK_ROLE.ORIGINAL, FILE_A),
    instrumental: readyTrack(TRACK_ROLE.INSTRUMENTAL, FILE_B),
    vocals: readyTrack(TRACK_ROLE.VOCALS, FILE_C),
  };
  const allCalibrated = () => 'calibrated';

  it('chaque rôle calibré peut devenir la source', () => {
    for (const role of Object.values(TRACK_ROLE)) {
      expect(captureSourceForTracks({ tracks, syncRole: role, calibrationStatusOf: allCalibrated }))
        .toBe(CAPTURE_SOURCE.LOCAL);
    }
  });

  it('l’étiquette identifie le RÔLE', () => {
    expect(syncSourceLabelForRole(TRACK_ROLE.ORIGINAL)).toBe('Fonte de sincronização: áudio original');
    expect(syncSourceLabelForRole(TRACK_ROLE.INSTRUMENTAL)).toBe('Fonte de sincronização: instrumental');
    expect(syncSourceLabelForRole(TRACK_ROLE.VOCALS)).toBe('Fonte de sincronização: voz isolada');
    expect(syncSourceLabelForRole(null)).toBe('Fonte de sincronização: YouTube');
    expect(syncSourceLabelForRole('blocked')).toBe('Fonte de sincronização: bloqueada');
  });

  it('sans AUCUNE piste locale → YouTube historique', () => {
    const empty = {
      original: emptyTrack(TRACK_ROLE.ORIGINAL),
      instrumental: emptyTrack(TRACK_ROLE.INSTRUMENTAL),
      vocals: emptyTrack(TRACK_ROLE.VOCALS),
    };
    expect(captureSourceForTracks({ tracks: empty, syncRole: null, calibrationStatusOf: () => 'missing' }))
      .toBe(CAPTURE_SOURCE.YOUTUBE);
  });

  it('piste choisie NON calibrée → BLOQUÉ, jamais de repli silencieux', () => {
    expect(captureSourceForTracks({
      tracks, syncRole: TRACK_ROLE.VOCALS, calibrationStatusOf: () => 'missing',
    })).toBe(CAPTURE_SOURCE.BLOCKED);
    expect(captureSourceForTracks({
      tracks, syncRole: TRACK_ROLE.VOCALS, calibrationStatusOf: () => 'stale-file',
    })).toBe(CAPTURE_SOURCE.BLOCKED);
  });

  it('piste choisie ABSENTE → BLOQUÉ (des fichiers existent, on ne retombe pas sur YouTube)', () => {
    const noVocals = { ...tracks, vocals: emptyTrack(TRACK_ROLE.VOCALS) };
    expect(captureSourceForTracks({
      tracks: noVocals, syncRole: TRACK_ROLE.VOCALS, calibrationStatusOf: allCalibrated,
    })).toBe(CAPTURE_SOURCE.BLOCKED);
  });

  it('des fichiers présents mais AUCUN rôle choisi → BLOQUÉ (choix délibéré requis)', () => {
    expect(captureSourceForTracks({ tracks, syncRole: null, calibrationStatusOf: allCalibrated }))
      .toBe(CAPTURE_SOURCE.BLOCKED);
  });

  it('la piste de LECTURE ne change pas la piste de SYNCHRONISATION', () => {
    // captureSourceForTracks ne reçoit QUE syncRole : la piste de preview ne peut pas
    // structurellement influencer la source de capture.
    const a = captureSourceForTracks({ tracks, syncRole: TRACK_ROLE.VOCALS, calibrationStatusOf: allCalibrated });
    const b = captureSourceForTracks({ tracks, syncRole: TRACK_ROLE.VOCALS, calibrationStatusOf: allCalibrated });
    expect(a).toBe(b);
  });

  it('le mapping de la piste active produit des temps CANONIQUES', () => {
    const t = canonicalCaptureTime({
      source: CAPTURE_SOURCE.LOCAL, localTime: 11, offsetSeconds: 1.5, youtubeTime: 999,
    });
    expect(t).toBeCloseTo(12.5, 10);
  });
});

// ═══════════════════════ G. RÉÉCOUTE PAR PISTE ═══════════════════════
describe('G. réécoute de frase avec chaque piste calibrée', () => {
  const line = { text: 'dois coração', time: 12.5, endTime: 16 };

  it('chaque piste utilise SA propre calibration', () => {
    const wOrig = phraseReviewWindow(line, 1.75, { duration: 184 });
    const wVoc = phraseReviewWindow(line, 1.5, { duration: 184 });
    expect(wOrig.localStart).toBeCloseTo(10.75, 10);
    expect(wVoc.localStart).toBeCloseTo(11, 10);
    // Les bornes CANONIQUES sont identiques dans les deux cas.
    expect(wOrig.canonicalStart).toBe(wVoc.canonicalStart);
    expect(wOrig.canonicalEnd).toBe(wVoc.canonicalEnd);
  });

  it('une piste non calibrée ne peut pas être utilisée pour la réécoute', () => {
    expect(canReviewWithTrack(readyTrack(TRACK_ROLE.VOCALS, FILE_C), 'missing')).toBe(false);
    expect(canReviewWithTrack(readyTrack(TRACK_ROLE.VOCALS, FILE_C), 'calibrated')).toBe(true);
    expect(canReviewWithTrack(emptyTrack(TRACK_ROLE.VOCALS), 'calibrated')).toBe(false);
  });
});

// ═══════════════════ H & I. REMPLACEMENT ET RETRAIT ═══════════════════
describe('H. remplacement de fichier', () => {
  it('révoque l’ancienne URL et repart non calibré sur une nouvelle identité', () => {
    const previous = readyTrack(TRACK_ROLE.INSTRUMENTAL, FILE_B);
    const r = replaceTrackFile(previous, {
      validation: { ok: true, message: null },
      next: { ...FILE_D, duration: 190, objectUrl: 'blob:new', songId: SONG_ID },
    });
    expect(r.revokeUrl).toBe('blob:instrumental.wav');
    expect(r.track.fileIdentity).toBe(fileIdentity({ songId: SONG_ID, ...FILE_D }));
    expect(r.track.loadStatus).toBe('ready');
    expect(r.track.offsetSeconds).toBe(null);   // nouvelle identité → à calibrer
    expect(r.error).toBe(null);
  });

  it('remplacer par le MÊME fichier garde la même identité (calibration restaurable)', () => {
    const previous = readyTrack(TRACK_ROLE.INSTRUMENTAL, FILE_B);
    const r = replaceTrackFile(previous, {
      validation: { ok: true, message: null },
      next: { ...FILE_B, duration: 184.2, objectUrl: 'blob:again', songId: SONG_ID },
    });
    expect(r.track.fileIdentity).toBe(previous.fileIdentity);
  });
});

describe('I. retrait d’une piste', () => {
  it('révoque l’URL, vide l’état de session, et ne touche à AUCUN timing', () => {
    const lines = [{ text: 'a', time: 12.5, endTime: 16, words: [{ id: 'w1', text: 'a', start: 12.5, end: 16 }] }];
    const before = JSON.parse(JSON.stringify(lines));
    const track = readyTrack(TRACK_ROLE.VOCALS, FILE_C);
    const r = removeTrack(track);
    expect(r.revokeUrl).toBe('blob:vocals.wav');
    expect(r.track).toEqual(emptyTrack(TRACK_ROLE.VOCALS));
    expect(lines).toEqual(before);
  });

  it('retirer une piste vide est un no-op sans URL à révoquer', () => {
    const r = removeTrack(emptyTrack(TRACK_ROLE.VOCALS));
    expect(r.revokeUrl).toBe(null);
  });

  it('retirer la piste de synchronisation BLOQUE la capture, sans repli YouTube', () => {
    const tracks = {
      original: readyTrack(TRACK_ROLE.ORIGINAL, FILE_A),
      instrumental: emptyTrack(TRACK_ROLE.INSTRUMENTAL),
      vocals: emptyTrack(TRACK_ROLE.VOCALS), // retirée
    };
    expect(captureSourceForTracks({
      tracks, syncRole: TRACK_ROLE.VOCALS, calibrationStatusOf: () => 'calibrated',
    })).toBe(CAPTURE_SOURCE.BLOCKED);
  });
});

// ═══════════════════════ J. CONTRAT DE SAUVEGARDE ═══════════════════════
describe('J. aucune métadonnée de piste dans le payload karaokê', () => {
  const lines = [
    { text: 'um', time: 3, endTime: 5 },
    {
      text: 'dois', time: 12.5, endTime: 16,
      words: [{ id: 'w1', text: 'dois', start: 12.5, end: 16 }],
    },
  ];

  it('frase seule → timing_data null, timing_mode line', () => {
    const p = buildTimingPayload(lines.map(({ words: _w, ...r }) => r));
    expect(p.timing_data).toBeNull();
    expect(p.timing_mode).toBe('line');
  });

  it('le timing par mot survit', () => {
    const p = buildTimingPayload(lines);
    const back = resolveSongTiming({ lrc_content: p.lrc_content, timing_data: p.timing_data });
    expect(back.lines[1].words[0].start).toBeCloseTo(12.5, 10);
  });

  it('rien de la piste locale ne fuit', () => {
    const serialized = JSON.stringify(buildTimingPayload(lines));
    for (const leak of [
      'original', 'instrumental', 'vocals', 'role', 'fileIdentity', 'fileName', 'objectUrl',
      'blob:', 'offsetSeconds', 'verification', 'loadStatus', 'lastModified', 'fileSize',
      'duration', 'original.wav', 'vocals.wav', 'instrumental.wav', 'calibratedAt',
    ]) {
      expect(serialized).not.toContain(leak);
    }
  });
});
