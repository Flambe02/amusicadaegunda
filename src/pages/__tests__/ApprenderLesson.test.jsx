import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { getLearnLevel, setLearnLevel } from '@/lib/learnLevel';

const SONG = {
  id: 'song-1',
  slug: 'eu-sou-um-ovo',
  title: 'Eu Sou um Ovo',
  youtube_music_url: null,
  youtube_url: 'https://www.youtube.com/watch?v=abc123',
};

vi.mock('@/api/entities', () => ({
  Song: { getBySlug: vi.fn(() => Promise.resolve(SONG)) },
}));

// Écran principal réel = KaraokePlayer (déjà testé en détail dans
// KaraokePlayer.learningMode.test.jsx) — stub léger ici pour vérifier seulement
// que cette page le monte avec les bonnes props, sans dupliquer l'API YouTube.
vi.mock('@/components/karaoke/KaraokePlayer', () => ({
  default: ({ song, learningMode, translationLanguage, learningLevel, onLearningLevelChange, onClose }) => (
    <div data-testid="karaoke-player">
      <p>A cantar: {song.title}</p>
      <p>learningMode: {String(learningMode)}</p>
      <p>translationLanguage: {translationLanguage}</p>
      <p>learningLevel: {learningLevel}</p>
      <button type="button" onClick={() => onLearningLevelChange('advanced')}>Avançado</button>
      <button type="button" onClick={onClose}>Voltar</button>
    </div>
  ),
}));

import ApprenderLesson from '../ApprenderLesson';

function renderLesson(slug = 'eu-sou-um-ovo') {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/apprendre/${slug}`]}>
        <Routes>
          <Route path="/apprendre/:slug" element={<ApprenderLesson />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('ApprenderLesson — écran unique (Modo Aprender simplifié)', () => {
  it('monte directement le KaraokePlayer existant en learningMode, sans écran intermédiaire', async () => {
    renderLesson();
    const player = await screen.findByTestId('karaoke-player');
    expect(player).toHaveTextContent('A cantar: Eu Sou um Ovo');
    expect(player).toHaveTextContent('learningMode: true');
    expect(player).toHaveTextContent('translationLanguage: fr');
  });

  it('affiche un message d\'indisponibilité pour une chanson sans fiche', async () => {
    renderLesson('banco-master');
    expect(await screen.findByText(/música indisponível/i)).toBeInTheDocument();
    expect(screen.queryByTestId('karaoke-player')).not.toBeInTheDocument();
  });

  it('démarre avec le niveau beginner par défaut et le mémorise localement quand il change', async () => {
    const user = userEvent.setup();
    renderLesson();
    const player = await screen.findByTestId('karaoke-player');
    expect(player).toHaveTextContent('learningLevel: beginner');
    expect(getLearnLevel()).toBe('beginner');

    await user.click(screen.getByRole('button', { name: 'Avançado' }));
    expect(await screen.findByText('learningLevel: advanced')).toBeInTheDocument();
    expect(getLearnLevel()).toBe('advanced');
  });

  it('reprend le dernier niveau mémorisé à la visite suivante', async () => {
    setLearnLevel('intermediate');
    renderLesson();
    const player = await screen.findByTestId('karaoke-player');
    expect(player).toHaveTextContent('learningLevel: intermediate');
  });
});
