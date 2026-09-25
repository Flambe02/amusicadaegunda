import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { averageColor, cardLayout, firstVerse, NEUTRAL_TINT, palcoLayout, CARD_MAX_H, CARD_MIN_H } from '../palco';

const WEEK = { id: 'w', title: 'Chanson da Semana', slug: 'semana', release_date: '2026-09-21', youtube_music_url: 'https://www.youtube.com/shorts/WWWWWWWWWWW' };
vi.mock('@/api/entities', () => ({ Song: { list: vi.fn(() => Promise.resolve([WEEK])) } }));

const { default: KaraokePalco } = await import('../KaraokePalco');

const LRC = '[00:01.00]\n[00:02.00]Tá chovendo de novo\n[00:05.00]Segunda linha';
const SONGS = [
  { id: 1, title: 'Tá Chovendo de Novo', slug: 'chuva', release_date: '2026-09-21', lrc_content: LRC },
  { id: 2, title: 'Europa Deu Vácuo', slug: 'europa', release_date: '2026-09-14', lrc_content: '' },
  { id: 3, title: 'Combo Master', slug: 'combo', release_date: '2026-06-01', lrc_content: LRC },
  { id: 4, title: 'Pix do Pão', slug: 'pix', release_date: '2026-05-01', lrc_content: LRC },
];

let reduceMotion = false;
beforeEach(() => {
  reduceMotion = false;
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes('reduce') ? reduceMotion : false, media: query,
    addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(),
  }));
});

let lastPath = '';
function Where() {
  const location = useLocation();
  lastPath = location.pathname + location.search;
  return null;
}

const renderPalco = (props = {}) => render(
  <MemoryRouter initialEntries={['/karaoke']}>
    <Where />
    <KaraokePalco songs={SONGS} onSing={vi.fn()} {...props} />
  </MemoryRouter>
);
const cards = () => [...document.querySelectorAll('[data-palco-carousel] li')];
const centerLabel = () => document.querySelector('[aria-current="true"]').getAttribute('aria-label');

