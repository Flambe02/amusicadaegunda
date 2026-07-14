import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Test de régression : la pastille de traduction (mobile) doit apparaître quand
 * opts.translate = 'fr' et qu'une ligne est active — vérifie tout le chemin réel :
 * options localStorage → poll → displayIdx → effet de traduction → rendu .km-translation.
 */

// ── Mock YouTube IFrame API : player prêt immédiatement, lecture à t=5s ──
class FakePlayer {
  constructor(el, cfg) {
    this.cfg = cfg;
    setTimeout(() => cfg.events?.onReady?.(), 0);
  }

  getCurrentTime() { return 5; }
  getPlayerState() { return 1; } // playing
  getPlaybackRate() { return 1; }
  getDuration() { return 100; }
  setPlaybackRate() {}
  setVolume() {}
  playVideo() { this.cfg.events?.onStateChange?.({ data: 1 }); }
  pauseVideo() {}
  seekTo() {}
  destroy() {}
}

// Objet STABLE (identité constante entre renders) — comme le vrai hook (window.YT).
// Un objet recréé à chaque render recréerait le player et tuerait le poll (artefact).
const STABLE_API = { YT: { Player: FakePlayer }, ready: true, error: null };
vi.mock('@/hooks/useYouTubeIframeApi', () => ({
  useYouTubeIframeApi: () => STABLE_API,
}));

// Capacitor absent en test (comme le web pur).
vi.mock('@capacitor/app', () => ({ App: { addListener: () => Promise.reject(new Error('no native')) } }));

import KaraokePlayer from '../karaoke/KaraokePlayer';

const SONG = {
  title: 'Camarada Quer CPF',
  youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  lrc_content: '[00:01.00]Olá mundo\n[00:30.00]Segunda linha',
};

describe('KaraokePlayer — tradução (mobile)', () => {
  beforeEach(() => {
    localStorage.setItem('karaoke-opts-v1', JSON.stringify({ translate: 'fr' }));
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (String(url).includes('translate.googleapis.com')) {
        return Promise.resolve({ ok: true, json: async () => [[['BONJOUR LE MONDE', 'Olá mundo', null, null, 1]]] });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    }));
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('affiche la pastille de traduction après le démarrage', async () => {
    const user = userEvent.setup();
    render(<KaraokePlayer song={SONG} onClose={() => {}} />);

    // Écran d'intro → bouton Começar activé une fois le player prêt.
    const start = await screen.findByRole('button', { name: /começar/i });
    await waitFor(() => expect(start).toBeEnabled());
    await user.click(start);

    // Poll 120ms → displayIdx=0 (t=5s ≥ 1s) → effet de traduction → pastille rendue.
    await waitFor(() => {
      expect(screen.getByText('BONJOUR LE MONDE')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('bascule sur MyMemory quand Google échoue', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      const u = String(url);
      if (u.includes('translate.googleapis.com')) return Promise.reject(new Error('blocked'));
      if (u.includes('api.mymemory.translated.net')) {
        return Promise.resolve({ ok: true, json: async () => ({ responseData: { translatedText: 'FALLBACK OK' }, responseStatus: 200 }) });
      }
      return Promise.reject(new Error(`unexpected fetch: ${u}`));
    }));

    const user = userEvent.setup();
    render(<KaraokePlayer song={SONG} onClose={() => {}} />);

    const start = await screen.findByRole('button', { name: /começar/i });
    await waitFor(() => expect(start).toBeEnabled());
    await user.click(start);

    await waitFor(() => {
      expect(screen.getByText('FALLBACK OK')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
