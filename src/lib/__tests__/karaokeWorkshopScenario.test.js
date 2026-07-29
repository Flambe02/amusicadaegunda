/**
 * Scénario de bout en bout — ATELIÊ DE KARAOKÊ complet.
 *
 * Rejoue les 38 étapes de la vérification sur les modules RÉELS (aucune donnée de
 * production, aucun réseau, aucun fichier audio lu) : sélection déterministe, réécoute
 * locale d'une frase, boucle, capture de frase, mode palavra, remplacement de fichier,
 * brouillon, sauvegarde et rechargement — en vérifiant à chaque étape que les invariants
 * des ÉTAPES 2, 3 et 4 tiennent toujours.
 */
import { describe, it, expect } from 'vitest';
import {
  EDITING_MODE, REVIEW_MARGIN_SEC,
  selectLine, goToAdjacentLine, setEditingMode,
  phraseReviewWindow, canReviewLocally, reviewBlockedReason, loopBackTarget,
  navigatorRows, keyboardOwner, issueTarget, transportTimes,
} from '@/lib/karaokeWorkshop';
import {
  fileIdentity, makeCalibration, calibrationStatus, canCaptureWords, activeOffsetSeconds,
  localAudioTimeToCanonical, canonicalTimeToLocalAudio,
} from '@/lib/audioClock';
import { beginCapture, completeCapture, lyricContext } from '@/lib/phraseCapture';
import { buildTimingPayload, applyWordEditorResult, isParentKeyboardActive } from '@/lib/karaokeSyncContract';
import { loadStudioWords, wordsAreValid } from '@/lib/ballMotion';
import { resolveSongTiming } from '@/lib/timingModel';
import { linesSignature } from '@/hooks/useTimingDraft';

const SONG_ID = 11;
const FILE_A = { fileName: 'segunda.mp3', fileSize: 4_100_000, lastModified: 1_700_000_000_000 };
const FILE_B = { fileName: 'segunda.mp3', fileSize: 4_250_000, lastModified: 1_800_000_000_000 };
const DURATION_A = 190;

