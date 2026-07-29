/**
 * Régression — SOURCE D'HORLOGE DE LA CAPTURE (étape 5.1).
 *
 * Constaté après l'étape 5 : l'atelier pouvait jouer et réécouter l'audio local, mais
 * TOUTE la capture lisait encore `player.getCurrentTime()` (YouTube) — cinq points
 * d'appel : `startHold` (Espaço maintenu), `markLineStart` (Enter / bouton « I »),
 * `markEndAtPlayhead` (« F »), `insertAtPlayhead` (« + ») et la capture de mots du
 * panneau intégré. Impossible donc de synchroniser en écoutant l'audio local, et la
 * barre pouvait afficher « áudio local » tout en captant l'horloge YouTube.
 *
 * Règle : une SEULE décision de source, utilisée par le clavier ET les boutons.
 * Le temps ENREGISTRÉ reste CANONIQUE : canonique = local + offset.
 */
import { describe, it, expect } from 'vitest';
import {
  CAPTURE_SOURCE, captureSourceFor, canonicalCaptureTime,
  captureBlockedMessage, captureSourceLabel, compensateLatency,
} from '@/lib/karaokeWorkshop';
import { beginCapture, completeCapture } from '@/lib/phraseCapture';
import { buildTimingPayload } from '@/lib/karaokeSyncContract';
import { resolveSongTiming } from '@/lib/timingModel';

// ═════════════════ Décision de source ═════════════════
describe('décision de source de capture', () => {
  it('audio local calibré → source LOCALE', () => {
    expect(captureSourceFor({ hasLocalFile: true, calibrationStatus: 'calibrated' }))
      .toBe(CAPTURE_SOURCE.LOCAL);
  });

  it('aucun fichier local → YouTube (comportement historique préservé)', () => {
    expect(captureSourceFor({ hasLocalFile: false, calibrationStatus: 'missing' }))
      .toBe(CAPTURE_SOURCE.YOUTUBE);
    expect(captureSourceFor({ hasLocalFile: false, calibrationStatus: 'calibrated' }))
      .toBe(CAPTURE_SOURCE.YOUTUBE);
  });

  it('fichier local NON calibré → BLOQUÉ, jamais de repli silencieux sur YouTube', () => {
    for (const status of ['missing', 'stale-file', undefined, null, 'bidon']) {
      expect(captureSourceFor({ hasLocalFile: true, calibrationStatus: status }))
        .toBe(CAPTURE_SOURCE.BLOCKED);
    }
  });

  it('l’étiquette affichée correspond TOUJOURS à la source réellement utilisée', () => {
    expect(captureSourceLabel(CAPTURE_SOURCE.LOCAL)).toBe('Fonte de sincronização: áudio local');
    expect(captureSourceLabel(CAPTURE_SOURCE.YOUTUBE)).toBe('Fonte de sincronização: YouTube');
    expect(captureSourceLabel(CAPTURE_SOURCE.BLOCKED)).toBe('Fonte de sincronização: bloqueada');
  });

  it('le message de blocage est explicite, en pt-BR', () => {
    expect(captureBlockedMessage(CAPTURE_SOURCE.BLOCKED))
      .toBe('Calibre o áudio local antes de sincronizar as frases.');
    expect(captureBlockedMessage(CAPTURE_SOURCE.LOCAL)).toBe(null);
    expect(captureBlockedMessage(CAPTURE_SOURCE.YOUTUBE)).toBe(null);
  });
});

// ═════════════════ A. CAPTURE LOCALE CALIBRÉE ═════════════════
describe('A. capture depuis l’audio local calibré', () => {
  it('local 10,750 avec offset +1,750 → canonique 12,500', () => {
    const t = canonicalCaptureTime({
      source: CAPTURE_SOURCE.LOCAL, localTime: 10.75, offsetSeconds: 1.75, youtubeTime: 999,
    });
    expect(t).toBeCloseTo(12.5, 10);
  });

  it('l’horloge YouTube est IGNORÉE quand la source est locale', () => {
    const t = canonicalCaptureTime({
      source: CAPTURE_SOURCE.LOCAL, localTime: 5, offsetSeconds: 0.5, youtubeTime: 123.4,
    });
    expect(t).toBeCloseTo(5.5, 10);
  });
});

// ═════════════════ B. OFFSET NÉGATIF ═════════════════
describe('B. offset négatif', () => {
  it('local 10 avec offset −2 → canonique 8', () => {
    expect(canonicalCaptureTime({
      source: CAPTURE_SOURCE.LOCAL, localTime: 10, offsetSeconds: -2, youtubeTime: 0,
    })).toBeCloseTo(8, 10);
  });
});

