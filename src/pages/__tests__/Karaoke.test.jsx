import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, useLocation } from 'react-router-dom';

// ── Mocks ──
const LRC = '[00:01.00]Olá\n[00:03.00]Mundo';

const SONGS = [
  { id: '1', title: 'Camarada Quer CPF', subtitle: 'Espião russo', category: 'internacional', release_date: '2026-07-06', lrc_content: LRC, difficulty: 'easy' },
  { id: '2', title: 'Independência ou Gol', subtitle: 'Brasil x Noruega', category: 'esporte', release_date: '2026-07-01', lrc_content: LRC, difficulty: 'medium' },
  { id: '3', title: 'Messi é o Melhor', subtitle: 'Ronaldo na roda', category: 'esporte', release_date: '2026-06-15', lrc_content: LRC, difficulty: 'hard' },
  // Non éligible : pas de LRC → ne doit jamais apparaître, même si difficulty='easy'.
  { id: '99', title: 'Sem Karaoke', subtitle: 'Sem letra', category: 'outros', release_date: '2026-05-01', lrc_content: null, difficulty: 'easy' },
];

vi.mock('@/api/entities', () => ({
  Song: { list: vi.fn(() => Promise.resolve(SONGS)) },
}));

// Lecteur plein écran : stub léger (évite l'API YouTube).
vi.mock('@/components/karaoke/KaraokePlayer', () => ({
  default: ({ song, mobileShell }) => (
    <div data-testid="karaoke-player" data-mobile-shell={mobileShell ? 'true' : 'false'}>A cantar: {song.title}</div>
  ),
}));

// Capacitor absent en test : le stub renvoie une promesse rejetée (comme le web pur).
vi.mock('@capacitor/app', () => ({ App: { addListener: () => Promise.reject(new Error('no native')) } }));

import KaraokePage from '../Karaoke';
import { ShellContext } from '@/components/mobile/ShellContext';

// La page vit sous le Router de l'app (elle lit ?musica=). `LocationProbe` expose
// l'URL courante pour vérifier que le paramètre est retiré après usage.
function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname + location.search}</span>;
}

function renderPage(path = '/karaoke') {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <KaraokePage />
        <LocationProbe />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('KaraokePage', () => {
  it('renders and shows only karaoke-eligible songs', async () => {
    renderPage();
    expect(await screen.findByText('Camarada Quer CPF')).toBeInTheDocument();
    expect(screen.getByText('Independência ou Gol')).toBeInTheDocument();
    expect(screen.queryByText('Sem Karaoke')).not.toBeInTheDocument();
    // compteur dynamique = 3 éligibles
    expect(screen.getByText(/3 músicas prontas para cantar/i)).toBeInTheDocument();
  });

  it('searches by title (accent-insensitive)', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Camarada Quer CPF');
    const input = screen.getByLabelText(/buscar música/i);
    await user.type(input, 'independencia');
    expect(screen.getByText('Independência ou Gol')).toBeInTheDocument();
    expect(screen.queryByText('Camarada Quer CPF')).not.toBeInTheDocument();
  });

  it('filters by theme (Tema dropdown)', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Camarada Quer CPF');
    await user.click(screen.getByRole('button', { name: /filtrar por tema/i }));
    await user.click(screen.getByRole('button', { name: 'Esporte' }));
    expect(screen.getByText('Independência ou Gol')).toBeInTheDocument();
    expect(screen.getByText('Messi é o Melhor')).toBeInTheDocument();
    expect(screen.queryByText('Camarada Quer CPF')).not.toBeInTheDocument();
  });

  it('filters by difficulty chip — Fácil', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Camarada Quer CPF');
    await user.click(screen.getByRole('button', { name: 'Fácil' }));
    expect(screen.getByText('Camarada Quer CPF')).toBeInTheDocument();
    expect(screen.queryByText('Independência ou Gol')).not.toBeInTheDocument();
    expect(screen.queryByText('Messi é o Melhor')).not.toBeInTheDocument();
  });

  it('filters by difficulty chip — Difícil', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Camarada Quer CPF');
    await user.click(screen.getByRole('button', { name: 'Difícil' }));
    expect(screen.getByText('Messi é o Melhor')).toBeInTheDocument();
    expect(screen.queryByText('Camarada Quer CPF')).not.toBeInTheDocument();
    expect(screen.queryByText('Independência ou Gol')).not.toBeInTheDocument();
  });

  it('combines search with the difficulty filter', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Camarada Quer CPF');
    const input = screen.getByLabelText(/buscar música/i);
    await user.type(input, 'roda'); // ne matche que "Messi é o Melhor" (subtitle: "Ronaldo na roda")
    await user.click(screen.getByRole('button', { name: 'Fácil' })); // mais Messi est Difícil
    expect(await screen.findByText(/nenhuma música encontrada/i)).toBeInTheDocument();
  });

  it('clears filters (theme + difficulty)', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Camarada Quer CPF');
    await user.click(screen.getByRole('button', { name: 'Difícil' }));
    expect(screen.queryByText('Camarada Quer CPF')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /limpar filtros/i }));
    expect(screen.getByText('Camarada Quer CPF')).toBeInTheDocument();
  });

  it('shows the empty state for a search with no matches', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Camarada Quer CPF');
    const input = screen.getByLabelText(/buscar música/i);
    await user.type(input, 'zzzznadaaqui');
    expect(await screen.findByText(/nenhuma música encontrada/i)).toBeInTheDocument();
    // Le filtre reste actif (barre de filtres) ET l'état vide propose sa propre action —
    // les deux affichent « Limpar filtros », donc au moins un doit être présent.
    expect(screen.getAllByRole('button', { name: /limpar filtros/i }).length).toBeGreaterThan(0);
  });

  it('opens the player when a card is selected', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Camarada Quer CPF');
    await user.click(screen.getByRole('button', { name: 'Cantar Camarada Quer CPF' }));
    expect(await screen.findByTestId('karaoke-player')).toHaveTextContent('Camarada Quer CPF');
  });

  it('opens the surprise modal and can close it', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Camarada Quer CPF');
    await user.click(screen.getByRole('button', { name: /me surpreenda/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/sua surpresa/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Fechar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('surprise "Cantar agora" opens the player via the same path as a card', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Camarada Quer CPF');
    await user.click(screen.getByRole('button', { name: /me surpreenda/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /cantar agora/i }));
    expect(await screen.findByTestId('karaoke-player')).toBeInTheDocument();
    // Desktop : le lecteur plein écran d'origine, sans le style mobile.
    expect(screen.getByTestId('karaoke-player')).toHaveAttribute('data-mobile-shell', 'false');
  });
});

describe('KaraokePage — mobile (O Palco) : écran de lecture (étape 7)', () => {
  it('the microphone opens the player in its mobile shell (bottom nav stays visible)', async () => {
    const previous = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('max-width: 767px'), media: query,
      addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(),
    }));
    try {
      const user = userEvent.setup();
      render(
        <HelmetProvider>
          <MemoryRouter initialEntries={['/karaoke']}>
            <ShellContext.Provider value="mobile">
              <KaraokePage />
            </ShellContext.Provider>
          </MemoryRouter>
        </HelmetProvider>,
      );
      // La carte centrale et le micro portent le même libellé : on prend le micro (76 px).
      const mic = (await screen.findAllByRole('button', { name: 'Cantar Camarada Quer CPF' }))
        .find((button) => button.className.includes('76px'));
      await user.click(mic);
      expect(await screen.findByTestId('karaoke-player')).toHaveAttribute('data-mobile-shell', 'true');
    } finally {
      window.matchMedia = previous;
    }
  });
});

