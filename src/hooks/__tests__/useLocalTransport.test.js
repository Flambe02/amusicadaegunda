/**
 * Régression — TRANSPORT AUDIO LOCAL de l'atelier (un seul propriétaire de lecture).
 *
 * Avant cette étape, l'audio local était chargé mais n'était jamais joué hors du studio
 * de mots : tout le transport de l'éditeur pilotait YouTube. Ce hook donne à l'atelier
 * un transport local unique, sans créer de second élément <audio> et sans jamais
 * toucher au timing enregistré.
 *
 * Couvre aussi le nettoyage des ressources (B et J de l'étape 5) : écouteurs retirés,
 * rAF annulé, aucune mise à jour d'état après démontage.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalTransport } from '@/hooks/useLocalTransport';

// Élément <audio> factice : compte les écouteurs pour prouver l'absence de fuite.
function makeAudio({ duration = 200 } = {}) {
  const listeners = new Map();
  return {
    currentTime: 0,
    duration,
    playbackRate: 1,
    paused: true,
    listeners,
    listenerCount: () => [...listeners.values()].reduce((n, set) => n + set.size, 0),
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    emit(type) { [...(listeners.get(type) || [])].forEach((fn) => fn()); },
    play: vi.fn(function play() { this.paused = false; return Promise.resolve(); }),
    pause: vi.fn(function pause() { this.paused = true; }),
  };
}

const setup = (over = {}) => {
  const el = over.el || makeAudio();
  const session = {
    audioRef: { current: el }, ready: true, duration: el.duration,
    fileName: 'a.mp3', ...over.session,
  };
  const hook = renderHook((props) => useLocalTransport(props), {
    initialProps: { session, offsetSeconds: 1.75, ...over.props },
  });
  return { el, session, hook };
};

let rafCbs = [];
beforeEach(() => {
  rafCbs = [];
  vi.stubGlobal('requestAnimationFrame', (cb) => { rafCbs.push(cb); return rafCbs.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('B. lecture / pause via le SEUL propriétaire audio', () => {
  it('joue et met en pause l’élément fourni par la session', async () => {
    const { el, hook } = setup();
    await act(async () => { hook.result.current.play(); });
    expect(el.play).toHaveBeenCalledTimes(1);
    expect(hook.result.current.isPlaying).toBe(true);

    act(() => { hook.result.current.pause(); });
    expect(el.pause).toHaveBeenCalledTimes(1);
    expect(hook.result.current.isPlaying).toBe(false);
  });

  it('ne crée aucun élément audio de son côté', () => {
    const { el, hook } = setup();
    expect(hook.result.current.audioEl).toBe(el);
  });

  it('ne fait rien quand la session n’est pas prête (aucun crash)', async () => {
    const { el, hook } = setup({ session: { ready: false } });
    await act(async () => { hook.result.current.play(); });
    expect(el.play).not.toHaveBeenCalled();
    expect(hook.result.current.isPlaying).toBe(false);
  });

  it('la navigation ±5 s est bornée et n’altère aucun timing', () => {
    const { el, hook } = setup();
    act(() => { hook.result.current.seekTo(50); });
    expect(el.currentTime).toBe(50);
    act(() => { hook.result.current.seekBy(5); });
    expect(el.currentTime).toBe(55);
    act(() => { hook.result.current.seekBy(-100); });
    expect(el.currentTime).toBe(0);
    act(() => { hook.result.current.seekBy(10_000); });
    expect(el.currentTime).toBe(200); // borné à la durée
  });

  it('expose les deux horloges via le mapping de l’étape 4', () => {
    const { hook } = setup();
    act(() => { hook.result.current.seekTo(10.75); });
    expect(hook.result.current.localTime).toBeCloseTo(10.75, 6);
    expect(hook.result.current.canonicalTime).toBeCloseTo(12.5, 6);
  });

  it('sans calibration, le temps canonique reste null', () => {
    const { hook } = setup({ props: { offsetSeconds: null } });
    act(() => { hook.result.current.seekTo(10) });
    expect(hook.result.current.canonicalTime).toBe(null);
  });

  it('la vitesse de lecture est appliquée à l’élément', () => {
    const { el, hook } = setup();
    act(() => { hook.result.current.setRate(0.5); });
    expect(el.playbackRate).toBe(0.5);
    expect(hook.result.current.rate).toBe(0.5);
  });
});

describe('C. réécoute de frase et boucle', () => {
  const window_ = { localSeek: 8, localStop: 11.5, canonicalStart: 10, canonicalEnd: 13 };

  it('démarre à la position mappée', async () => {
    const { el, hook } = setup();
    await act(async () => { hook.result.current.reviewWindow(window_); });
    expect(el.currentTime).toBe(8);
    expect(el.play).toHaveBeenCalled();
  });

  it('s’arrête à la fin mappée quand la boucle est désactivée', () => {
    const { el, hook } = setup();
    act(() => { hook.result.current.reviewWindow(window_); });
    el.currentTime = 11.6;
    act(() => { rafCbs.forEach((cb) => cb()); });
    expect(el.pause).toHaveBeenCalled();
  });

  it('revient au début mappé quand la boucle est active', () => {
    const { el, hook } = setup();
    act(() => { hook.result.current.setLoop(true); });
    act(() => { hook.result.current.reviewWindow(window_); });
    el.currentTime = 11.6;
    act(() => { rafCbs.forEach((cb) => cb()); });
    expect(el.currentTime).toBe(8);
    expect(hook.result.current.isLoopEnabled).toBe(true);
  });

  it('la réécoute ne renvoie aucun timing : elle ne peut rien modifier', () => {
    const { hook } = setup();
    let r;
    act(() => { r = hook.result.current.reviewWindow(window_); });
    expect(r).toBeUndefined();
    expect(window_).toEqual({ localSeek: 8, localStop: 11.5, canonicalStart: 10, canonicalEnd: 13 });
  });

  it('une fenêtre absente (non calibré) ne lance rien', async () => {
    const { el, hook } = setup();
    await act(async () => { hook.result.current.reviewWindow(null); });
    expect(el.play).not.toHaveBeenCalled();
  });
});

describe('J. nettoyage des ressources', () => {
  it('retire tous ses écouteurs au démontage', () => {
    const { el, hook } = setup();
    expect(el.listenerCount()).toBeGreaterThan(0);
    hook.unmount();
    expect(el.listenerCount()).toBe(0);
  });

  it('annule l’animation frame au démontage', () => {
    const { hook } = setup();
    act(() => { hook.result.current.play(); });
    hook.unmount();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it('synchronise pause / ended / error venus de l’élément', () => {
    const { el, hook } = setup();
    act(() => { hook.result.current.play(); });
    act(() => { el.emit('pause'); });
    expect(hook.result.current.isPlaying).toBe(false);

    act(() => { hook.result.current.play(); });
    act(() => { el.emit('ended'); });
    expect(hook.result.current.isPlaying).toBe(false);
  });

  it('aucune mise à jour d’état après démontage (pas d’avertissement React)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { el, hook } = setup();
    act(() => { hook.result.current.play(); });
    hook.unmount();
    // Des événements tardifs de l'élément ne doivent plus rien déclencher.
    el.emit('pause');
    el.emit('ended');
    rafCbs.forEach((cb) => cb());
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('changer d’élément audio (remplacement de fichier) arrête la lecture', () => {
    const first = makeAudio();
    const { hook } = setup({ el: first });
    act(() => { hook.result.current.play(); });
    const second = makeAudio({ duration: 150 });
    act(() => {
      hook.rerender({
        session: { audioRef: { current: second }, ready: true, duration: 150, fileName: 'b.mp3' },
        offsetSeconds: null,
      });
    });
    expect(first.pause).toHaveBeenCalled();
    expect(hook.result.current.isPlaying).toBe(false);
    expect(first.listenerCount()).toBe(0); // écouteurs migrés vers le nouvel élément
  });
});
