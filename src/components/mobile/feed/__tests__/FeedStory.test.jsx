import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FeedOverlay from '../FeedOverlay';

vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const LRC = '[00:01.00]Olá\n[00:03.00]Mundo';
const SONG = {
  id: 7,
  title: 'Tá Chovendo de Novo',
  slug: 'ta-chovendo-de-novo',
  release_date: '2026-08-31',
  category: 'outros',
  description: 'O mês já virou o setembro mais chuvoso registrado na capital paulista.',
  lrc_content: LRC,
  karaoke_published: true,
};
const base = { phase: 'playing', isPlaying: true, getCurrentTime: () => 0, getDuration: () => 60, mute: vi.fn(), unmute: vi.fn(), seekTo: vi.fn() };
const muted = { ...base, isMuted: true, isSoundOn: false };
const sound = { ...base, isMuted: false, isSoundOn: true };

function renderOverlay(props = {}) {
  return render(
    <MemoryRouter>
      <FeedOverlay song={SONG} player={sound} onShowLyrics={vi.fn()} {...props} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(),
  }));
});

const railLabels = (container) =>
  [...container.querySelectorAll('[data-rail] > a, [data-rail] > button')].map((el) => el.getAttribute('aria-label'));

describe('Colonne droite — Som et História', () => {
  it('orders the rail: Letra, História, Cantar, Compartilhar — Som is no longer in it (top right)', () => {
    const { container } = renderOverlay();
    expect(screen.getByRole('button', { name: 'Silenciar' }).closest('[data-rail]')).toBeNull();
    expect(railLabels(container)).toEqual([
      'Ver a letra de Tá Chovendo de Novo',
      'Ler a história de Tá Chovendo de Novo',
      'Cantar Tá Chovendo de Novo no karaokê',
      'Compartilhar Tá Chovendo de Novo',
    ]);
  });

  it('TikTok style: filled 32 px icons straight on the video (no dark disc), 12 px semibold labels, ≥ 44 px targets', () => {
    const { container } = renderOverlay();
    const items = container.querySelectorAll('[data-rail] > a, [data-rail] > button');
    expect(items).toHaveLength(4);
    for (const item of items) {
      expect(item.className).toMatch(/min-h-\[44px\]/);
      expect(item.className).toMatch(/min-w-\[56px\]/);
      const svg = item.querySelector('svg');
      expect(svg.getAttribute('fill')).toBe('currentColor');
      expect(svg.getAttribute('class')).toMatch(/h-8 w-8/);
      expect(svg.getAttribute('class')).toContain('drop-shadow');
      expect(svg.parentElement).toBe(item); // pas de rond sombre autour
      const label = item.querySelector('span[aria-hidden]');
      expect(label.className).toMatch(/text-xs font-semibold/);
    }
    expect(container.querySelector('[data-rail] [class*="bg-black"], [data-rail] [class*="rounded-full"]')).toBeNull();
  });

  it('sound off: no « Silenciar »; the crossed-out speaker (Ativar o som) sits top right, outside the rail', () => {
    const { container } = renderOverlay({ player: muted });
    expect(railLabels(container)[0]).toBe('Ver a letra de Tá Chovendo de Novo');
    expect(screen.queryByRole('button', { name: 'Silenciar' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ativar o som' }).closest('[data-rail]')).toBeNull();
  });

  it('never shows an empty História button: no description (or only spaces) → no button', () => {
    const { unmount } = renderOverlay({ song: { ...SONG, description: '' } });
    expect(screen.queryByRole('button', { name: /história/i })).toBeNull();
    unmount();
    renderOverlay({ song: { ...SONG, description: '   ' } });
    expect(screen.queryByRole('button', { name: /história/i })).toBeNull();
  });

  it('opens a sheet with title, month and year, theme, the description and a link to the song page', async () => {
    renderOverlay();
    fireEvent.click(screen.getByRole('button', { name: /ler a história/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Tá Chovendo de Novo')).toBeInTheDocument();
    expect(within(dialog).getByText('agosto 2026 · Outros')).toBeInTheDocument();
    expect(within(dialog).getByText(SONG.description)).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Ver a página da música' })).toHaveAttribute('href', '/musica/ta-chovendo-de-novo/');
  });

  // jsdom : vaul garde le panneau monté jusqu'à la fin de son animation de sortie (jamais
  // déclenchée ici) → on vérifie l'état « closed ». Le piège du focus et le retour du
  // focus au bouton sont vérifiés dans un vrai navigateur (Playwright).
  it('closes with the close button and with Escape', async () => {
    renderOverlay();
    const trigger = screen.getByRole('button', { name: /ler a história/i });
    fireEvent.click(trigger);
    let dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fechar' }));
    await waitFor(() => expect(dialog).toHaveAttribute('data-state', 'closed'));

    fireEvent.click(trigger);
    dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog).toHaveAttribute('data-state', 'open'));
    await act(async () => { fireEvent.keyDown(dialog, { key: 'Escape' }); });
    await waitFor(() => expect(dialog).toHaveAttribute('data-state', 'closed'));
  });

  it('always shows the month and year in the sheet, even for the song of the week', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date('2026-09-24T15:00:00Z') });
    renderOverlay({ song: { ...SONG, release_date: '2026-09-21' } });
    fireEvent.click(screen.getByRole('button', { name: /ler a história/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('setembro 2026 · Outros')).toBeInTheDocument();
    expect(within(dialog).queryByText(/esta semana/i)).toBeNull();
    vi.useRealTimers();
  });

  it('puts no veil over the video behind the sheet', async () => {
    renderOverlay();
    fireEvent.click(screen.getByRole('button', { name: /ler a história/i }));
    await screen.findByRole('dialog');
    const overlay = document.querySelector('[data-vaul-overlay]');
    expect(overlay.className).toContain('bg-transparent');
    expect(overlay.className).not.toMatch(/bg-black|backdrop-blur/);
  });
});
