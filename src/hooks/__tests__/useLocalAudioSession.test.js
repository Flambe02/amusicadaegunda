/**
 * Régression — CYCLE DE VIE DES RESSOURCES de `useLocalAudioSession` (étape 6.1).
 *
 * Cette session audio locale était le seul module non testé du chemin « faixas locais ».
 * Deux zones critiques :
 *
 *  1. OBJECT URLS — une URL par fichier, révoquée exactement une fois au remplacement,
 *     au retrait et au démontage. Une fuite laisserait le blob en mémoire tant que
 *     l'onglet vit ; une double révocation ou une révocation de la NOUVELLE URL casserait
 *     la lecture.
 *
 *  2. RAPPELS TARDIFS — `load()` décode le fichier de façon asynchrone
 *     (`await file.arrayBuffer()` puis `decodeAudioData`). Sans garde de génération, un
 *     décodage encore en vol quand un AUTRE fichier est chargé (ou la piste retirée, ou
 *     le composant démonté) écrase la durée / les crêtes / l'état « prêt » du NOUVEAU
 *     fichier — ou ressuscite une piste retirée.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalAudioSession } from '@/hooks/useLocalAudioSession';

let created = [];
let revoked = [];
// Contrôle manuel de la résolution du décodage, pour simuler un rappel TARDIF.
let pendingDecodes = [];

const makeFile = (name, size = 1000, lastModified = 1) => ({
  name,
  size,
  lastModified,
  type: 'audio/mpeg',
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
});

beforeEach(() => {
  created = [];
  revoked = [];
  pendingDecodes = [];
  let n = 0;
  vi.stubGlobal('URL', {
    createObjectURL: () => { n += 1; const u = `blob:url-${n}`; created.push(u); return u; },
    revokeObjectURL: (u) => { revoked.push(u); },
  });
  // AudioContext factice : `decodeAudioData` renvoie une promesse qu'on résout à la main.
  vi.stubGlobal('AudioContext', class {
    decodeAudioData() {
      return new Promise((resolve) => {
        pendingDecodes.push(() => resolve({
          duration: 184.2, sampleRate: 44100, numberOfChannels: 1, length: 8,
          getChannelData: () => new Float32Array(8),
        }));
      });
    }
    close() { return Promise.resolve(); }
  });
});
afterEach(() => { vi.unstubAllGlobals(); });

const flushDecodes = async () => {
  const list = pendingDecodes.slice();
  pendingDecodes = [];
  list.forEach((r) => r());
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
};

// ═══════════════════════ A. OBJECT URLS ═══════════════════════
describe('A. cycle de vie des object URLs', () => {
  it('crée une URL au chargement et la révoque EXACTEMENT une fois au remplacement', async () => {
    const { result } = renderHook(() => useLocalAudioSession());
    await act(async () => { result.current.load(makeFile('a.mp3')); });
    await flushDecodes();
    expect(created).toHaveLength(1);
    expect(revoked).toHaveLength(0);

    await act(async () => { result.current.load(makeFile('b.mp3', 2000, 2)); });
    await flushDecodes();
    expect(created).toHaveLength(2);
    expect(revoked).toEqual([created[0]]); // l'ANCIENNE, une seule fois
  });

  it('révoque exactement une fois au retrait, et pas la nouvelle', async () => {
    const { result } = renderHook(() => useLocalAudioSession());
    await act(async () => { result.current.load(makeFile('a.mp3')); });
    await flushDecodes();
    act(() => { result.current.clear(); });
    expect(revoked).toEqual([created[0]]);
    // Un second clear ne révoque rien de plus.
    act(() => { result.current.clear(); });
    expect(revoked).toEqual([created[0]]);
  });

  it('des remplacements répétés ne révoquent jamais l’URL courante', async () => {
    const { result } = renderHook(() => useLocalAudioSession());
    for (let i = 1; i <= 4; i += 1) {
      await act(async () => { result.current.load(makeFile(`f${i}.mp3`, 1000 + i, i)); });
      await flushDecodes();
    }
    expect(created).toHaveLength(4);
    expect(revoked).toEqual(created.slice(0, 3)); // toutes sauf la courante
    expect(revoked).not.toContain(created[3]);
  });

  it('révoque l’URL restante au démontage, exactement une fois', async () => {
    const { result, unmount } = renderHook(() => useLocalAudioSession());
    await act(async () => { result.current.load(makeFile('a.mp3')); });
    await flushDecodes();
    unmount();
    expect(revoked).toEqual([created[0]]);
  });

  it('ne révoque rien si aucun fichier n’a été chargé', () => {
    const { unmount } = renderHook(() => useLocalAudioSession());
    unmount();
    expect(revoked).toHaveLength(0);
  });
});

// ═══════════════════════ D. RAPPELS TARDIFS ═══════════════════════
describe('D. un décodage TARDIF ne peut pas écraser l’état courant', () => {
  it('un décodage en vol ne remplace pas les métadonnées du NOUVEAU fichier', async () => {
    const { result } = renderHook(() => useLocalAudioSession());
    // Fichier A : on lance le chargement mais on NE résout PAS son décodage.
    await act(async () => { result.current.load(makeFile('a.mp3', 1000, 1)); });
    const staleDecode = pendingDecodes.slice();
    pendingDecodes = [];

    // Fichier B remplace A, et son décodage aboutit.
    await act(async () => { result.current.load(makeFile('b.mp3', 2000, 2)); });
    await flushDecodes();
    expect(result.current.fileName).toBe('b.mp3');
    expect(result.current.fileSize).toBe(2000);
    expect(result.current.ready).toBe(true);

    // Le décodage de A arrive MAINTENANT : il doit être ignoré.
    await act(async () => { staleDecode.forEach((r) => r()); await Promise.resolve(); await Promise.resolve(); });
    expect(result.current.fileName).toBe('b.mp3');
    expect(result.current.fileSize).toBe(2000);
    expect(result.current.error).toBe(null);
  });

  it('un décodage tardif ne peut pas RESSUSCITER une piste retirée', async () => {
    const { result } = renderHook(() => useLocalAudioSession());
    await act(async () => { result.current.load(makeFile('a.mp3')); });
    const staleDecode = pendingDecodes.slice();
    pendingDecodes = [];
    act(() => { result.current.clear(); });
    expect(result.current.fileName).toBe(null);

    await act(async () => { staleDecode.forEach((r) => r()); await Promise.resolve(); await Promise.resolve(); });
    expect(result.current.fileName).toBe(null);
    expect(result.current.ready).toBe(false);
    expect(result.current.duration).toBe(0);
  });

  it('un décodage tardif après DÉMONTAGE ne met aucun état à jour', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result, unmount } = renderHook(() => useLocalAudioSession());
    await act(async () => { result.current.load(makeFile('a.mp3')); });
    const staleDecode = pendingDecodes.slice();
    pendingDecodes = [];
    unmount();
    await act(async () => { staleDecode.forEach((r) => r()); await Promise.resolve(); await Promise.resolve(); });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('le chargement le plus RÉCENT gagne toujours', async () => {
    const { result } = renderHook(() => useLocalAudioSession());
    await act(async () => { result.current.load(makeFile('a.mp3', 1000, 1)); });
    const d1 = pendingDecodes.slice(); pendingDecodes = [];
    await act(async () => { result.current.load(makeFile('b.mp3', 2000, 2)); });
    const d2 = pendingDecodes.slice(); pendingDecodes = [];
    // Ordre d'arrivée inversé : B puis A.
    await act(async () => { d2.forEach((r) => r()); await Promise.resolve(); });
    await act(async () => { d1.forEach((r) => r()); await Promise.resolve(); await Promise.resolve(); });
    expect(result.current.fileName).toBe('b.mp3');
    expect(result.current.duration).toBeCloseTo(184.2, 5);
  });
});
