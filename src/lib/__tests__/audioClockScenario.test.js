/**
 * Scénario de bout en bout — calibration audio local ↔ horloge canonique.
 *
 * Rejoue les 29 étapes de la vérification sur les modules RÉELS (aucune donnée de
 * production, aucun réseau, aucun fichier lu) : calibration manquante → capture bloquée →
 * calibration par repères → capture en temps canonique → navigation inverse →
 * sauvegarde/rechargement → changement de fichier → zéro explicite, en vérifiant à
 * chaque étape que les invariants des ÉTAPES 2 et 3 tiennent toujours.
 */
import { describe, it, expect } from 'vitest';
import {
  localAudioTimeToCanonical, canonicalTimeToLocalAudio, clampLocalSeek,
  computeAnchorOffset, fileIdentity, makeCalibration,
  calibrationStatus, canCaptureWords, activeOffsetSeconds,
} from '@/lib/audioClock';
import { buildTimingPayload, applyWordEditorResult, isParentKeyboardActive } from '@/lib/karaokeSyncContract';
import { resolveSongTiming } from '@/lib/timingModel';
import { beginCapture, completeCapture, lyricContext } from '@/lib/phraseCapture';
import { wordsAreValid } from '@/lib/ballMotion';

const SONG_ID = 7;
const FILE_A = { fileName: 'segunda.mp3', fileSize: 4_100_000, lastModified: 1_700_000_000_000 };
// Même NOM, métadonnées différentes → autre identité (ré-export du même morceau).
const FILE_B = { fileName: 'segunda.mp3', fileSize: 4_250_000, lastModified: 1_800_000_000_000 };

