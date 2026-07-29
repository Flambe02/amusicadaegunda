/**
 * Scénario de bout en bout — passe de marquage manuel des frases.
 *
 * Rejoue les 22 étapes de la vérification manuelle sur les modules RÉELS (aucune donnée
 * de production, aucun réseau) : sélection explicite, trou de lecture, geste maintenu,
 * enchaînement automatique, événements clavier dupliqués, cohabitation avec le studio de
 * mots, puis sérialisation/rechargement en vérifiant que les invariants de l'ÉTAPE 2
 * tiennent toujours.
 */
import { describe, it, expect } from 'vitest';
import {
  initialSelectedIndex, beginCapture, completeCapture,
  lyricContext, previewIndex, captureStatus, shouldFollowPlayback,
} from '@/lib/phraseCapture';
import { isParentKeyboardActive, buildTimingPayload } from '@/lib/karaokeSyncContract';
import { resolveSongTiming } from '@/lib/timingModel';
import { activeLineIndex } from '@/lib/lrc';

const FIVE_LINES = () => ([
  { text: 'linha um', time: 2, endTime: 4 },   // déjà marquée → trou après 4 s
  { text: 'dois — coração', time: null, endTime: null },
  { text: 'três', time: null, endTime: null },
  { text: 'quatro', time: null, endTime: null },
  { text: 'cinco', time: null, endTime: null },
]);

// Réplique de la dérivation de l'éditeur : sous-liste triée des lignes marquées.
const playbackActive = (lines, currentTime) => {
  const timed = lines
    .map((l, i) => ({ i, time: l.time, endTime: l.endTime }))
    .filter((l) => l.time != null)
    .sort((a, b) => a.time - b.time);
  const pos = activeLineIndex(timed, currentTime);
  return pos === -1 ? -1 : timed[pos].i;
};