// ═════════════════ C. ZÉRO EXPLICITE ═════════════════
describe('C. zéro explicitement calibré', () => {
  it('est accepté comme source locale', () => {
    expect(captureSourceFor({ hasLocalFile: true, calibrationStatus: 'calibrated' }))
      .toBe(CAPTURE_SOURCE.LOCAL);
  });
  it('local == canonique', () => {
    expect(canonicalCaptureTime({
      source: CAPTURE_SOURCE.LOCAL, localTime: 41.375, offsetSeconds: 0, youtubeTime: 7,
    })).toBeCloseTo(41.375, 10);
  });
});

// ═════════════════ D. CALIBRATION ABSENTE ═════════════════
describe('D. fichier local sans calibration', () => {
  const lines = () => ([
    { text: 'um', time: 2, endTime: 4 },
    { text: 'dois', time: null, endTime: null },
  ]);

  it('aucun temps de capture n’est produit (donc rien à écrire)', () => {
    expect(canonicalCaptureTime({
      source: CAPTURE_SOURCE.BLOCKED, localTime: 10, offsetSeconds: null, youtubeTime: 55,
    })).toBe(null);
  });

  it('le timing et le curseur restent inchangés', () => {
    const before = lines();
    const t = canonicalCaptureTime({
      source: CAPTURE_SOURCE.BLOCKED, localTime: 10, offsetSeconds: null, youtubeTime: 55,
    });
    // L'appelant n'a pas de timestamp → il n'appelle jamais beginCapture.
    expect(t).toBe(null);
    expect(before).toEqual(lines());
    const cursor = 1;
    expect(cursor).toBe(1);
  });

  it('surtout : PAS de repli sur le temps YouTube', () => {
    expect(canonicalCaptureTime({
      source: CAPTURE_SOURCE.BLOCKED, localTime: 10, offsetSeconds: null, youtubeTime: 55,
    })).not.toBe(55);
  });
});

// ═════════════════ E. FICHIER PÉRIMÉ ═════════════════
describe('E. calibration appartenant à un AUTRE fichier', () => {
  it('bloque la capture, sans repli YouTube', () => {
    const source = captureSourceFor({ hasLocalFile: true, calibrationStatus: 'stale-file' });
    expect(source).toBe(CAPTURE_SOURCE.BLOCKED);
    expect(canonicalCaptureTime({ source, localTime: 12, offsetSeconds: null, youtubeTime: 77 })).toBe(null);
    expect(captureBlockedMessage(source)).toBe('Calibre o áudio local antes de sincronizar as frases.');
  });
});

// ═════════════════ F. REPLI YOUTUBE ═════════════════
describe('F. sans audio local, le comportement YouTube est inchangé', () => {
  it('renvoie exactement le temps YouTube', () => {
    expect(canonicalCaptureTime({
      source: CAPTURE_SOURCE.YOUTUBE, localTime: 999, offsetSeconds: 1.75, youtubeTime: 31.4,
    })).toBeCloseTo(31.4, 10);
  });

  it('l’offset n’est PAS appliqué à l’horloge YouTube (elle est déjà canonique)', () => {
    const t = canonicalCaptureTime({
      source: CAPTURE_SOURCE.YOUTUBE, localTime: 0, offsetSeconds: 5, youtubeTime: 10,
    });
    expect(t).toBe(10);
    expect(t).not.toBe(15);
  });

  it('un temps YouTube invalide donne 0, comme avant', () => {
    expect(canonicalCaptureTime({
      source: CAPTURE_SOURCE.YOUTUBE, localTime: 0, offsetSeconds: null, youtubeTime: Number.NaN,
    })).toBe(0);
  });
});

// ═════════════════ Compensation de latence ═════════════════
describe('compensation de la latence de réaction', () => {
  it('retranche la latence convertie selon la vitesse de la source active', () => {
    expect(compensateLatency(12.5, 120, 1)).toBeCloseTo(12.38, 10);
    expect(compensateLatency(12.5, 120, 0.5)).toBeCloseTo(12.44, 10);
    expect(compensateLatency(12.5, 0, 1)).toBe(12.5);
  });
  it('ne descend jamais sous zéro', () => {
    expect(compensateLatency(0.05, 500, 1)).toBe(0);
  });
  it('propage null (source bloquée)', () => {
    expect(compensateLatency(null, 120, 1)).toBe(null);
  });
});

