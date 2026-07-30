import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readEntries } from '@/lib/vocabNotebook';
import { CAMARADA_SONG } from '@/lib/__tests__/fixtures/pilotSongs';

/**
 * Modo Aprender (bêta) — la fiche curatée doit être PRIORITAIRE sur la traduction API
 * quand opts.translate='fr' et que la ligne active est couverte, sur les VRAIES paroles
 * LRC de Camarada Quer CPF (fixture extraite de Supabase — voir pilotSongs.js).
 *
 * Complète (sans le modifier) KaraokePlayer.translation.test.jsx, qui reste le garde-fou
 * de non-régression du chemin API existant.
 */

// ── Mock YouTube IFrame API : player prêt immédiatement, temps configurable par test ──
function makeFakePlayer(currentTime) {
  return class FakePlayer {
    constructor(el, cfg) {
      this.cfg = cfg;
      setTimeout(() => cfg.events?.onReady?.(), 0);
    }

    getCurrentTime() { return currentTime; }
    getPlayerState() { return 1; } // playing
    getPlaybackRate() { return 1; }
    getDuration() { return 200; }
    setPlaybackRate() {}
    setVolume() {}
    playVideo() { this.cfg.events?.onStateChange?.({ data: 1 }); }
    pauseVideo() {}
    seekTo() {}
    destroy() {}
  };
}

vi.mock('@/hooks/useYouTubeIframeApi', () => ({ useYouTubeIframeApi: () => globalThis.__stableApi }));
vi.mock('@capacitor/app', () => ({ App: { addListener: () => Promise.reject(new Error('no native')) } }));

import KaraokePlayer from '../karaoke/KaraokePlayer';