describe('palco — pure helpers', () => {
  it('centre sharp; neighbours turned in depth at 55 % then 25 %; beyond: hidden', () => {
    expect(cardLayout(0)).toMatchObject({ visible: true, opacity: 1 });
    expect(cardLayout(0).transform).not.toMatch(/rotateY\(-?[1-9]/);
    expect(cardLayout(1)).toMatchObject({ opacity: 0.55 });
    expect(cardLayout(1).transform).toMatch(/rotateY\(-38deg\)/);
    expect(cardLayout(-1).transform).toMatch(/rotateY\(38deg\)/);
    expect(cardLayout(1).transform).toMatch(/-140px/);
    expect(cardLayout(2)).toMatchObject({ opacity: 0.25 });
    expect(cardLayout(3).visible).toBe(false);
  });

  it('reduced motion: cards simply offset, no rotation, no depth', () => {
    expect(cardLayout(1, true).transform).toBe('translate3d(78%, 0, 0)');
  });

  it('cards stay 9:16 between 120 × 213 and 150 × 267', () => {
    expect(CARD_MAX_H).toBe(267);
    expect(CARD_MIN_H).toBe(213);
    expect(Math.round((CARD_MAX_H * 9) / 16)).toBe(150);
    expect(Math.round((CARD_MIN_H * 9) / 16)).toBe(120);
  });

  it('when height runs short: hide the first verse first, then shrink the card, then go compact — never scroll', () => {
    expect(palcoLayout(300, 'full')).toBe('full'); // place pour une carte de 150 px
    expect(palcoLayout(250, 'full')).toBe('noVerse'); // le vers part d'abord
    expect(palcoLayout(280, 'noVerse')).toBe('noVerse'); // 250 en palier « full » : toujours sans vers
    expect(palcoLayout(300, 'noVerse')).toBe('full'); // assez de place : le vers revient
    expect(palcoLayout(170, 'full')).toBe('compact'); // même sans vers, < 213 : compact
    expect(palcoLayout(206, 'compact')).toBe('compact');
    expect(palcoLayout(270, 'compact')).toBe('noVerse'); // 222 sans le palier compact : il se lève
  });

  it('first verse = the first non-empty LRC line, or null', () => {
    expect(firstVerse(SONGS[0])).toBe('Tá chovendo de novo');
    expect(firstVerse(SONGS[1])).toBeNull();
    expect(firstVerse({})).toBeNull();
  });

  it('average colour skips near-black, near-white and transparent pixels', () => {
    const data = [0, 0, 0, 255, 255, 255, 255, 255, 200, 100, 50, 255, 100, 50, 0, 0];
    expect(averageColor(data)).toEqual([200, 100, 50]);
    expect(averageColor([0, 0, 0, 255])).toBeNull();
    expect(NEUTRAL_TINT).toHaveLength(3);
  });
});

describe('KaraokePalco', () => {
  it('header « Karaokê » / « O palco é seu », TV icon to /festa; no list, filters, search or surprise', () => {
    renderPalco();
    expect(screen.getByRole('heading', { level: 1, name: 'Karaokê' })).toBeInTheDocument();
    expect(screen.getByText('O palco é seu')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Festa na TV' })).toHaveAttribute('href', '/festa');
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByText(/me surpreenda|deixe a sorte/i)).toBeNull();
  });

  it('carousel of the published songs, newest first; centre = newest, announced on change', () => {
    renderPalco({ songs: [SONGS[3], SONGS[0], SONGS[2], SONGS[1]] });
    expect(cards()).toHaveLength(4);
    expect(centerLabel()).toBe('Cantar Tá Chovendo de Novo');
    fireEvent.click(screen.getByRole('button', { name: 'Próxima música' }));
    expect(centerLabel()).toBe('Cantar Europa Deu Vácuo');
    expect(document.querySelector('[data-palco] p[aria-live]').textContent).toMatch(/Europa Deu Vácuo, setembro 2026/);
  });

  it('under the carousel: month and year, title, first verse filling with yellow; no verse without lyrics', () => {
    renderPalco();
    expect(screen.getByText('setembro 2026')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Tá Chovendo de Novo' })).toBeInTheDocument();
    expect(document.querySelector('[data-palco-verse]')).toHaveTextContent('Tá chovendo de novo');
    expect(document.querySelector('[data-palco-verse]').className).toContain('palco-verse');
    fireEvent.click(screen.getByRole('button', { name: 'Próxima música' }));
    expect(document.querySelector('[data-palco-verse]')).toBeNull();
  });

  it('arrow keys and a tap on a side card move the carousel; the first card has no previous', () => {
    renderPalco();
    expect(screen.getByRole('button', { name: 'Música anterior' })).toBeDisabled();
    const region = document.querySelector('[data-palco-carousel]');
    fireEvent.keyDown(region, { key: 'ArrowRight' });
    expect(centerLabel()).toBe('Cantar Europa Deu Vácuo');
    fireEvent.keyDown(region, { key: 'ArrowLeft' });
    expect(centerLabel()).toBe('Cantar Tá Chovendo de Novo');
    fireEvent.click(cards()[2].querySelector('button'));
    expect(centerLabel()).toBe('Cantar Combo Master');
  });

  it('horizontal swipe past ~30 px changes song; never when it starts within 24 px of the left edge', () => {
    renderPalco();
    const region = document.querySelector('[data-palco-carousel]');
    fireEvent.pointerDown(region, { pointerId: 1, clientX: 12, clientY: 300 });
    fireEvent.pointerMove(region, { pointerId: 1, clientX: 150, clientY: 300 });
    fireEvent.pointerUp(region, { pointerId: 1 });
    expect(centerLabel()).toBe('Cantar Tá Chovendo de Novo');
    fireEvent.pointerDown(region, { pointerId: 2, clientX: 260, clientY: 300 });
    fireEvent.pointerMove(region, { pointerId: 2, clientX: 250, clientY: 300 });
    expect(centerLabel()).toBe('Cantar Tá Chovendo de Novo'); // sous le seuil
    fireEvent.pointerMove(region, { pointerId: 2, clientX: 220, clientY: 300 });
    fireEvent.pointerUp(region, { pointerId: 2 });
    expect(centerLabel()).toBe('Cantar Europa Deu Vácuo');
  });

  it('the yellow mic (76 px, only solid yellow) and the centre card open the karaoke of the centre song', () => {
    const onSing = vi.fn();
    renderPalco({ onSing });
    const mic = screen.getAllByRole('button', { name: 'Cantar Tá Chovendo de Novo' }).find((b) => b.className.includes('76px'));
    expect(mic.className).toContain('bg-app-yellow');
    expect(document.querySelectorAll('[data-palco] .bg-app-yellow')).toHaveLength(1);
    fireEvent.click(mic);
    expect(onSing).toHaveBeenLastCalledWith(SONGS[0]);
    fireEvent.click(document.querySelector('[aria-current="true"]'));
    expect(onSing).toHaveBeenCalledTimes(2);
  });

  it('reduced motion: no perspective, no transition', () => {
    reduceMotion = true;
    renderPalco();
    expect(document.querySelector('[data-palco-carousel]').style.perspective).toBe('none');
    expect(cards()[1].style.transition).toBe('none');
    expect(cards()[1].style.transform).toBe('translate3d(78%, 0, 0)');
  });

  it('degraded state: the week song alone, « O karaokê volta já » instead of the mic; the card leads to its Short', async () => {
    renderPalco({ songs: [], unavailable: true });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(cards()).toHaveLength(1);
    expect(screen.getByText('O karaokê volta já')).toBeInTheDocument();
    expect(document.querySelector('[data-palco] .bg-app-yellow')).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'Chanson da Semana' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver o clipe de Chanson da Semana' }));
    expect(lastPath).toBe('/?musica=semana');
  });
});
