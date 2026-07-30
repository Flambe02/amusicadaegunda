/**
 * Régression — QUICK SYNC : capture simplifiée des frases (une frase = un maintien).
 *
 * DÉCISION D'ARCHITECTURE (issue de l'audit) : le brouillon de timing (`lines` +
 * `useTimingDraft`), le transport, la calibration et la source de synchronisation vivent
 * DANS `KaraokeSyncTool`. Il n'existe aucun magasin en dehors. Quick Sync est donc un
 * MODE DE PRÉSENTATION du même composant, pas un second écran : c'est la seule façon de
 * garder UNE seule source de vérité. Ce module ne contient que des fonctions pures et une
 * machine à états — la capture réelle réutilise `beginCapture`/`completeCapture`
 * (@/lib/phraseCapture) et l'horloge canonique existante.
 */
import { describe, it, expect } from 'vitest';
import {
  QS, QS_LABELS,
  hasMeaningfulWordTiming, isLineComplete, quickSyncBlock, quickSyncEntry,
  initialQuickLine, nextIncompleteLine, quickProgress,
  quickInitial, quickReduce, canCapture, instructionFor, captureButtonLabel,
} from '@/lib/quickSync';
import { beginCapture, completeCapture } from '@/lib/phraseCapture';
import { buildTimingPayload } from '@/lib/karaokeSyncContract';
import { CAPTURE_SOURCE } from '@/lib/karaokeWorkshop';

const L = (text, time = null, endTime = null, words) => ({
  text, time, endTime, ...(words ? { words } : {}),
});
const LINES = () => ([
  L('linha um', 2, 4),
  L('linha dois', 10, 13),
  L('linha três'),
  L('linha quatro'),
]);
const WORDS = [{ id: 'w1', text: 'a', start: 10, end: 13 }];

// ═══════════════════ A. POINT D'ENTRÉE ═══════════════════
describe('A. libellé du bouton d’entrée', () => {
  it('sans letra : bloqué avec une explication', () => {
    const e = quickSyncEntry({ hasLyrics: false, lines: [] });
    expect(e.disabled).toBe(true);
    expect(e.reason).toBe('Adicione a letra antes de iniciar a sincronização.');
  });

  it('letra sans timing : « QUICK SYNC »', () => {
    const e = quickSyncEntry({ hasLyrics: true, lines: [L('a'), L('b')] });
    expect(e.label).toBe('QUICK SYNC');
    expect(e.disabled).toBe(false);
    expect(e.hint).toBe('Sincronize as frases ouvindo a música.');
  });

  it('timing partiel : « Continuar Quick Sync »', () => {
    expect(quickSyncEntry({ hasLyrics: true, lines: LINES() }).label).toBe('Continuar Quick Sync');
  });

  it('toutes les frases valides : « Revisar Quick Sync »', () => {
    const all = [L('a', 1, 2), L('b', 3, 4)];
    expect(quickSyncEntry({ hasLyrics: true, lines: all }).label).toBe('Revisar Quick Sync');
  });

  it('une ligne sans FIN compte comme incomplète', () => {
    expect(quickSyncEntry({ hasLyrics: true, lines: [L('a', 1, null)] }).label).toBe('Continuar Quick Sync');
  });
});