// Chanson pilote réelle, avec vidéo requise pour l'extraction d'ID (absente de la fixture).
const SONG = { ...CAMARADA_SONG, youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' };
const NON_PILOT_SONG = {
  title: 'Banco Master',
  youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  lrc_content: '[00:01.00]Frase qualquer\n[00:30.00]Outra frase',
};

async function startPlayer(user) {
  const start = await screen.findByRole('button', { name: /começar/i });
  await waitFor(() => expect(start).toBeEnabled());
  await user.click(start);
}

describe('KaraokePlayer — Modo Aprender : fiche prioritaire sur la ligne active', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('affiche la traduction curatée sans AUCUN appel API sur une ligne couverte', async () => {
    // t=21s → ligne 0 active ("Victor chegou no Brasil", 20.29 ≤ t < 23.10).
    globalThis.__stableApi = { YT: { Player: makeFakePlayer(21) }, ready: true, error: null };
    localStorage.setItem('karaoke-opts-v1', JSON.stringify({ translate: 'fr' }));
    const fetchSpy = vi.fn(() => Promise.reject(new Error('API ne doit jamais être appelée ici')));
    vi.stubGlobal('fetch', fetchSpy);

    const user = userEvent.setup();
    render(<KaraokePlayer song={SONG} onClose={() => {}} />);
    await startPlayer(user);

    await waitFor(() => {
      expect(screen.getByText('Victor est arrivé au Brésil')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Camarada est couverte à 100 % (62/62 lignes) : le préchargement de fond ne doit
    // jamais tomber sur une ligne non couverte → zéro appel réseau, même après un délai.
    await act(() => new Promise((r) => setTimeout(r, 300)));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('retombe sur l\'API pour une langue non couverte par la fiche (en), même sur une chanson pilote', async () => {
    globalThis.__stableApi = { YT: { Player: makeFakePlayer(21) }, ready: true, error: null };
    localStorage.setItem('karaoke-opts-v1', JSON.stringify({ translate: 'en' }));
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (String(url).includes('translate.googleapis.com')) {
        return Promise.resolve({ ok: true, json: async () => [[['VICTOR ARRIVED IN BRAZIL', 'Victor chegou no Brasil', null, null, 1]]] });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    }));

    const user = userEvent.setup();
    render(<KaraokePlayer song={SONG} onClose={() => {}} />);
    await startPlayer(user);

    await waitFor(() => {
      expect(screen.getByText('VICTOR ARRIVED IN BRAZIL')).toBeInTheDocument();
    }, { timeout: 3000 });
    // La traduction FR curatée ne doit JAMAIS fuiter quand la langue choisie est 'en'.
    expect(screen.queryByText('Victor est arrivé au Brésil')).not.toBeInTheDocument();
  });

  it('utilise l\'API pour une chanson sans fiche Modo Aprender (les 57 autres)', async () => {
    globalThis.__stableApi = { YT: { Player: makeFakePlayer(5) }, ready: true, error: null };
    localStorage.setItem('karaoke-opts-v1', JSON.stringify({ translate: 'fr' }));
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (String(url).includes('translate.googleapis.com')) {
        return Promise.resolve({ ok: true, json: async () => [[['PHRASE QUELCONQUE', 'Frase qualquer', null, null, 1]]] });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    }));

    const user = userEvent.setup();
    render(<KaraokePlayer song={NON_PILOT_SONG} onClose={() => {}} />);
    await startPlayer(user);

    await waitFor(() => {
      expect(screen.getByText('PHRASE QUELCONQUE')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('le tap sur la pastille collecte l\'expression de la ligne active dans le carnet', async () => {
    // t=24s → ligne 1 active ("Com jeitinho ensaiado", 23.10 ≤ t < 25.69), porteuse
    // de l'expression "jeitinho brasileiro" dans la fiche.
    globalThis.__stableApi = { YT: { Player: makeFakePlayer(24) }, ready: true, error: null };
    localStorage.setItem('karaoke-opts-v1', JSON.stringify({ translate: 'fr' }));
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('API ne doit jamais être appelée ici'))));

    const user = userEvent.setup();
    render(<KaraokePlayer song={SONG} onClose={() => {}} />);
    await startPlayer(user);

    await waitFor(() => {
      expect(screen.getByText('Avec un jeitinho bien répété')).toBeInTheDocument();
    }, { timeout: 3000 });

    const collectBtn = await screen.findByRole('button', {
      name: /guardar.*jeitinho brasileiro.*caderno/i,
    });
    await user.click(collectBtn);

    await waitFor(() => {
      const entries = readEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        expressionId: 'jeitinho',
        term: 'jeitinho brasileiro',
        songSlug: 'camarada-quer-cpf',
        review: 'to_review',
      });
    });

    // Accusé visuel bref (§6.3 : pas de modal bloquant).
    expect(screen.getByText('Guardado!')).toBeInTheDocument();

    // Idempotent : un second tap ne duplique pas l'entrée.
    await user.click(screen.getByRole('button', { name: /jeitinho|guardado/i }));
    expect(readEntries()).toHaveLength(1);
  });

  it('l\'expression collectée est visible immédiatement dans le caderno ouvert depuis le même lecteur', async () => {
    globalThis.__stableApi = { YT: { Player: makeFakePlayer(24) }, ready: true, error: null };
    localStorage.setItem('karaoke-opts-v1', JSON.stringify({ translate: 'fr' }));
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('API ne doit jamais être appelée ici'))));

    const user = userEvent.setup();
    render(<KaraokePlayer song={SONG} onClose={() => {}} />);
    await startPlayer(user);

    const collectBtn = await screen.findByRole('button', {
      name: /guardar.*jeitinho brasileiro.*caderno/i,
    }, { timeout: 3000 });
    await user.click(collectBtn);
    await waitFor(() => expect(readEntries()).toHaveLength(1));

    await user.click(screen.getByRole('button', { name: /abrir caderno de vocabulário/i }));
    const item = await screen.findByRole('listitem');
    expect(item).toHaveTextContent('jeitinho brasileiro');
    expect(item).toHaveTextContent('Camarada Quer CPF');
  });

  it('le bouton du caderno est absent sur une chanson sans fiche Modo Aprender', async () => {
    globalThis.__stableApi = { YT: { Player: makeFakePlayer(5) }, ready: true, error: null };
    localStorage.setItem('karaoke-opts-v1', JSON.stringify({ translate: 'off' }));

    const user = userEvent.setup();
    render(<KaraokePlayer song={NON_PILOT_SONG} onClose={() => {}} />);
    await startPlayer(user);

    // Confirme qu'on est bien en phase 'live' (les boutons d'en-tête n'existent
    // qu'à ce moment-là) sans dépendre du bouton mixer, dupliqué (en-tête + barre
    // basse mobile) et donc non fiable comme signal ici.
    await waitFor(() => {
      expect(screen.getByLabelText('Progresso da música')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /abrir caderno de vocabulário/i })).not.toBeInTheDocument();
  });
});
