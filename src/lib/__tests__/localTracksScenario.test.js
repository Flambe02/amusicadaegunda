/**
 * Scénario de bout en bout — GESTION DES TROIS FAIXAS LOCAIS.
 *
 * Rejoue les 34 étapes de la vérification sur les modules RÉELS : import de l'original,
 * d'un instrumental et d'une voz isolada (stems UVR5), comparaison de durée, copie
 * EXPLICITE de calibration puis vérification manuelle, bascule de piste en préservant la
 * position canonique, capture depuis la voz, réécoute avec l'instrumental, remplacement,
 * retrait, retour à YouTube, sauvegarde et rechargement.
 *
 * Aucune donnée de production, aucun réseau, aucun octet audio.
 */
import { describe, it, expect } from 'vitest';
import {
  TRACK_ROLE, emptyTrack, compareTrackDuration, validateAudioFile,
  canUseForSync, canReviewWithTrack, switchTrackSeek, sharedCalibrationPayload,
  captureSourceForTracks, replaceTrackFile, removeTrack, trackStatusLabel,
  syncSourceLabelForRole,
} from '@/lib/localTracks';
import { CAPTURE_SOURCE, canonicalCaptureTime, phraseReviewWindow } from '@/lib/karaokeWorkshop';
import { fileIdentity, makeCalibration, calibrationStatus, activeOffsetSeconds } from '@/lib/audioClock';
import { beginCapture, completeCapture } from '@/lib/phraseCapture';
import { buildTimingPayload } from '@/lib/karaokeSyncContract';
import { resolveSongTiming } from '@/lib/timingModel';

const SONG_ID = 33;
const A = { fileName: 'original.wav', fileSize: 30_000_000, lastModified: 1_700_000_000_000 };
const B = { fileName: 'Instrumental.wav', fileSize: 29_900_000, lastModified: 1_700_000_100_000 };
const C = { fileName: 'Vocals.wav', fileSize: 12_400_000, lastModified: 1_700_000_200_000 };
const D = { fileName: 'Instrumental.wav', fileSize: 31_500_000, lastModified: 1_800_000_000_000 };
const REF_DURATION = 184.2;

const load = (role, meta, duration, url) => replaceTrackFile(emptyTrack(role), {
  validation: validateAudioFile({ size: meta.fileSize, type: 'audio/wav', duration }),
  next: { ...meta, songId: SONG_ID, duration, objectUrl: url, mimeType: 'audio/wav' },
});