// ═══════════════════ H. PROTECTION DU TIMING PAR MOT ═══════════════════
describe('H. le timing par mot bloque la recapture destructive', () => {
  it('détecte un timing par mot significatif', () => {
    expect(hasMeaningfulWordTiming(LINES())).toBe(false);
    expect(hasMeaningfulWordTiming([L('a', 1, 2, WORDS)])).toBe(true);
    expect(hasMeaningfulWordTiming([L('a', 1, 2, [])])).toBe(false);
    expect(hasMeaningfulWordTiming(null)).toBe(false);
  });

  it('passe en lecture seule avec le bon message et les bonnes actions', () => {
    const b = quickSyncBlock({ hasLyrics: true, lines: [L('a', 1, 2, WORDS)], captureSource: CAPTURE_SOURCE.LOCAL });
    expect(b.blocked).toBe(true);
    expect(b.readOnly).toBe(true);
    expect(b.title).toBe('Esta música já possui palavras sincronizadas.');
    expect(b.detail).toBe('Para proteger esses ajustes, use o modo avançado.');
    expect(b.primary).toBe('Abrir modo avançado');
    expect(b.secondary).toBe('Voltar');
  });

  it('ouvrir Quick Sync ne modifie AUCUN timing par mot', () => {
    const lines = [L('a', 1, 2, WORDS), L('b')];
    const before = JSON.parse(JSON.stringify(lines));
    quickSyncBlock({ hasLyrics: true, lines, captureSource: CAPTURE_SOURCE.LOCAL });
    initialQuickLine(lines);
    quickProgress(lines);
    expect(lines).toEqual(before);
    expect(lines[0].words).toEqual(WORDS);
  });

  it('la structure de mots sérialisée reste identique au bit près', () => {
    const lines = [L('a', 1, 2, WORDS)];
    const p1 = buildTimingPayload(lines);
    quickSyncBlock({ hasLyrics: true, lines, captureSource: CAPTURE_SOURCE.LOCAL });
    expect(buildTimingPayload(lines)).toEqual(p1);
  });

  it('aucun mot n’est effacé, décalé, borné ni redistribué (aucune fonction ne le propose)', async () => {
    const mod = await import('@/lib/quickSync');
    const names = Object.keys(mod).join(' ').toLowerCase();
    expect(names).not.toMatch(/clearwords|shiftwords|clampwords|redistribute/);
  });
});

// ═══════════════════ Blocages de source ═══════════════════
describe('blocages liés à la source de synchronisation', () => {
  const lines = [L('a')];
  it('aucune source utilisable → prépare l’áudio', () => {
    const b = quickSyncBlock({ hasLyrics: true, lines, captureSource: CAPTURE_SOURCE.BLOCKED, sourceIssue: 'none' });
    expect(b.blocked).toBe(true);
    expect(b.title).toBe('Prepare uma fonte de áudio antes de sincronizar.');
    expect(b.primary).toBe('Preparar áudio');
  });
  it('piste non calibrée', () => {
    const b = quickSyncBlock({ hasLyrics: true, lines, captureSource: CAPTURE_SOURCE.BLOCKED, sourceIssue: 'calibration' });
    expect(b.title).toBe('Calibre esta faixa antes de sincronizar.');
  });
  it('alignement à vérifier', () => {
    const b = quickSyncBlock({ hasLyrics: true, lines, captureSource: CAPTURE_SOURCE.BLOCKED, sourceIssue: 'verification' });
    expect(b.title).toBe('Verifique o alinhamento antes de usar esta faixa.');
  });
  it('YouTube reste une source valide quand aucun fichier local n’existe', () => {
    expect(quickSyncBlock({ hasLyrics: true, lines, captureSource: CAPTURE_SOURCE.YOUTUBE }).blocked).toBe(false);
  });
  it('jamais de repli silencieux : une source locale invalide BLOQUE', () => {
    const b = quickSyncBlock({ hasLyrics: true, lines, captureSource: CAPTURE_SOURCE.BLOCKED });
    expect(b.blocked).toBe(true);
    expect(b.title).not.toContain('YouTube');
  });
});

// ═══════════════════ F. NAVIGATION DES LIGNES ═══════════════════
describe('F. sélection de la ligne active', () => {
  it('une chanson neuve démarre sur la première ligne utilisable', () => {
    expect(initialQuickLine([L('a'), L('b')])).toBe(0);
  });
  it('un brouillon partiel démarre sur la première ligne INCOMPLÈTE', () => {
    expect(initialQuickLine(LINES())).toBe(2);
    expect(initialQuickLine([L('a', 1, 2), L('b', 3, null), L('c', 5, 6)])).toBe(1);
  });
  it('tout valide → revue, première ligne', () => {
    expect(initialQuickLine([L('a', 1, 2), L('b', 3, 4)])).toBe(0);
  });
  it('sans paroles → -1', () => {
    expect(initialQuickLine([])).toBe(-1);
  });
  it('ignore les lignes vides', () => {
    expect(initialQuickLine([L('   '), L('b')])).toBe(1);
  });

  it('la ligne suivante saute les lignes DÉJÀ complètes (jamais d’écrasement auto)', () => {
    const lines = [L('a', 1, 2), L('b', 3, 4), L('c'), L('d')];
    expect(nextIncompleteLine(lines, 0)).toBe(2);
    expect(nextIncompleteLine(lines, 2)).toBe(3);
  });
  it('revient chercher en arrière s’il ne reste rien après', () => {
    const lines = [L('a'), L('b', 3, 4)];
    expect(nextIncompleteLine(lines, 1)).toBe(0);
  });
  it('tout complet → null (terminé)', () => {
    expect(nextIncompleteLine([L('a', 1, 2)], 0)).toBe(null);
  });
});