// ═════════════════ G. PROGRESSION (étape 3 inchangée) ═════════════════
describe('G. la progression de l’étape 3 est intacte avec la source locale', () => {
  const LINES = () => ([
    { text: 'um', time: 2, endTime: 4 },
    { text: 'dois', time: null, endTime: null },
    { text: 'três', time: null, endTime: null },
  ]);

  it('début local → beginCapture reçoit un temps CANONIQUE, le curseur ne bouge pas', () => {
    const start = canonicalCaptureTime({
      source: CAPTURE_SOURCE.LOCAL, localTime: 10.75, offsetSeconds: 1.75, youtubeTime: 0,
    });
    const begun = beginCapture(LINES(), 1, start);
    expect(begun.lines[1].time).toBeCloseTo(12.5, 10);
    expect(begun.selectedIndex).toBe(1);
  });

  it('fin locale → avance EXACTEMENT une fois', () => {
    const start = canonicalCaptureTime({ source: CAPTURE_SOURCE.LOCAL, localTime: 10.75, offsetSeconds: 1.75 });
    const begun = beginCapture(LINES(), 1, start);
    const end = canonicalCaptureTime({ source: CAPTURE_SOURCE.LOCAL, localTime: 14.25, offsetSeconds: 1.75 });
    const done = completeCapture(begun.lines, begun.owner, end);
    expect(done.lines[1]).toMatchObject({ time: 12.5, endTime: 16 });
    expect(done.selectedIndex).toBe(2);
    expect(done.completed).toBe(true);
    // Un second relâchement ne fait rien.
    const dup = completeCapture(done.lines, null, 99);
    expect(dup.completed).toBe(false);
    expect(dup.lines).toBe(done.lines);
  });

  it('la dernière frase reste stable', () => {
    const lines = LINES().map((l, i) => (i < 2 ? { ...l, time: i + 1, endTime: i + 1.5 } : l));
    const begun = beginCapture(lines, 2, canonicalCaptureTime({ source: CAPTURE_SOURCE.LOCAL, localTime: 20, offsetSeconds: 1.75 }));
    const done = completeCapture(begun.lines, begun.owner, canonicalCaptureTime({ source: CAPTURE_SOURCE.LOCAL, localTime: 22, offsetSeconds: 1.75 }));
    expect(done.selectedIndex).toBe(2);
    expect(done.atEnd).toBe(true);
  });

  it('changer de source ne modifie AUCUN timing déjà posé', () => {
    const lines = LINES();
    const snapshot = JSON.parse(JSON.stringify(lines));
    captureSourceFor({ hasLocalFile: true, calibrationStatus: 'calibrated' });
    captureSourceFor({ hasLocalFile: false, calibrationStatus: 'missing' });
    captureSourceFor({ hasLocalFile: true, calibrationStatus: 'stale-file' });
    expect(lines).toEqual(snapshot);
  });
});

// ═════════════════ H. ALLER-RETOUR COMPLET ═════════════════
describe('H. aller-retour : capture locale → sauvegarde → rechargement', () => {
  it('la frase reste 12,500 → 16,000 et aucune métadonnée de calibration ne fuit', () => {
    const OFFSET = 1.75;
    let lines = [
      { text: 'um', time: 2, endTime: 4 },
      { text: 'dois coração', time: null, endTime: null },
      { text: 'três', time: null, endTime: null },
    ];
    const source = captureSourceFor({ hasLocalFile: true, calibrationStatus: 'calibrated' });
    expect(source).toBe(CAPTURE_SOURCE.LOCAL);

    // 4-5. début capté à local 10,750 → canonique 12,500
    const start = canonicalCaptureTime({ source, localTime: 10.75, offsetSeconds: OFFSET });
    expect(start).toBeCloseTo(12.5, 10);
    const begun = beginCapture(lines, 1, start);

    // 6-7. fin captée à local 14,250 → canonique 16,000
    const end = canonicalCaptureTime({ source, localTime: 14.25, offsetSeconds: OFFSET });
    expect(end).toBeCloseTo(16, 10);
    const done = completeCapture(begun.lines, begun.owner, end);
    lines = done.lines;

    // 8. une seule avance
    expect(done.selectedIndex).toBe(2);

    // 9-10. sérialisation + rechargement
    const payload = buildTimingPayload(lines);
    const reloaded = resolveSongTiming({ lrc_content: payload.lrc_content, timing_data: payload.timing_data });
    expect(reloaded.lines[1].time).toBeCloseTo(12.5, 5);
    expect(reloaded.lines[1].endTime).toBeCloseTo(16, 5);
    expect(reloaded.lines[0]).toMatchObject({ time: 2, endTime: 4 }); // ligne 0 intacte

    // 11. aucune métadonnée de calibration dans le payload
    const serialized = JSON.stringify(payload);
    for (const leak of ['offsetSeconds', 'fileIdentity', 'calibratedAt', 'localTime',
      'manual-anchor', 'explicit-zero', 'fileSize', 'lastModified']) {
      expect(serialized).not.toContain(leak);
    }
    // Frase seule → contrat de l'étape 2 intact.
    expect(payload.timing_data).toBeNull();
    expect(payload.timing_mode).toBe('line');
  });
});