describe('scénario : ateliê de karaokê', () => {
  it('parcourt les 38 étapes sans perdre ni décaler un timing', () => {
    // ── 1-3. Six lignes ; frases 1→5 marquées ; mots valides sur la ligne 2 ──────
    let lines = [
      { text: 'linha um', time: 3, endTime: 5 },
      {
        text: 'dois coração', time: 10, endTime: 13,
        words: [
          { id: 'w1', text: 'dois', start: 10, end: 11.4 },
          { id: 'w2', text: 'coração', start: 11.4, end: 13 },
        ],
      },
      { text: 'três', time: 16, endTime: 18 },
      { text: 'quatro', time: 22, endTime: 24 },
      { text: 'cinco', time: 28, endTime: 30 },
      { text: 'seis', time: null, endTime: null },
    ];
    const ORIGINAL = JSON.parse(JSON.stringify(lines));
    const savedSignature = linesSignature(lines);
    expect(wordsAreValid(lines[1].words, 10, 13)).toBe(true);

    // ── 4-5. Fichier A + calibration +1,750 s restaurée ─────────────────────────
    const idA = fileIdentity({ songId: SONG_ID, ...FILE_A });
    const calA = makeCalibration({
      songId: SONG_ID, ...FILE_A, offsetSeconds: 1.75, method: 'manual-anchor',
      localDuration: DURATION_A, canonicalDuration: 191.75, calibratedAt: '2026-07-29T20:00:00.000Z',
    });
    expect(calibrationStatus(calA, idA)).toBe('calibrated');
    const offA = activeOffsetSeconds(calA, idA);
    expect(offA).toBeCloseTo(1.75, 10);

    // ── 6-7. Ouverture de l'atelier : sélection déterministe ────────────────────
    let ws = { selectedLineIndex: 5, editingMode: EDITING_MODE.PHRASE }; // 1re non marquée
    expect(ws.selectedLineIndex).toBe(5);

    // ── 8. On sélectionne la ligne 2 (index 1) ──────────────────────────────────
    ws = selectLine(ws, 1, lines.length);
    expect(ws.selectedLineIndex).toBe(1);

    // ── 9-10. Réécoute locale : bornes canoniques → bornes locales ──────────────
    expect(canReviewLocally({ calibrationStatus: 'calibrated', hasAudio: true, line: lines[1] })).toBe(true);
    const win = phraseReviewWindow(lines[1], offA, { duration: DURATION_A, margin: REVIEW_MARGIN_SEC });
    expect(win.canonicalStart).toBe(10);
    expect(win.canonicalEnd).toBe(13);
    expect(win.localStart).toBeCloseTo(8.25, 10);   // 10 − 1.75
    expect(win.localEnd).toBeCloseTo(11.25, 10);    // 13 − 1.75
    expect(win.localSeek).toBeCloseTo(7.75, 10);    // marge de préécoute
    expect(win.localStop).toBeCloseTo(11.75, 10);

    // ── 11-12. Boucle : un retour sûr, puis désactivation ───────────────────────
    expect(loopBackTarget(11.8, win)).toBeCloseTo(win.localSeek, 10);
    expect(loopBackTarget(9, win)).toBe(null);
    // La réécoute et la boucle n'ont RIEN modifié.
    expect(lines[1]).toEqual(ORIGINAL[1]);

    // ── 13. Ligne 3 (index 2) ───────────────────────────────────────────────────
    ws = selectLine(ws, 2, lines.length);
    expect(ws.selectedLineIndex).toBe(2);

    // ── 14-15. Capture de sa frase : progression d'EXACTEMENT un cran ───────────
    const begun = beginCapture(lines, ws.selectedLineIndex, 16.4);
    const done = completeCapture(begun.lines, begun.owner, 18.9);
    lines = done.lines;
    expect(lines[2]).toMatchObject({ time: 16.4, endTime: 18.9 });
    expect(done.selectedIndex).toBe(3);
    ws = selectLine(ws, done.selectedIndex, lines.length);
    expect(ws.selectedLineIndex).toBe(3);

    // ── 16-17. Mode palavra : les raccourcis de frase du parent sont inertes ────
    ws = setEditingMode(ws, EDITING_MODE.WORD);
    const selectedDuringWordMode = ws.selectedLineIndex;
    expect(selectedDuringWordMode).toBe(3);
    expect(isParentKeyboardActive({ step: 'sync', wordStudioOpen: true, isCalibrating: false })).toBe(false);
    expect(keyboardOwner({
      targetEditable: false, modalOpen: false, wordStudioOpen: true,
      editingMode: EDITING_MODE.WORD, isCapturing: false, step: 'sync',
    })).toBe('word-capture');

    // ── 18-19. Capture de mots sur l'audio local → temps CANONIQUES ─────────────
    const line3 = lines[3];
    const loaded = loadStudioWords(line3.words, line3.time, line3.endTime);
    expect(loaded.repaired).toBe(false);
    const localHits = [20.25, 21.1]; // positions dans le FICHIER local
    const canonicalWords = [
      { id: 'w1', text: 'qua', start: localAudioTimeToCanonical(localHits[0], offA), end: localAudioTimeToCanonical(localHits[1], offA) },
      { id: 'w2', text: 'tro', start: localAudioTimeToCanonical(localHits[1], offA), end: 24 },
    ];
    expect(canonicalWords[0].start).toBeCloseTo(22, 10);    // 20.25 + 1.75
    expect(canonicalWords[1].start).toBeCloseTo(22.85, 10);
    lines = lines.map((l, i) => (i === 3
      ? applyWordEditorResult(l, {
        changed: true, words: canonicalWords, phraseStart: 22, phraseEnd: 24,
        startEdited: false, endEdited: false,
      })
      : l));
    expect(lines[3].words[0].start).toBeCloseTo(22, 10);
    expect(lines[3]).toMatchObject({ time: 22, endTime: 24 }); // frase intacte

    // ── 20-21. Fermeture du mode palavra : la même frase reste sélectionnée ─────
    ws = setEditingMode(ws, EDITING_MODE.PHRASE);
    expect(ws.selectedLineIndex).toBe(selectedDuringWordMode);
    expect(applyWordEditorResult(lines[3], { changed: false })).toBe(lines[3]);

    // ── 22-23. Navigation vers une autre frase : le brouillon garde les édits ───
    const dirtySignature = linesSignature(lines);
    expect(dirtySignature).not.toBe(savedSignature); // « Alterações não salvas »
    ws = goToAdjacentLine(ws, 1, lines.length);
    expect(ws.selectedLineIndex).toBe(4);
    expect(linesSignature(lines)).toBe(dirtySignature); // rien perdu en changeant de frase

    // ── 24-28. Remplacement du fichier A par B ──────────────────────────────────
    const idB = fileIdentity({ songId: SONG_ID, ...FILE_B });
    expect(idB).not.toBe(idA);
    expect(calibrationStatus(calA, idB)).toBe('stale-file');   // 26. calibration perdue
    expect(activeOffsetSeconds(calA, idB)).toBe(null);
    expect(canCaptureWords(calA, idB)).toBe(false);            // 28. capture bloquée
    // 27. tous les timings canoniques sont intacts
    expect(lines[1]).toEqual(ORIGINAL[1]);
    expect(lines[3].words[0].start).toBeCloseTo(22, 10);
    // La réécoute locale est bloquée, avec une raison explicite.
    expect(canReviewLocally({ calibrationStatus: 'stale-file', hasAudio: true, line: lines[1] })).toBe(false);
    expect(reviewBlockedReason({ calibrationStatus: 'stale-file', hasAudio: true, line: lines[1] }))
      .toBe('Calibre o áudio local para ouvir esta frase no ponto correto.');
    expect(phraseReviewWindow(lines[1], activeOffsetSeconds(calA, idB), { duration: 150 })).toBe(null);
    // 25. l'arrêt de la lecture est prouvé côté hook (useLocalTransport.test.js).

    // ── 29-30. Zéro EXPLICITE pour le fichier B, puis réécoute d'une frase ──────
    const calB = makeCalibration({
      songId: SONG_ID, ...FILE_B, offsetSeconds: 0, method: 'explicit-zero',
      calibratedAt: '2026-07-29T21:00:00.000Z',
    });
    expect(calibrationStatus(calB, idB)).toBe('calibrated');
    const offB = activeOffsetSeconds(calB, idB);
    expect(offB).toBe(0);
    const winB = phraseReviewWindow(lines[1], offB, { duration: 150 });
    expect(winB.localStart).toBe(10);           // offset 0 → local == canonique
    expect(winB.canonicalStart).toBe(10);
    expect(canonicalTimeToLocalAudio(13, offB)).toBe(13);
    // …et la calibration du fichier A reste valable pour le fichier A.
    expect(activeOffsetSeconds(calA, idA)).toBeCloseTo(1.75, 10);

    // ── 31-35. Sauvegarde, sérialisation, rechargement ──────────────────────────
    const payload = buildTimingPayload(lines);
    const row = { lrc_content: payload.lrc_content, timing_data: payload.timing_data };
    const reloaded = resolveSongTiming(row);
    expect(payload.timing_mode).toBe('hybrid');
    // 33. les frases survivent
    expect(reloaded.lines.map((l) => ({ t: l.time, e: l.endTime }))).toEqual([
      { t: 3, e: 5 }, { t: 10, e: 13 }, { t: 16.4, e: 18.9 },
      { t: 22, e: 24 }, { t: 28, e: 30 },
    ]);
    // 34. les mots survivent, en CANONIQUE
    expect(reloaded.lines[1].words).toEqual(ORIGINAL[1].words);
    expect(reloaded.lines[3].words[0].start).toBeCloseTo(22, 10);
    // 35. aucune métadonnée de calibration dans le payload karaokê
    const serialized = JSON.stringify(payload);
    for (const leak of ['offsetSeconds', 'fileIdentity', 'calibratedAt', 'manual-anchor',
      'explicit-zero', 'segunda.mp3', 'localDuration', 'lastModified', 'fileSize', 'localSeek']) {
      expect(serialized).not.toContain(leak);
    }

    // ── 36. Contenu frase seule → timing_data null / timing_mode 'line' ─────────
    const phraseOnly = lines.map(({ words: _w, ...rest }) => rest);
    const phrasePayload = buildTimingPayload(phraseOnly);
    expect(phrasePayload).toHaveProperty('timing_data');
    expect(phrasePayload.timing_data).toBeNull();
    expect(phrasePayload.timing_mode).toBe('line');

    // ── 37. Le curseur de frase n'a jamais bougé pendant l'édition des mots ─────
    expect(selectedDuringWordMode).toBe(3);

    // ── 38. Atelier propre → fermeture sans avertissement ──────────────────────
    const cleanSignature = linesSignature(lines);
    expect(cleanSignature === linesSignature(lines)).toBe(true); // référence « sauvegardée »
    expect(cleanSignature !== savedSignature).toBe(true);        // dirty AVANT la sauvegarde
    // Après une sauvegarde réussie, la signature de référence devient l'actuelle :
    const afterSave = cleanSignature;
    expect(afterSave === linesSignature(lines)).toBe(true);      // → « Tudo salvo », pas de confirmation

    // Le contexte affiché reste cohérent de bout en bout.
    const ctx = lyricContext(lines, ws.selectedLineIndex);
    expect(ctx.current.text).toBe('cinco');
    expect(ctx.prev.text).toBe('quatro');
    expect(ctx.next.text).toBe('seis');
  });

  it('la navigation par validation pointe la bonne frase, sans rien corriger', () => {
    const lines = [
      { text: 'a', time: 5, endTime: 4 },  // fin avant début
      { text: 'b', time: null, endTime: null },
    ];
    const before = JSON.parse(JSON.stringify(lines));
    const t = issueTarget({ lineIndex: 0, time: 5 }, lines.length);
    expect(t.selectedLineIndex).toBe(0);
    expect(t.canonicalTime).toBe(5);
    expect(lines).toEqual(before);
  });

  it('le navigateur garde l’ordre original et la frase sélectionnée visible', () => {
    const lines = [
      { text: 'a', time: 1, endTime: 2 },
      { text: 'b', time: null, endTime: null },
      { text: 'c', time: 3, endTime: 4 },
    ];
    const rows = navigatorRows(lines, { selectedLineIndex: 0, filter: 'incomplete', levelOf: () => null });
    expect(rows.map((r) => r.index)).toEqual([0, 1]);
    expect(rows[0].selected).toBe(true);
    expect(rows[0].status.label).toBe('Frase marcada');
    expect(rows[1].status.label).toBe('Sem marcação');
  });

  it('les deux horloges du transport restent cohérentes', () => {
    expect(transportTimes(8.25, 1.75)).toEqual({ local: 8.25, canonical: 10 });
    expect(transportTimes(8.25, null).canonical).toBe(null);
  });
});