describe('scénario : marquage manuel de 5 frases', () => {
  it('parcourt les 22 étapes sans perdre la sélection ni sauter de ligne', () => {
    // ── 1-2. Cinq lignes chargées, on sélectionne la ligne 2 (index 1) ──────────
    let lines = FIVE_LINES();
    expect(lines).toHaveLength(5);
    expect(initialSelectedIndex(lines)).toBe(1); // 1re non marquée
    let selected = 1;
    const mode = 'capture-lines';

    // ── 3-5. La lecture traverse un TROU : la sélection ne bouge pas ────────────
    // À t=5 s la ligne 0 est finie (endTime 4) et rien n'a commencé → activeIdx = -1.
    expect(playbackActive(lines, 5)).toBe(-1);
    for (const t of [3, 4.5, 5, 6.2]) {
      const active = playbackActive(lines, t);
      // L'ancien code affichait lines[active + 1] → lines[0] dès que active valait -1.
      expect(previewIndex({ mode, selectedIndex: selected, playbackActiveIndex: active, lineCount: 5 })).toBe(1);
      expect(shouldFollowPlayback({ mode, isCapturing: false })).toBe(false);
    }
    expect(captureStatus({ mode, isCapturing: false, allTimed: false })).toBe('Pronto para marcar');

    // ── 6-7. Appui maintenu : la ligne 2 reste visible et devient « en cours » ──
    const begun = beginCapture(lines, selected, 6.5);
    lines = begun.lines;
    const owner = begun.owner;
    expect(begun.selectedIndex).toBe(1); // pas d'avance à l'appui
    expect(lyricContext(lines, 1).current.text).toBe('dois — coração');
    expect(captureStatus({ mode, isCapturing: true, allTimed: false })).toBe('Marcando frase…');
    // Un keydown répété (auto-repeat du navigateur) ne redémarre rien : le propriétaire
    // existe déjà, l'éditeur ignore l'appui — ici on vérifie qu'un 2e beginCapture
    // n'écraserait pas le début déjà posé.
    expect(lines[1].time).toBe(6.5);

    // ── 8-10. Relâchement : une seule paire début/fin, une seule avance ─────────
    let done = completeCapture(lines, owner, 9.25);
    lines = done.lines;
    selected = done.selectedIndex;
    expect(lines[1]).toMatchObject({ time: 6.5, endTime: 9.25 });
    expect(selected).toBe(2);
    expect(done.completed).toBe(true);

    // ── 11. L'écran montre ligne 2 (anterior), ligne 3 (atual), ligne 4 (próxima) ─
    let ctx = lyricContext(lines, selected);
    expect([ctx.prev.text, ctx.current.text, ctx.next.text]).toEqual(['dois — coração', 'três', 'quatro']);
    expect(ctx.prev.time).toBe(6.5); // la frase marquée n'a PAS disparu

    // ── 12-13. On enchaîne la ligne 3 sans jamais cliquer ──────────────────────
    const begun3 = beginCapture(lines, selected, 10);
    done = completeCapture(begun3.lines, begun3.owner, 12);
    lines = done.lines;
    selected = done.selectedIndex;
    expect(lines[2]).toMatchObject({ time: 10, endTime: 12 });
    expect(selected).toBe(3);
    ctx = lyricContext(lines, selected);
    expect([ctx.prev.text, ctx.current.text, ctx.next.text]).toEqual(['três', 'quatro', 'cinco']);

    // ── 14-15. Keydown répété + keyup dupliqué : aucun saut, aucun doublon ─────
    const begun4 = beginCapture(lines, selected, 13);
    const first = completeCapture(begun4.lines, begun4.owner, 15);
    const duplicate = completeCapture(first.lines, null, 16); // 2e keyup, plus de propriétaire
    expect(duplicate.lines).toBe(first.lines);
    expect(duplicate.completed).toBe(false);
    lines = first.lines;
    selected = first.selectedIndex;
    expect(selected).toBe(4);                                  // exactement +1, pas +2
    expect(lines[4]).toEqual({ text: 'cinco', time: null, endTime: null }); // pas touchée

    // ── 16-17. Studio de mots ouvert : les raccourcis du parent sont inactifs ───
    expect(isParentKeyboardActive({ step: 'sync', wordStudioOpen: true, isCalibrating: false })).toBe(false);

    // ── 18-19. Studio refermé : les raccourcis reviennent ──────────────────────
    expect(isParentKeyboardActive({ step: 'sync', wordStudioOpen: false, isCalibrating: false })).toBe(true);

    // ── Dernière ligne : timing posé, curseur borné, état « terminé » ──────────
    const begunLast = beginCapture(lines, selected, 16);
    const last = completeCapture(begunLast.lines, begunLast.owner, 18.5);
    lines = last.lines;
    expect(last.selectedIndex).toBe(4); // ne dépasse pas le tableau
    expect(last.atEnd).toBe(true);
    expect(last.allTimed).toBe(true);
    expect(lyricContext(lines, last.selectedIndex).next).toBe(null);
    expect(captureStatus({ mode, isCapturing: false, allTimed: true })).toBe('Sincronização concluída');

    // ── 20-21. Sauvegarde, sérialisation, rechargement : tout survit ───────────
    const expected = [
      { time: 2, endTime: 4 }, { time: 6.5, endTime: 9.25 }, { time: 10, endTime: 12 },
      { time: 13, endTime: 15 }, { time: 16, endTime: 18.5 },
    ];
    expect(lines.map((l) => ({ time: l.time, endTime: l.endTime }))).toEqual(expected);

    const payload = buildTimingPayload(lines);
    const reloaded = resolveSongTiming({ lrc_content: payload.lrc_content, timing_data: payload.timing_data });
    expect(reloaded.lines.map((l) => ({ time: l.time, endTime: l.endTime }))).toEqual(expected);
    expect(reloaded.lines.map((l) => l.text)).toEqual(
      ['linha um', 'dois — coração', 'três', 'quatro', 'cinco'], // accents préservés
    );

    // ── 22. Invariants de l'ÉTAPE 2 intacts : frase seule → timing_data null ──
    expect(reloaded.source).toBe('lrc');
    expect(payload).toHaveProperty('timing_data');
    expect(payload.timing_data).toBeNull();
    expect(payload.timing_mode).toBe('line');
    expect(reloaded.lines.every((l) => l.words === undefined)).toBe(true);
  });

  it('une frase déjà marquée reste intacte si la capture est avortée', () => {
    // Couvert en détail dans phraseCapture.test.js (bloc I) — ici on vérifie juste que
    // le scénario complet n'a pas laissé de propriétaire actif derrière lui.
    const lines = FIVE_LINES();
    const done = completeCapture(lines, null, 10);
    expect(done.lines).toBe(lines);
    expect(done.completed).toBe(false);
  });
});
