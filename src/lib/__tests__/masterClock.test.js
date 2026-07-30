/**
 * Régression — HORLOGE MAÎTRE de l'éditeur karaokê.
 *
 * Constaté le 2026-07-29 sur « Churrasco no trilho » (vérifié dans le code) :
 *  1. `new YT.Player()` n'avait AUCUN handler `onError` : une vidéo privée n'était
 *     jamais signalée, l'éditeur restait à « 00:00.00 / 00:00.00 ».
 *  2. `currentTime` venait EXCLUSIVEMENT de `player.getCurrentTime()` (poll 100 ms) :
 *     avec une vidéo privée, l'aperçu karaokê ne bougeait donc jamais, même avec la
 *     chanson chargée en local et 152/152 frases importées.
 *  3. `togglePlay()` agissait UNIQUEMENT sur `playerRef.current` : le bouton Play ne
 *     faisait strictement rien (pas d'erreur, pas de son).
 *
 * D'où ce point de décision unique : à qui l'éditeur demande l'heure.
 */
import { describe, it, expect } from 'vitest';
import {
  CLOCK_SOURCE, masterClockSource, localCanonicalDuration, videoUnavailableNotice,
} from '../karaokeWorkshop';
import { localAudioTimeToCanonical } from '../audioClock';

describe('masterClockSource', () => {
  it('garde YouTube quand la vidéo répond (comportement historique)', () => {
    expect(masterClockSource({ playerReady: true })).toBe(CLOCK_SOURCE.YOUTUBE);
    // …même avec une piste locale calibrée disponible : aucune bascule surprise.
    expect(masterClockSource({ playerReady: true, localReady: true, offsetSeconds: 0 })).toBe(CLOCK_SOURCE.YOUTUBE);
  });

  it("n'invente pas d'horloge pendant que le player charge encore", () => {
    expect(masterClockSource({ playerReady: false, localReady: true, offsetSeconds: 0 })).toBe(CLOCK_SOURCE.NONE);
  });

  it('bascule sur le local quand la vidéo est indisponible et la piste calibrée', () => {
    expect(masterClockSource({ videoUnavailable: true, localReady: true, offsetSeconds: 0 })).toBe(CLOCK_SOURCE.LOCAL);
    expect(masterClockSource({ videoUnavailable: true, localReady: true, offsetSeconds: -1.5 })).toBe(CLOCK_SOURCE.LOCAL);
  });

  it('REFUSE de promouvoir une piste non calibrée en horloge', () => {
    // offset inconnu = décalage inconnu : l'aperçu surlignerait la mauvaise frase.
    expect(masterClockSource({ videoUnavailable: true, localReady: true, offsetSeconds: null })).toBe(CLOCK_SOURCE.NONE);
    expect(masterClockSource({ videoUnavailable: true, localReady: true })).toBe(CLOCK_SOURCE.NONE);
    expect(masterClockSource({ videoUnavailable: true, localReady: true, offsetSeconds: NaN })).toBe(CLOCK_SOURCE.NONE);
  });

  it("n'a aucune horloge si la vidéo est morte et qu'aucun fichier n'est prêt", () => {
    expect(masterClockSource({ videoUnavailable: true, localReady: false, offsetSeconds: 0 })).toBe(CLOCK_SOURCE.NONE);
    expect(masterClockSource({})).toBe(CLOCK_SOURCE.NONE);
  });
});

describe('localCanonicalDuration', () => {
  it('exprime la fin du fichier sur l’horloge de la chanson', () => {
    expect(localCanonicalDuration(292, 0)).toBe(292);      // 4:52, offset explicite 0
    expect(localCanonicalDuration(292, 1.5)).toBe(293.5);
  });
  it('renvoie 0 (durée inconnue) plutôt qu’une valeur inventée', () => {
    expect(localCanonicalDuration(292, null)).toBe(0);
    expect(localCanonicalDuration(0, 0)).toBe(0);
    expect(localCanonicalDuration(NaN, 0)).toBe(0);
  });
});

describe('videoUnavailableNotice', () => {
  it('ne dit rien quand la vidéo va bien', () => {
    expect(videoUnavailableNotice({ videoUnavailable: false, hasLocalFile: true })).toBeNull();
  });

  it('propose UNE action quand un fichier local existe mais n’est pas calibré', () => {
    const n = videoUnavailableNotice({ videoUnavailable: true, clockSource: CLOCK_SOURCE.NONE, hasLocalFile: true });
    expect(n.tone).toBe('error');
    expect(n.canUseLocalClock).toBe(true);
  });

  it('demande le fichier quand il n’y en a aucun', () => {
    const n = videoUnavailableNotice({ videoUnavailable: true, clockSource: CLOCK_SOURCE.NONE, hasLocalFile: false });
    expect(n.canUseLocalClock).toBe(false);
    expect(n.text).toMatch(/ficheiro/i);
  });

  it('NOMME la cause réelle quand elle est fournie (Short refusé ≠ panne de lecture)', () => {
    const problem = 'O único vídeo desta música é um Short (excerto de ~60 s).';
    const blocked = videoUnavailableNotice({ videoUnavailable: true, clockSource: CLOCK_SOURCE.NONE, hasLocalFile: true, problem });
    expect(blocked.text).toContain('Short');
    expect(blocked.text).not.toContain('privado');
    // …et la cause reste visible une fois l'audio local promu horloge.
    const running = videoUnavailableNotice({ videoUnavailable: true, clockSource: CLOCK_SOURCE.LOCAL, hasLocalFile: true, problem });
    expect(running.text).toContain('Short');
    expect(running.text).toMatch(/áudio local/);
  });

  it('retombe sur la cause par défaut si aucune n’est fournie', () => {
    const n = videoUnavailableNotice({ videoUnavailable: true, clockSource: CLOCK_SOURCE.NONE, hasLocalFile: true, problem: '   ' });
    expect(n.text).toContain('privado');
  });

  it('explique la situation, sans action, quand le local est déjà l’horloge', () => {
    const n = videoUnavailableNotice({ videoUnavailable: true, clockSource: CLOCK_SOURCE.LOCAL, hasLocalFile: true });
    expect(n.tone).toBe('warn');
    expect(n.canUseLocalClock).toBe(false);
  });
});

describe('scénario réel — Churrasco no trilho, vidéo privée', () => {
  // JSON whisperX aligné SUR LE FICHIER LOCAL : les temps importés sont donc déjà sur
  // l'horloge du .wav → offset explicite 0 est la vérité, pas une approximation.
  const OFFSET = 0;
  const LOCAL_DURATION = 292; // 4:52

  it('l’éditeur retrouve une horloge et une durée utilisables', () => {
    const source = masterClockSource({
      videoUnavailable: true, playerReady: false, localReady: true, offsetSeconds: OFFSET,
    });
    expect(source).toBe(CLOCK_SOURCE.LOCAL);
    expect(localCanonicalDuration(LOCAL_DURATION, OFFSET)).toBe(292);
  });

  it('la 1re frase importée (12,04 s) tombe au bon endroit du fichier local', () => {
    // À 12,04 s du .wav, le temps canonique lu par l'aperçu est bien 12,04 s.
    expect(localAudioTimeToCanonical(12.04, OFFSET)).toBeCloseTo(12.04, 5);
  });
});
