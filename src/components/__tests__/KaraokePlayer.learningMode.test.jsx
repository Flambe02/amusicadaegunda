import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readEntries } from '@/lib/vocabNotebook';
import { OVO_SONG } from '@/lib/__tests__/fixtures/pilotSongs';

/**
 * Modo Aprender simplifié v2 (« chanson + niveau + karaokê + traduction + 3
 * découvertes ») — `learningMode`/`learningLevel` du KaraokePlayer. Complète (sans le
 * modifier) KaraokePlayer.translation.learn.test.jsx, qui reste le garde-fou de
 * non-régression du comportement HISTORIQUE (learningMode absent/false).
 */

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

// t=0.5s → ligne 0 active ("Eu sou um ovo"), qui porte la découverte "eu-sou" (beginner).
const SONG = { ...OVO_SONG, youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' };

async function startPlayer(user) {
  const start = await screen.findByRole('button', { name: /escutar & aprender|começar/i });
  await waitFor(() => expect(start).toBeEnabled());
  await user.click(start);
}


describe('KaraokePlayer — learningMode (v2, niveaux + zone basse)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('affiche le sélecteur de niveau et l\'aperçu des 3 découvertes AVANT de lancer', async () => {
    globalThis.__stableApi = { YT: { Player: makeFakePlayer(0.5) }, ready: true, error: null };
    render(<KaraokePlayer song={SONG} onClose={() => {}} learningMode translationLanguage="fr" learningLevel="beginner" />);

    expect(await screen.findByText('Hoje vais descobrir')).toBeInTheDocument();
    expect(screen.getByText('EU SOU')).toBeInTheDocument();
    expect(screen.getByText('EU TENHO')).toBeInTheDocument();
    expect(screen.getByText('NÃO TEM')).toBeInTheDocument();
    // Pas les découvertes d'un autre niveau.
    expect(screen.queryByText('CADÊ')).not.toBeInTheDocument();
  });

  it('changer de niveau sur l\'écran d\'intro recalcule instantanément l\'aperçu', async () => {
    globalThis.__stableApi = { YT: { Player: makeFakePlayer(0.5) }, ready: true, error: null };
    const onLearningLevelChange = vi.fn();
    const { rerender } = render(
      <KaraokePlayer song={SONG} onClose={() => {}} learningMode translationLanguage="fr" learningLevel="beginner" onLearningLevelChange={onLearningLevelChange} />,
    );
    const user = userEvent.setup();
    await screen.findByText('Hoje vais descobrir');

    await user.click(screen.getByRole('button', { name: /avançado/i }));
    expect(onLearningLevelChange).toHaveBeenCalledWith('advanced');

    // Le composant est contrôlé : c'est l'appelant qui doit repasser la nouvelle prop.
    rerender(<KaraokePlayer song={SONG} onClose={() => {}} learningMode translationLanguage="fr" learningLevel="advanced" onLearningLevelChange={onLearningLevelChange} />);
    expect(await screen.findByText('NÃO TEM TEMPERO')).toBeInTheDocument();
    expect(screen.queryByText('EU SOU')).not.toBeInTheDocument();
  });

  it('force a tradução FR même quand les préférences globales du karaokê sont translate=off', async () => {
    globalThis.__stableApi = { YT: { Player: makeFakePlayer(0.5) }, ready: true, error: null };
    localStorage.setItem('karaoke-opts-v1', JSON.stringify({ translate: 'off' }));

    const user = userEvent.setup();
    render(<KaraokePlayer song={SONG} onClose={() => {}} learningMode translationLanguage="fr" learningLevel="beginner" />);
    await startPlayer(user);

    await waitFor(() => {
      expect(screen.getByText('Je suis un œuf')).toBeInTheDocument();
    }, { timeout: 3000 });

    const stored = JSON.parse(localStorage.getItem('karaoke-opts-v1'));
    expect(stored.translate).toBe('off'); // jamais persisté — pas de fuite vers le karaokê normal
  });

  it('affiche la découverte automatiquement dans la zone basse, sans tap requis', async () => {
    globalThis.__stableApi = { YT: { Player: makeFakePlayer(0.5) }, ready: true, error: null };
    const user = userEvent.setup();
    render(<KaraokePlayer song={SONG} onClose={() => {}} learningMode translationLanguage="fr" learningLevel="beginner" />);
    await startPlayer(user);

    // Généreux : la fiche est chargée via un vrai import() dynamique (non mocké),
    // qui peut prendre plus de temps sous charge (suite complète) qu'en isolation.
    await screen.findByText('💡 Entender', {}, { timeout: 9000 });
    const zone = screen.getByTestId('learning-zone');
    // Découpage mot à mot (breakdown), scopé à la zone (le mot actif du karaokê
    // affiche aussi "sou" ailleurs dans le DOM — pas d'ambiguïté ici).
    expect(within(zone).getByText('eu')).toBeInTheDocument();
    expect(within(zone).getByText('sou')).toBeInTheDocument();
    expect(within(zone).getByText('je')).toBeInTheDocument();
    expect(within(zone).getByText('suis')).toBeInTheDocument();

    // Rencontrée = ajoutée automatiquement au carnet (plus besoin d'un tap séparé).
    await waitFor(() => {
      const entries = readEntries();
      expect(entries.some((e) => e.expressionId === 'eu-sou' && e.songSlug === 'eu-sou-um-ovo')).toBe(true);
    });
  }, 12000);

  it('la mini-interaction accepte n\'importe quel choix, sans mauvaise réponse', async () => {
    globalThis.__stableApi = { YT: { Player: makeFakePlayer(0.5) }, ready: true, error: null };
    const user = userEvent.setup();
    render(<KaraokePlayer song={SONG} onClose={() => {}} learningMode translationLanguage="fr" learningLevel="beginner" />);
    await startPlayer(user);
    // Généreux : la fiche est chargée via un vrai import() dynamique (non mocké),
    // qui peut prendre plus de temps sous charge (suite complète) qu'en isolation.
    await screen.findByText('💡 Entender', {}, { timeout: 9000 });
    const zone = screen.getByTestId('learning-zone');

    await user.click(within(zone).getByRole('button', { name: "j'ai" }));
    expect(await within(zone).findByText(/isso! eu sou = je suis/i)).toBeInTheDocument();
  }, 12000);

  it('masque le sélecteur de langue du Mixer en learningMode (pas de fuite possible)', async () => {
    globalThis.__stableApi = { YT: { Player: makeFakePlayer(0.5) }, ready: true, error: null };
    const user = userEvent.setup();
    render(<KaraokePlayer song={SONG} onClose={() => {}} learningMode translationLanguage="fr" learningLevel="beginner" />);
    await startPlayer(user);

    await user.click(screen.getAllByRole('button', { name: /abrir mixer/i })[0]);
    expect(screen.queryByText('Tradução')).not.toBeInTheDocument();
  });

  it('sans learningMode (comportement historique) : bouton « Começar », pas de FR par défaut, pas de zone basse', async () => {
    globalThis.__stableApi = { YT: { Player: makeFakePlayer(0.5) }, ready: true, error: null };
    localStorage.setItem('karaoke-opts-v1', JSON.stringify({ translate: 'off' }));

    const user = userEvent.setup();
    render(<KaraokePlayer song={SONG} onClose={() => {}} />);
    expect(await screen.findByRole('button', { name: /^começar$/i })).toBeInTheDocument();
    expect(screen.queryByText('Hoje vais descobrir')).not.toBeInTheDocument();
    await startPlayer(user);

    expect(screen.queryByText('Je suis un œuf')).not.toBeInTheDocument();
    expect(screen.queryByTestId('learning-zone')).not.toBeInTheDocument();
  });
});