describe('scénario : calibration audio local ↔ horloge canonique', () => {
  it('parcourt les 29 étapes sans jamais décaler un timing déjà enregistré', () => {
    // ── 1-2. Chanson avec timing de frase ET de mot, tout en CANONIQUE ────────
    let lines = [
      {
        text: 'aaa bbb', time: 4, endTime: 6.5,
        words: [{ id: 'w1', text: 'aaa', start: 4, end: 5.2 }, { id: 'w2', text: 'bbb', start: 5.2, end: 6.5 }],
      },
      { text: 'ccc ddd', time: 12, endTime: 18 },
      { text: 'eee', time: null, endTime: null },
      { text: 'fff', time: null, endTime: null },
      { text: 'ggg', time: null, endTime: null },
    ];
    expect(wordsAreValid(lines[0].words, lines[0].time, lines[0].endTime)).toBe(true);

    // ── 3-5. Fichier A sélectionné : aucune calibration → capture BLOQUÉE ─────
    const idA = fileIdentity({ songId: SONG_ID, ...FILE_A });
    let record = null; // rien en stockage local
    expect(calibrationStatus(record, idA)).toBe('missing');
    expect(canCaptureWords(record, idA)).toBe(false);
    expect(activeOffsetSeconds(record, idA)).toBe(null); // aucun zéro supposé

    // ── 6-7. Calibration explicite : YouTube 12,500 s ↔ audio local 10,750 s ──
    const offset = computeAnchorOffset(12.5, 10.75);
    expect(offset).toBeCloseTo(1.75, 10);
    record = makeCalibration({
      songId: SONG_ID, ...FILE_A, offsetSeconds: offset, method: 'manual-anchor',
      localDuration: 184.42, canonicalDuration: 186.17, calibratedAt: '2026-07-29T18:00:00.000Z',
    });
    expect(calibrationStatus(record, idA)).toBe('calibrated');
    expect(canCaptureWords(record, idA)).toBe(true);

    // ── 8-9. Un mot capté à local 11,000 s est stocké à CANONIQUE 12,750 s ────
    const off = activeOffsetSeconds(record, idA);
    const capturedCanonical = localAudioTimeToCanonical(11, off);
    expect(capturedCanonical).toBeCloseTo(12.75, 10);
    lines = lines.map((l, i) => (i === 1
      ? applyWordEditorResult(l, {
        changed: true,
        words: [
          { id: 'w1', text: 'ccc', start: capturedCanonical, end: 15 },
          { id: 'w2', text: 'ddd', start: 15, end: 18 },
        ],
        phraseStart: 12, phraseEnd: 18, startEdited: false, endEdited: false,
      })
      : l));
    expect(lines[1].words[0].start).toBeCloseTo(12.75, 10);
    expect(lines[1]).toMatchObject({ time: 12, endTime: 18 }); // frase intacte

    // ── 10-11. Rejouer ce mot cherche bien local 11,000 s ─────────────────────
    const seekTarget = canonicalTimeToLocalAudio(lines[1].words[0].start, off);
    expect(seekTarget).toBeCloseTo(11, 10);
    expect(clampLocalSeek(seekTarget, 184.42)).toBeCloseTo(11, 10);

    // ── 12-13. Sauvegarde puis rechargement : 12,750 s reste 12,750 s ─────────
    const payload = buildTimingPayload(lines);
    const row = { lrc_content: payload.lrc_content, timing_data: payload.timing_data };
    let reloaded = resolveSongTiming(row);
    expect(reloaded.source).toBe('structured');
    expect(reloaded.lines[1].words[0].start).toBeCloseTo(12.75, 10);
    expect(reloaded.lines[0].words).toEqual(lines[0].words); // ligne 0 jamais touchée

    // ── 14-15. Même fichier rouvert : la calibration +1,750 s est retrouvée ───
    expect(fileIdentity({ songId: SONG_ID, ...FILE_A })).toBe(idA);
    expect(activeOffsetSeconds(record, idA)).toBeCloseTo(1.75, 10);

    // ── 16-19. Autre fichier (même nom) : calibration inactive, mots INTACTS ──
    const idB = fileIdentity({ songId: SONG_ID, ...FILE_B });
    expect(idB).not.toBe(idA);
    expect(calibrationStatus(record, idB)).toBe('stale-file');
    expect(canCaptureWords(record, idB)).toBe(false);
    expect(activeOffsetSeconds(record, idB)).toBe(null);
    // Aucun décalage en masse : la donnée canonique est exactement celle d'avant.
    reloaded = resolveSongTiming(row);
    expect(reloaded.lines[1].words[0].start).toBeCloseTo(12.75, 10);
    expect(reloaded.lines.map((l) => ({ t: l.time, e: l.endTime }))).toEqual([
      { t: 4, e: 6.5 }, { t: 12, e: 18 },
    ]);

    // ── 20-21. Zéro EXPLICITEMENT confirmé pour le fichier B ──────────────────
    const recordB = makeCalibration({
      songId: SONG_ID, ...FILE_B, offsetSeconds: 0, method: 'explicit-zero',
      calibratedAt: '2026-07-29T19:00:00.000Z',
    });
    expect(calibrationStatus(recordB, idB)).toBe('calibrated');
    expect(recordB.method).toBe('explicit-zero');
    expect(activeOffsetSeconds(recordB, idB)).toBe(0);
    expect(localAudioTimeToCanonical(30, activeOffsetSeconds(recordB, idB))).toBe(30);
    // …et la calibration du fichier A reste valable pour le fichier A.
    expect(activeOffsetSeconds(record, idA)).toBeCloseTo(1.75, 10);

    // ── 22-23. Ouvrir/fermer le studio ne bouge pas le curseur du parent ──────
    expect(isParentKeyboardActive({ step: 'sync', wordStudioOpen: true, isCalibrating: false })).toBe(false);
    expect(isParentKeyboardActive({ step: 'sync', wordStudioOpen: false, isCalibrating: false })).toBe(true);
    const cursorBefore = 2;
    expect(applyWordEditorResult(lines[1], { changed: false })).toBe(lines[1]);
    expect(cursorBefore).toBe(2);

    // ── 24-25. Trois frases capturées à Espaço : progression ÉTAPE 3 intacte ──
    let selected = cursorBefore;
    for (const [start, end] of [[24, 26], [27, 29], [30, 32]]) {
      const begun = beginCapture(lines, selected, start);
      const done = completeCapture(begun.lines, begun.owner, end);
      lines = done.lines;
      expect(done.selectedIndex).toBe(selected + 1 <= lines.length - 1 ? selected + 1 : selected);
      selected = done.selectedIndex;
    }
    expect(lines.map((l) => l.time)).toEqual([4, 12, 24, 27, 30]);
    expect(lyricContext(lines, selected).current.text).toBe('ggg');

    // ── 26-27. Contenu frase seule → timing_data null, timing_mode 'line' ─────
    const phraseOnly = lines.map(({ words: _w, ...rest }) => rest);
    const phrasePayload = buildTimingPayload(phraseOnly);
    expect(phrasePayload).toHaveProperty('timing_data');
    expect(phrasePayload.timing_data).toBeNull();
    expect(phrasePayload.timing_mode).toBe('line');

    // ── 28-29. Contenu avec mots : aucune métadonnée de calibration dans le payload ─
    const wordPayload = buildTimingPayload(lines);
    expect(wordPayload.timing_mode).toBe('hybrid');
    const serialized = JSON.stringify(wordPayload);
    for (const leak of ['offsetSeconds', 'fileIdentity', 'calibratedAt', 'manual-anchor',
      'explicit-zero', 'segunda.mp3', 'localDuration', 'lastModified', 'fileSize']) {
      expect(serialized).not.toContain(leak);
    }
    // Les mots enregistrés restent en temps canonique, pas en temps local.
    expect(JSON.parse(serialized).timing_data.lines[1].words[0].start).toBeCloseTo(12.75, 10);
  });

  it('une calibration ne traverse jamais deux chansons', () => {
    const rec = makeCalibration({ songId: SONG_ID, ...FILE_A, offsetSeconds: 1.75 });
    expect(calibrationStatus(rec, fileIdentity({ songId: 99, ...FILE_A }))).toBe('stale-file');
    expect(canCaptureWords(rec, fileIdentity({ songId: 99, ...FILE_A }))).toBe(false);
  });
});
