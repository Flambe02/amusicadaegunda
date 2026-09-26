import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

/**
 * Étape 7 — écran de lecture de l'onglet Karaokê mobile (`mobileShell`, passé
 * uniquement par la copie mobile de /karaoke). Vérifie le restyle ET que, sans cette
 * prop (desktop), le lecteur reste strictement l'ancien.
 */

// ── Faux lecteur YouTube : prêt tout de suite, lecture à t = 5 s ──
const seekCalls = [];
class FakePlayer {
  constructor(el, cfg) {
    this.cfg = cfg;
    setTimeout(() => cfg.events?.onReady?.(), 0);
  }

  getCurrentTime() { return 5; }
  getPlayerState() { return 1; }
  getPlaybackRate() { return 1; }
  getDuration() { return 100; }
  setPlaybackRate() {}
  setVolume() {}
  playVideo() { this.cfg.events?.onStateChange?.({ data: 1 }); }
  pauseVideo() {}
  seekTo(t) { seekCalls.push(t); }
  destroy() {}
}
const STABLE_API = { YT: { Player: FakePlayer }, ready: true, error: null };
vi.mock('@/hooks/useYouTubeIframeApi', () => ({ useYouTubeIframeApi: () => STABLE_API }));
vi.mock('@capacitor/app', () => ({ App: { addListener: () => Promise.reject(new Error('no native')) } }));

import KaraokePlayer from '../karaoke/KaraokePlayer';

const LRC = '[00:01.00]Linha um\n[00:03.00]Linha dois\n[00:06.00]Linha três\n[00:09.00]Linha quatro';
const SONG = {
  title: 'Tá Chovendo de Novo',
  youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  youtube_music_url: 'https://www.youtube.com/shorts/AAAAAAAAAAA',
  lrc_content: LRC,
};
// Chanson pilote du Modo Aprender (slug dérivé du titre : camarada-quer-cpf).
const LEARN_SONG = { ...SONG, title: 'Camarada Quer CPF' };

const renderPlayer = (props) => render(
  <MemoryRouter>
    <KaraokePlayer song={SONG} onClose={() => {}} {...props} />
  </MemoryRouter>
);

async function start(user) {
  const button = await screen.findByRole('button', { name: /começar/i });
  await waitFor(() => expect(button).toBeEnabled());
  await user.click(button);
}

beforeEach(() => { seekCalls.length = 0; });
afterEach(() => { localStorage.clear(); });

describe('KaraokePlayer — écran de lecture mobile (étape 7)', () => {
  it('leaves the bottom nav visible: the overlay stops above it, under the Buscar/Menu sheets', () => {
    renderPlayer({ mobileShell: true });
    const overlay = document.querySelector('.karaoke-overlay');
    expect(overlay).toHaveAttribute('data-karaoke-shell', 'mobile');
    expect(overlay.style.bottom).toBe('var(--app-nav-h, 0px)');
    expect(overlay.className).toContain('z-[150]'); // panneaux Buscar / Menu : z-200
    expect(overlay.className).not.toContain('z-[9999]');
  });

  it('« Começar » screen: the Short thumbnail as a 9:16 card, a white title, no violet spotlights; one yellow (the button)', async () => {
    renderPlayer({ mobileShell: true });
    const card = document.querySelector('[data-km-card]');
    expect(card).not.toBeNull();
    expect(card.querySelector('img').getAttribute('src')).toBe('https://i.ytimg.com/vi/AAAAAAAAAAA/oar2.jpg');
    const title = screen.getByRole('heading', { level: 1, name: SONG.title });
    expect(title.className).not.toContain('karaoke-neon');
    expect(title.className).toContain('text-white');
    expect(document.querySelector('.karaoke-spotlights')).toBeNull();
    expect(document.querySelector('.karaoke-clean-bg')).toBeNull();
    expect(document.querySelector('.km-m-backdrop img')).not.toBeNull();
    expect(await screen.findByRole('button', { name: /começar/i })).toHaveClass('bg-app-yellow');
  });

  it('live: control bar = previous line, pause, and no Aprender for a song without a Modo Aprender sheet', async () => {
    const user = userEvent.setup();
    renderPlayer({ mobileShell: true });
    await start(user);
    const footer = document.querySelector('[data-km-controls="mobile"]');
    expect(footer).not.toBeNull();
    const labels = within(footer).getAllByRole('button').map((b) => b.getAttribute('aria-label'));
    expect(labels).toEqual(['Voltar uma linha', expect.stringMatching(/Pausar música|Continuar música/)]);
    expect(within(footer).queryByRole('link', { name: /aprender/i })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Finalizar karaokê' })).toBeNull();
  });

  it('live: Aprender only for a song with a Modo Aprender sheet, leading to its lesson', async () => {
    const user = userEvent.setup();
    renderPlayer({ mobileShell: true, song: LEARN_SONG });
    await start(user);
    const footer = document.querySelector('[data-km-controls="mobile"]');
    expect(within(footer).getByRole('link', { name: /aprender/i })).toHaveAttribute('href', '/apprendre/camarada-quer-cpf');
  });

  it('lines: sung at 30 % white, the next one at 72 %, further ones at 40 %; « Linha anterior » seeks to the previous line', async () => {
    const user = userEvent.setup();
    renderPlayer({ mobileShell: true });
    await start(user);
    // t = 5 s → « Linha dois » active.
    await waitFor(() => expect(screen.getByText('Linha um').style.color).toBe('rgba(255, 255, 255, 0.3)'), { timeout: 3000 });
    expect(screen.getByText('Linha três').style.color).toBe('rgba(255, 255, 255, 0.72)');
    expect(screen.getByText('Linha quatro').style.color).toBe('rgba(255, 255, 255, 0.4)');
    seekCalls.length = 0;
    await user.click(screen.getByRole('button', { name: 'Voltar uma linha' }));
    expect(seekCalls[seekCalls.length - 1]).toBeCloseTo(0.8, 5); // « Linha um » − 0,2 s
  });

  it('ignored in learningMode (the Aprender lesson keeps its own screen)', () => {
    renderPlayer({ mobileShell: true, learningMode: true, translationLanguage: 'fr' });
    expect(document.querySelector('.karaoke-overlay')).not.toHaveAttribute('data-karaoke-shell');
    expect(document.querySelector('[data-km-card]')).toBeNull();
  });
});

describe('KaraokePlayer — sans mobileShell (desktop) : inchangé', () => {
  it('keeps the full-screen overlay, the neon title and the five controls', async () => {
    const user = userEvent.setup();
    renderPlayer();
    const overlay = document.querySelector('.karaoke-overlay');
    expect(overlay.className).toContain('z-[9999]');
    expect(overlay.style.bottom).toBe('');
    expect(screen.getByRole('heading', { level: 1, name: SONG.title }).className).toContain('karaoke-neon');
    expect(document.querySelector('[data-km-card]')).toBeNull();
    await start(user);
    const footer = document.querySelector('footer.km-controls');
    expect(footer).not.toHaveAttribute('data-km-controls');
    expect(within(footer).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Voltar 10 segundos', 'Repetir frase atual', expect.stringMatching(/Pausar música|Continuar música/), 'Abrir mixer', 'Finalizar karaokê',
    ]);
  });
});
