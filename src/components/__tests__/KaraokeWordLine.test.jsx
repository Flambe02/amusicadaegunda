import { describe, it, expect } from 'vitest';
import { createRef } from 'react';
import { render } from '@testing-library/react';
import KaraokeWordLine from '../karaoke/KaraokeWordLine';

const WORDS = [
  { id: 'w1', text: 'Camarada', start: 12.4, end: 13.2 },
  { id: 'w2', text: 'quer', start: 13.2, end: 13.8 },
  { id: 'w3', text: 'CPF', start: 13.8, end: 15.2 },
];

describe('KaraokeWordLine', () => {
  it('renders one span per word without crashing', () => {
    const { container } = render(<KaraokeWordLine words={WORDS} />);
    const spans = container.querySelectorAll('.karaoke-wipe-word');
    expect(spans).toHaveLength(3);
    expect(spans[0]).toHaveTextContent('Camarada');
    expect(spans[2]).toHaveTextContent('CPF');
  });

  it('exposes an imperative setActive API that paints only the active word', () => {
    const ref = createRef();
    const { container } = render(<KaraokeWordLine ref={ref} words={WORDS} color="#111111" unsungColor="#222222" />);
    ref.current.setActive(1, 0.5);
    const spans = container.querySelectorAll('.karaoke-wipe-word');
    // Mot 0 (avant l'actif) = pleinement chanté (100%).
    expect(spans[0].style.backgroundImage).toContain('rgb(17, 17, 17) 100%');
    // Mot 1 (actif) = dégradé à 50%.
    expect(spans[1].style.backgroundImage).toContain('50%');
    // Mot 2 (futur) = 0%.
    expect(spans[2].style.backgroundImage).toContain('0%');
  });

  it('renders the prop-driven mode (admin preview) without a ref', () => {
    const { container } = render(<KaraokeWordLine words={WORDS} activeIndex={0} progress={0.25} />);
    const spans = container.querySelectorAll('.karaoke-wipe-word');
    expect(spans[0].style.backgroundImage).toContain('25%');
  });

  it('does not crash when words is empty', () => {
    const { container } = render(<KaraokeWordLine words={[]} />);
    expect(container.querySelectorAll('.karaoke-wipe-word')).toHaveLength(0);
  });

  // Régression : l'espace inter-mots ne doit PAS faire partie du <span> mesuré, sinon
  // un mot court ("O") se voit gonflé par la largeur de l'espace qui le suit et la
  // boule/bord de dégradé dépasse visuellement le mot avant la fin réelle de la syllabe.
  it('excludes the inter-word space from the measured word span (short-word regression)', () => {
    const shortWords = [
      { id: 'w1', text: 'O', start: 18.49, end: 18.6 },
      { id: 'w2', text: 'Brasil', start: 18.6, end: 20.65 },
      { id: 'w3', text: 'levantou', start: 20.65, end: 23.57 },
    ];
    const { container } = render(<KaraokeWordLine words={shortWords} />);
    const spans = container.querySelectorAll('.karaoke-wipe-word');
    expect(spans).toHaveLength(3);
    // Le contenu textContent du span EXACT ne doit contenir aucun espace de fin.
    expect(spans[0].textContent).toBe('O');
    expect(spans[1].textContent).toBe('Brasil');
  });
});