// ═══════════════════ I. PROGRESSION ET FIN ═══════════════════
describe('I. progression', () => {
  it('compte les lignes UTILISABLES et formate le libellé', () => {
    const p = quickProgress(LINES(), 1);
    expect(p.total).toBe(4);
    expect(p.done).toBe(2);
    expect(p.label).toBe('Linha 2 de 4');
    expect(p.complete).toBe(false);
  });
  it('ignore les lignes vides dans le total', () => {
    expect(quickProgress([L('a', 1, 2), L('  ')], 0).total).toBe(1);
  });
  it('complet seulement quand chaque frase utilisable est valide', () => {
    expect(quickProgress([L('a', 1, 2), L('b', 3, 4)], 0).complete).toBe(true);
    expect(quickProgress([L('a', 1, 2), L('b', 3, null)], 0).complete).toBe(false);
  });
  it('les textes de fin sont en pt-BR', () => {
    expect(QS_LABELS.completedTitle).toBe('Sincronização concluída');
    expect(QS_LABELS.completedBody).toBe('Todas as frases possuem início e fim. Revise o resultado antes de guardar.');
    expect(QS_LABELS.review).toBe('Revisar resultado');
    expect(QS_LABELS.save).toBe('Guardar sincronização');
  });
});

describe('isLineComplete', () => {
  it('exige un début ET une fin postérieure', () => {
    expect(isLineComplete(L('a', 1, 2))).toBe(true);
    expect(isLineComplete(L('a', 1, null))).toBe(false);
    expect(isLineComplete(L('a', 2, 2))).toBe(false);
    expect(isLineComplete(L('a', 2, 1))).toBe(false);
    expect(isLineComplete(L('a'))).toBe(false);
  });
});