describe('KaraokePage — lien direct ?musica= (bouton « Cantar » du feed mobile)', () => {
  it('opens the player of the requested song, then clears the parameter', async () => {
    renderPage('/karaoke?musica=independencia-ou-gol');
    expect(await screen.findByTestId('karaoke-player')).toHaveTextContent('A cantar: Independência ou Gol');
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^.karaoke$/));
  });

  it('shows the list, without a player, when the song has no published karaoke', async () => {
    renderPage('/karaoke?musica=sem-karaoke');
    expect(await screen.findByText('Camarada Quer CPF')).toBeInTheDocument();
    expect(screen.queryByTestId('karaoke-player')).toBeNull();
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^.karaoke$/));
  });
});

describe('KaraokePage — le point de rupture 768 px est suivi en direct', () => {
  it('crossing 768 px after mount switches the mobile copy to O Palco (and back), without a reload', async () => {
    const previous = window.matchMedia;
    let mobile = false;
    let listeners = [];
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      get matches() { return query.includes('max-width: 767px') ? mobile : false; },
      media: query,
      addEventListener: (_type, fn) => listeners.push(fn),
      removeEventListener: (_type, fn) => { listeners = listeners.filter((l) => l !== fn); },
      addListener: vi.fn(), removeListener: vi.fn(),
    }));
    const cross = (next) => act(() => { mobile = next; listeners.forEach((fn) => fn()); });
    try {
      const { container } = render(
        <HelmetProvider>
          <MemoryRouter initialEntries={['/karaoke']}>
            <ShellContext.Provider value="mobile">
              <KaraokePage />
            </ShellContext.Provider>
          </MemoryRouter>
        </HelmetProvider>,
      );
      // Monté en viewport desktop : le catalogue desktop.
      expect(await screen.findByText('Camarada Quer CPF')).toBeInTheDocument();
      expect(container.querySelector('[data-palco]')).toBeNull();
      // La fenêtre passe sous 768 px : O Palco, sans remonter la page.
      cross(true);
      await waitFor(() => expect(container.querySelector('[data-palco]')).not.toBeNull());
      // Et retour au-dessus de 768 px.
      cross(false);
      await waitFor(() => expect(container.querySelector('[data-palco]')).toBeNull());
    } finally {
      window.matchMedia = previous;
    }
  });
});