describe('scénario : faixas locais (original / instrumental / voz)', () => {
  it('parcourt les 34 étapes sans perdre ni décaler un timing', () => {
    // ── 1-2. Six lignes, frases + mots existants, tout en CANONIQUE ─────────────
    let lines = [
      { text: 'linha um', time: 3, endTime: 5 },
      {
        text: 'dois coração', time: 12.5, endTime: 16,
        words: [{ id: 'w1', text: 'dois', start: 12.5, end: 14 }, { id: 'w2', text: 'coração', start: 14, end: 16 }],
      },
      { text: 'três', time: 20, endTime: 22 },
      { text: 'quatro', time: 26, endTime: 28 },
      { text: 'cinco', time: 32, endTime: 34 },
      { text: 'seis', time: null, endTime: null },
    ];
    const ORIGINAL_TIMING = JSON.parse(JSON.stringify(lines));

    // ── 3-4. Original A + sa calibration +1,750 s restaurée ─────────────────────
    const rA = load(TRACK_ROLE.ORIGINAL, A, REF_DURATION, 'blob:A');
    expect(rA.error).toBe(null);
    let tracks = {
      original: rA.track,
      instrumental: emptyTrack(TRACK_ROLE.INSTRUMENTAL),
      vocals: emptyTrack(TRACK_ROLE.VOCALS),
    };
    const idA = fileIdentity({ songId: SONG_ID, ...A });
    const calA = makeCalibration({ songId: SONG_ID, ...A, offsetSeconds: 1.75, method: 'manual-anchor' });
    expect(calibrationStatus(calA, idA)).toBe('calibrated');
    const offOriginal = activeOffsetSeconds(calA, idA);
    expect(offOriginal).toBeCloseTo(1.75, 10);

    // ── 5-6. Instrumental B, durée compatible ───────────────────────────────────
    const rB = load(TRACK_ROLE.INSTRUMENTAL, B, 184.28, 'blob:B');
    tracks = { ...tracks, instrumental: rB.track };
    const cmpB = compareTrackDuration(tracks.instrumental.duration, REF_DURATION);
    expect(cmpB.level).toBe('ok');
    expect(cmpB.label).toBe('Duração compatível');

    // ── 7-8. Copie EXPLICITE de la calibration → « Alinhamento a verificar » ────
    expect(sharedCalibrationPayload({
      originalCalibration: calA, track: tracks.instrumental, durationLevel: cmpB.level, confirmed: false,
    })).toBe(null); // sans confirmation : refusé
    const payloadB = sharedCalibrationPayload({
      originalCalibration: calA, track: tracks.instrumental, durationLevel: cmpB.level, confirmed: true,
    });
    expect(payloadB.offsetSeconds).toBeCloseTo(1.75, 10);
    expect(payloadB.verification).toBe('pending');
    let calB = makeCalibration({ songId: SONG_ID, ...B, ...payloadB });
    const idB = fileIdentity({ songId: SONG_ID, ...B });
    expect(calibrationStatus(calB, idB)).toBe('calibrated');
    expect(trackStatusLabel(tracks.instrumental, 'calibrated', 'pending')).toBe('Alinhamento a verificar');

    // ── 9. Vérification manuelle confirmée ──────────────────────────────────────
    calB = { ...calB, verification: 'verified' };
    expect(trackStatusLabel(tracks.instrumental, 'calibrated', calB.verification)).toBe('Calibrado');
    // La vérification n'a touché à AUCUN timing.
    expect(lines).toEqual(ORIGINAL_TIMING);

    // ── 10-11. Voz isolada C, calibrée à +1,500 s ───────────────────────────────
    const rC = load(TRACK_ROLE.VOCALS, C, 184.1, 'blob:C');
    tracks = { ...tracks, vocals: rC.track };
    const idC = fileIdentity({ songId: SONG_ID, ...C });
    const calC = makeCalibration({ songId: SONG_ID, ...C, offsetSeconds: 1.5, method: 'manual-anchor' });
    const offVocals = activeOffsetSeconds(calC, idC);
    expect(offVocals).toBeCloseTo(1.5, 10);

    // ── 12-14. Bascule original → voz en PRÉSERVANT la position canonique ──────
    const sw = switchTrackSeek({
      fromLocalTime: 10.75, fromOffset: offOriginal, toOffset: offVocals, toDuration: tracks.vocals.duration,
    });
    expect(sw.canonicalTime).toBeCloseTo(12.5, 10);
    expect(sw.targetLocalTime).toBeCloseTo(11, 10);

    // ── 15. La voz devient la piste de SYNCHRONISATION ─────────────────────────
    const statusOf = (role) => {
      if (role === TRACK_ROLE.ORIGINAL) return calibrationStatus(calA, idA);
      if (role === TRACK_ROLE.INSTRUMENTAL) return calibrationStatus(calB, idB);
      if (role === TRACK_ROLE.VOCALS) return calibrationStatus(calC, idC);
      return 'missing';
    };
    let syncRole = TRACK_ROLE.VOCALS;
    expect(captureSourceForTracks({ tracks, syncRole, calibrationStatusOf: statusOf })).toBe(CAPTURE_SOURCE.LOCAL);
    expect(syncSourceLabelForRole(syncRole)).toBe('Fonte de sincronização: voz isolada');

    // ── 16-18. Capture d'une frase depuis la voz : local 11,000 → canonique 12,500 ─
    const captured = canonicalCaptureTime({
      source: CAPTURE_SOURCE.LOCAL, localTime: 11, offsetSeconds: offVocals, youtubeTime: 999,
    });
    expect(captured).toBeCloseTo(12.5, 10);
    const begun = beginCapture(lines, 5, captured);          // ligne 6, encore vierge
    const done = completeCapture(begun.lines, begun.owner, captured + 2.5);
    lines = done.lines;
    expect(lines[5]).toMatchObject({ time: 12.5, endTime: 15 });
    expect(done.selectedIndex).toBe(5);                       // dernière ligne → borné
    expect(done.completed).toBe(true);
    const dup = completeCapture(lines, null, 99);             // 18. une seule progression
    expect(dup.completed).toBe(false);

    // ── 19-20. Réécoute de la frase avec l'INSTRUMENTAL ────────────────────────
    const offInstr = activeOffsetSeconds(calB, idB);
    const winInstr = phraseReviewWindow(lines[1], offInstr, { duration: tracks.instrumental.duration });
    expect(winInstr.canonicalStart).toBe(12.5);               // bornes canoniques intactes
    expect(winInstr.canonicalEnd).toBe(16);
    expect(winInstr.localStart).toBeCloseTo(10.75, 10);
    expect(canReviewWithTrack(tracks.instrumental, statusOf(TRACK_ROLE.INSTRUMENTAL))).toBe(true);

    // ── 21-24. Remplacement de l'instrumental B par D ──────────────────────────
    const rD = replaceTrackFile(tracks.instrumental, {
      validation: validateAudioFile({ size: D.fileSize, type: 'audio/wav', duration: 190.4 }),
      next: { ...D, songId: SONG_ID, duration: 190.4, objectUrl: 'blob:D', mimeType: 'audio/wav' },
    });
    expect(rD.revokeUrl).toBe('blob:B');                      // 22. ancienne URL révoquée
    tracks = { ...tracks, instrumental: rD.track };
    const idD = fileIdentity({ songId: SONG_ID, ...D });
    expect(calibrationStatus(calB, idD)).toBe('stale-file');  // 23. non calibré
    expect(canReviewWithTrack(tracks.instrumental, 'stale-file')).toBe(false); // 24. réécoute bloquée
    expect(phraseReviewWindow(lines[1], null, { duration: 190.4 })).toBe(null);

    // ── 25. Tout le timing canonique survit ────────────────────────────────────
    expect(lines.slice(0, 5)).toEqual(ORIGINAL_TIMING.slice(0, 5));
    expect(lines[1].words[0].start).toBeCloseTo(12.5, 10);

    // ── 26-27. Retrait de la voz → capture BLOQUÉE (pas de repli YouTube) ──────
    const rmC = removeTrack(tracks.vocals);
    expect(rmC.revokeUrl).toBe('blob:C');
    tracks = { ...tracks, vocals: rmC.track };
    expect(captureSourceForTracks({ tracks, syncRole, calibrationStatusOf: statusOf }))
      .toBe(CAPTURE_SOURCE.BLOCKED);
    expect(syncSourceLabelForRole('blocked')).toBe('Fonte de sincronização: bloqueada');

    // ── 28-29. Retrait de TOUTES les pistes → YouTube historique redevient dispo ─
    tracks = {
      original: removeTrack(tracks.original).track,
      instrumental: removeTrack(tracks.instrumental).track,
      vocals: tracks.vocals,
    };
    syncRole = null;
    expect(captureSourceForTracks({ tracks, syncRole, calibrationStatusOf: statusOf }))
      .toBe(CAPTURE_SOURCE.YOUTUBE);
    expect(syncSourceLabelForRole(null)).toBe('Fonte de sincronização: YouTube');
    expect(canonicalCaptureTime({ source: CAPTURE_SOURCE.YOUTUBE, youtubeTime: 42.5 })).toBeCloseTo(42.5, 10);

    // ── 30-33. Sauvegarde, sérialisation, rechargement ─────────────────────────
    const payload = buildTimingPayload(lines);
    const reloaded = resolveSongTiming({ lrc_content: payload.lrc_content, timing_data: payload.timing_data });
    expect(reloaded.lines.map((l) => ({ t: l.time, e: l.endTime }))).toEqual([
      { t: 3, e: 5 }, { t: 12.5, e: 16 }, { t: 12.5, e: 15 },
      { t: 20, e: 22 }, { t: 26, e: 28 }, { t: 32, e: 34 },
    ]);
    // 33. le timing par mot survit
    const withWords = reloaded.lines.filter((l) => Array.isArray(l.words) && l.words.length > 0);
    expect(withWords).toHaveLength(1);
    expect(withWords[0].words[0].start).toBeCloseTo(12.5, 10);

    // ── 34. Aucune métadonnée de piste ni de calibration dans le payload ───────
    const serialized = JSON.stringify(payload);
    for (const leak of [
      'blob:', 'objectUrl', 'fileIdentity', 'fileName', 'offsetSeconds', 'verification',
      'loadStatus', 'lastModified', 'fileSize', 'calibratedAt', 'copied-from-original',
      'manual-anchor', 'original.wav', 'Instrumental.wav', 'Vocals.wav', 'audio/wav',
    ]) {
      expect(serialized).not.toContain(leak);
    }
  });

  it('un import invalide préserve la piste valide précédente et tout le timing', () => {
    const lines = [{ text: 'a', time: 12.5, endTime: 16 }];
    const before = JSON.parse(JSON.stringify(lines));
    const good = load(TRACK_ROLE.VOCALS, C, 184.1, 'blob:C').track;
    const bad = replaceTrackFile(good, {
      validation: validateAudioFile({ size: 0, type: 'audio/wav', duration: 0 }),
      next: { ...D, songId: SONG_ID, duration: 0, objectUrl: 'blob:bad' },
    });
    expect(bad.track).toBe(good);            // même référence : rien remplacé
    expect(bad.revokeUrl).toBe(null);        // rien à révoquer
    expect(bad.error).toBe('O arquivo selecionado não contém áudio válido.');
    expect(lines).toEqual(before);
  });

  it('la calibration d’un rôle ne peut pas servir à un autre rôle', () => {
    const calA = makeCalibration({ songId: SONG_ID, ...A, offsetSeconds: 1.75 });
    const idC = fileIdentity({ songId: SONG_ID, ...C });
    expect(calibrationStatus(calA, idC)).toBe('stale-file');
    expect(canUseForSync(load(TRACK_ROLE.VOCALS, C, 184.1, 'blob:C').track, 'stale-file')).toBe(false);
  });
});