// ═══════════════════ C+D. MACHINE À ÉTATS (clavier ET pointeur) ═══════════════════
describe('C+D. une seule machine à états pour le clavier et le pointeur', () => {
  const ready = () => quickReduce(quickInitial({ blocked: false }), { type: 'ready' });

  it('démarre en idle, puis ready', () => {
    expect(quickInitial({ blocked: false }).status).toBe(QS.IDLE);
    expect(ready().status).toBe(QS.READY);
    expect(quickInitial({ blocked: true }).status).toBe(QS.BLOCKED);
  });

  it('un premier appui gèle l’identité de la ligne', () => {
    const s = quickReduce(ready(), { type: 'press', index: 3, pointerId: null });
    expect(s.status).toBe(QS.CAPTURING);
    expect(s.owner).toEqual({ index: 3 });
  });

  it('les appuis répétés (auto-repeat) sont ignorés', () => {
    let s = quickReduce(ready(), { type: 'press', index: 3 });
    s = quickReduce(s, { type: 'press', index: 9 });
    expect(s.owner).toEqual({ index: 3 }); // toujours la même ligne
  });

  it('un second pointeur ne peut pas démarrer une capture', () => {
    let s = quickReduce(ready(), { type: 'press', index: 1, pointerId: 7 });
    s = quickReduce(s, { type: 'press', index: 2, pointerId: 8 });
    expect(s.owner).toEqual({ index: 1 });
    expect(s.pointerId).toBe(7);
  });

  it('seul le pointeur initiateur peut terminer la capture', () => {
    let s = quickReduce(ready(), { type: 'press', index: 1, pointerId: 7 });
    const wrong = quickReduce(s, { type: 'release', pointerId: 8 });
    expect(wrong.status).toBe(QS.CAPTURING); // ignoré
    s = quickReduce(s, { type: 'release', pointerId: 7 });
    expect(s.status).toBe(QS.COMMITTING);
  });

  it('le clavier (pointerId null) se termine normalement', () => {
    let s = quickReduce(ready(), { type: 'press', index: 1, pointerId: null });
    s = quickReduce(s, { type: 'release', pointerId: null });
    expect(s.status).toBe(QS.COMMITTING);
    expect(s.owner).toEqual({ index: 1 });
  });

  it('un relâchement TARDIF après changement de ligne ne vise que la ligne gelée', () => {
    let s = quickReduce(ready(), { type: 'press', index: 1, pointerId: null });
    // navigation pendant la capture — la machine ne change pas de propriétaire
    s = quickReduce(s, { type: 'select', index: 5 });
    s = quickReduce(s, { type: 'release', pointerId: null });
    expect(s.owner).toEqual({ index: 1 });
  });

  it('un commit réussi revient à ready et retient la dernière ligne', () => {
    let s = quickReduce(ready(), { type: 'press', index: 2 });
    s = quickReduce(s, { type: 'release' });
    s = quickReduce(s, { type: 'commit', ok: true });
    expect(s.status).toBe(QS.READY);
    expect(s.owner).toBe(null);
    expect(s.lastCommittedIndex).toBe(2);
    expect(s.message).toBe('Linha sincronizada.');
  });

  it('un commit INVALIDE n’écrit rien et garde la même ligne', () => {
    let s = quickReduce(ready(), { type: 'press', index: 2 });
    s = quickReduce(s, { type: 'release' });
    s = quickReduce(s, { type: 'commit', ok: false });
    expect(s.status).toBe(QS.READY);
    expect(s.lastCommittedIndex).toBe(null);
    expect(s.error).toBeTruthy();
  });

  it('l’annulation (Escape, pointercancel, démontage) n’écrit rien', () => {
    let s = quickReduce(ready(), { type: 'press', index: 2, pointerId: 3 });
    s = quickReduce(s, { type: 'cancel' });
    expect(s.status).toBe(QS.READY);
    expect(s.owner).toBe(null);
    expect(s.pointerId).toBe(null);
    expect(s.message).toBe('Captura cancelada.');
    expect(s.lastCommittedIndex).toBe(null);
  });

  it('un relâchement sans capture active est un no-op strict', () => {
    const r = ready();
    expect(quickReduce(r, { type: 'release' })).toBe(r);
  });

  it('bloqué : aucun appui ne démarre quoi que ce soit', () => {
    const b = quickInitial({ blocked: true });
    expect(quickReduce(b, { type: 'press', index: 0 })).toBe(b);
  });

  it('passe en completed puis peut revenir en ready', () => {
    let s = quickReduce(ready(), { type: 'complete' });
    expect(s.status).toBe(QS.COMPLETED);
    s = quickReduce(s, { type: 'ready' });
    expect(s.status).toBe(QS.READY);
  });

  it('la machine ne contient AUCUN timing : elle ne peut rien écrire', () => {
    let s = quickReduce(ready(), { type: 'press', index: 1 });
    s = quickReduce(s, { type: 'release' });
    expect(Object.keys(s).sort())
      .toEqual(['error', 'lastCommittedIndex', 'message', 'owner', 'pointerId', 'status']);
  });
});

// ═══════════════════ Éligibilité et textes ═══════════════════
describe('éligibilité à la capture et instructions', () => {
  it('capture possible seulement prêt, non bloqué, avec une source et une ligne', () => {
    expect(canCapture({ status: QS.READY, blocked: false, source: CAPTURE_SOURCE.LOCAL, activeIndex: 0 })).toBe(true);
    expect(canCapture({ status: QS.READY, blocked: true, source: CAPTURE_SOURCE.LOCAL, activeIndex: 0 })).toBe(false);
    expect(canCapture({ status: QS.READY, blocked: false, source: CAPTURE_SOURCE.BLOCKED, activeIndex: 0 })).toBe(false);
    expect(canCapture({ status: QS.READY, blocked: false, source: CAPTURE_SOURCE.LOCAL, activeIndex: -1 })).toBe(false);
    expect(canCapture({ status: QS.CAPTURING, blocked: false, source: CAPTURE_SOURCE.LOCAL, activeIndex: 0 })).toBe(false);
  });

  it('les instructions suivent l’état, en pt-BR', () => {
    expect(instructionFor({ status: QS.READY, isPlaying: false })).toBe('Clique em reproduzir para começar.');
    expect(instructionFor({ status: QS.READY, isPlaying: true })).toBe('Mantenha ESPAÇO pressionado quando a frase começar.');
    expect(instructionFor({ status: QS.CAPTURING, isPlaying: true })).toBe('Sincronizando esta frase…');
    expect(instructionFor({ status: QS.READY, isPlaying: true, message: 'Linha sincronizada.' })).toBe('Linha sincronizada.');
  });

  it('le libellé du bouton diffère desktop / toucher, même machine', () => {
    expect(captureButtonLabel({ status: QS.READY, touch: false })).toBe('SEGURE ESPAÇO PARA SINCRONIZAR');
    expect(captureButtonLabel({ status: QS.READY, touch: true })).toBe('SEGURE PARA SINCRONIZAR');
    expect(captureButtonLabel({ status: QS.CAPTURING, touch: false })).toBe('SOLTE QUANDO A FRASE TERMINAR');
    expect(captureButtonLabel({ status: QS.CAPTURING, touch: true })).toBe('SOLTE QUANDO A FRASE TERMINAR');
  });
});

// ═══════════════════ B+G. UNE SEULE SOURCE DE VÉRITÉ ═══════════════════
describe('B+G. la capture passe par le moteur de frases EXISTANT', () => {
  it('début/fin canoniques écrits par beginCapture/completeCapture', () => {
    const lines = LINES();
    const idx = initialQuickLine(lines); // 2
    const begun = beginCapture(lines, idx, 20.5);
    const done = completeCapture(begun.lines, begun.owner, 23);
    expect(done.lines[2]).toMatchObject({ time: 20.5, endTime: 23 });
    expect(done.completed).toBe(true);
    // les autres lignes sont intactes
    [0, 1, 3].forEach((i) => expect(done.lines[i]).toEqual(lines[i]));
  });

  it('une fin ≤ début ne laisse pas de fin partielle', () => {
    const lines = LINES();
    const begun = beginCapture(lines, 2, 20.5);
    const done = completeCapture(begun.lines, begun.owner, 20.5);
    expect(done.lines[2].time).toBe(20.5);
    expect(done.lines[2].endTime).toBe(null);
  });

  it('la recapture ne change QUE la frase visée', () => {
    const lines = [L('a', 1, 2), L('b', 3, 4), L('c', 5, 6)];
    const begun = beginCapture(lines, 1, 30);
    const done = completeCapture(begun.lines, begun.owner, 33);
    expect(done.lines[1]).toMatchObject({ time: 30, endTime: 33 });
    expect(done.lines[0]).toEqual(lines[0]);
    expect(done.lines[2]).toEqual(lines[2]);
  });

  it('la capture ne touche ni au texte, ni aux métadonnées de piste', () => {
    const lines = LINES();
    const texts = lines.map((l) => l.text);
    const begun = beginCapture(lines, 2, 20.5);
    const done = completeCapture(begun.lines, begun.owner, 23);
    expect(done.lines.map((l) => l.text)).toEqual(texts);
    expect(JSON.stringify(done.lines)).not.toMatch(/fileName|offsetSeconds|blob:/);
  });

  it('l’annulation restaure le timing précédent (owner.prevTime/prevEndTime)', () => {
    const lines = [L('a', 1, 2)];
    const begun = beginCapture(lines, 0, 50);
    expect(begun.owner.prevTime).toBe(1);
    expect(begun.owner.prevEndTime).toBe(2);
  });
});

// ═══════════════════ J. CONTRAT DE SAUVEGARDE ═══════════════════
describe('J. aucun état d’interface Quick Sync dans le payload', () => {
  it('le payload ne contient que du timing canonique', () => {
    const lines = LINES();
    const begun = beginCapture(lines, 2, 20.5);
    const done = completeCapture(begun.lines, begun.owner, 23);
    const serialized = JSON.stringify(buildTimingPayload(done.lines));
    for (const leak of [
      'status', 'capturing', 'pointerId', 'owner', 'lastCommittedIndex', 'message',
      'instruction', 'progress', 'Linha', 'SEGURE', 'keyboardHelp', 'touch',
      'fileName', 'objectUrl', 'blob:', 'offsetSeconds', 'verification', 'fileIdentity',
    ]) {
      expect(serialized).not.toContain(leak);
    }
  });

  it('les libellés d’aide clavier existent mais restent hors payload', () => {
    expect(QS_LABELS.help).toEqual([
      'Espaço: sincronizar', 'Backspace: desfazer', '← →: mudar de linha', 'Esc: cancelar',
    ]);
    const lines = [L('a', 1, 2)];
    expect(JSON.stringify(buildTimingPayload(lines))).not.toContain('Espaço');
  });
});
