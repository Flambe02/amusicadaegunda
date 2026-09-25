import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import Layout from '../../pages/Layout';
import { useShell } from '@/components/mobile/ShellContext';

// Mock environment variables
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
      update: vi.fn(() => Promise.resolve({ data: [], error: null })),
      delete: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  },
}));

// Catalogue lu par le panneau de recherche (onglet Buscar).
vi.mock('@/api/entities', () => ({ Song: { list: vi.fn(() => Promise.resolve([])) } }));

// Mock window.matchMedia pour les tests
beforeEach(() => {
  // Mock environment variables
  import.meta.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
  import.meta.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('Layout', () => {
  it('should render navigation menu', () => {
    render(
      <BrowserRouter>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </BrowserRouter>
    );

    const homeLabels = screen.getAllByText('Início');
    expect(homeLabels.length).toBeGreaterThan(0);
    const aboutLabels = screen.getAllByText('Sobre');
    expect(aboutLabels.length).toBeGreaterThan(0);
  });

  it('should render children content', () => {
    render(
      <BrowserRouter>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </BrowserRouter>
    );

    // Le Layout rend le contenu deux fois (mobile et desktop), même si l'un est caché
    // Utiliser getAllByText pour accepter les deux instances
    const contentElements = screen.getAllByText('Test Content');
    expect(contentElements.length).toBeGreaterThan(0);
    expect(contentElements[0]).toBeInTheDocument();
  });

  // Le redesign du catalogue karaokê (Karaoke.jsx) ne touche ni Layout.jsx ni la nav —
  // ce test verrouille que « Karaokê » reste bien marqué actif sur /karaoke, mobile
  // (AppBottomNav) et desktop (sidebar), sans rien changer ici.
  it('marks Karaokê active in both navs on /karaoke', () => {
    render(
      <MemoryRouter initialEntries={['/karaoke']}>
        <Layout>
          <div>Conteúdo</div>
        </Layout>
      </MemoryRouter>
    );

    const karaokeLinks = screen.getAllByRole('link', { name: /karaok/i });
    expect(karaokeLinks.length).toBeGreaterThan(0);
    const active = karaokeLinks.filter((el) => el.getAttribute('aria-current') === 'page');
    expect(active.length).toBeGreaterThan(0);
  });
});


// ── Shell mobile (< 768 px) — refonte étape 2 ─────────────────────────────────────────
// Le Layout rend mobile ET desktop ; on cible l'arbre mobile via #main-mobile.
describe('Layout — shell mobile', () => {
  const renderAt = (path) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Layout>
          <div>Conteúdo</div>
        </Layout>
      </MemoryRouter>
    );

  const mobileShell = () => document.querySelector('#main-mobile').parentElement;
  const mobileNav = () => mobileShell().querySelector('nav');

  it('has exactly 5 items, in order: Início, Karaokê, [Caipivara], Buscar, Menu (no Pesquisa, no Roda)', () => {
    renderAt('/');
    const nav = mobileNav();
    const tabs = [...nav.querySelectorAll('li > a, li > button')];
    expect(tabs.map((el) => el.getAttribute('aria-label') || el.textContent)).toEqual(['Início', 'Karaokê', 'Catálogo', 'Buscar', 'Menu']);
    expect(tabs.slice(0, 3).map((a) => a.getAttribute('href'))).toEqual(['/', '/karaoke', '/catalogo']);
    // Buscar ouvre le panneau de recherche, Menu ouvre la feuille : deux boutons.
    expect(tabs[3].tagName).toBe('BUTTON');
    expect(tabs[4].tagName).toBe('BUTTON');
    expect(within(nav).queryByText(/pesquisa|roda/i)).toBeNull();
  });

  it('centre: the Caipivara face in a yellow pill, no label, aria-label « Catálogo » — the only yellow of the bar', () => {
    renderAt('/');
    const nav = mobileNav();
    const pill = within(nav).getByRole('link', { name: 'Catálogo' });
    expect(pill.textContent).toBe('');
    expect(pill.querySelector('img').getAttribute('src')).toContain('caipivara-3d-head');
    const badge = pill.querySelector('span');
    expect(badge.className).toMatch(/h-\[34px\] w-\[46px\]/);
    expect(badge.className).toContain('bg-app-yellow');
    expect(nav.querySelectorAll('[class*="yellow"]')).toHaveLength(1);
  });

  it('active tab: filled white icon + bold label; inactive: outline icon, 60 % white', () => {
    renderAt('/');
    const nav = mobileNav();
    const home = within(nav).getByRole('link', { name: 'Início' });
    expect(home).toHaveAttribute('aria-current', 'page');
    expect(within(home).getByText('Início').className).toMatch(/font-bold/);
    expect(within(home).getByText('Início').className).toMatch(/text-white(?!\/)/);
    expect(home.querySelector('svg').getAttribute('fill')).toBe('currentColor');
    const karaoke = within(nav).getByRole('link', { name: 'Karaokê' });
    expect(within(karaoke).getByText('Karaokê').className).toMatch(/text-white\/60/);
    expect(karaoke.querySelector('svg').getAttribute('fill')).toBe('none'); // lucide, en contour
  });

  it('keeps /musica reachable from the Menu sheet as « Todas as músicas »', () => {
    renderAt('/');
    fireEvent.click(within(mobileNav()).getByRole('button', { name: /menu/i }));
    const dialog = screen.getByRole('dialog');
    const row = within(dialog).getByRole('link', { name: /todas as músicas/i });
    expect(row).toHaveAttribute('href', '/musica');
    expect(within(row).getByText('O arquivo completo, semana a semana')).toBeInTheDocument();
  });

  it('Buscar opens the search panel on the current page, focuses the field, and is never active', async () => {
    renderAt('/karaoke');
    const buscar = within(mobileNav()).getByRole('button', { name: 'Buscar' });
    expect(buscar).not.toHaveAttribute('aria-current');
    expect(within(buscar).getByText('Buscar').className).toMatch(/text-white\/60/);
    fireEvent.click(buscar);
    const field = await screen.findByRole('searchbox', { name: /buscar por título ou letra/i });
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    await waitFor(() => expect(field).toHaveFocus());
    // Pas de changement de page : Karaokê reste l'onglet actif (masqué aux lecteurs
    // d'écran derrière le panneau modal, d'où `hidden: true`).
    expect(within(mobileNav()).getByRole('link', { name: 'Karaokê', hidden: true })).toHaveAttribute('aria-current', 'page');
  });

  it('closes the Menu sheet with Escape', () => {
    renderAt('/');
    fireEvent.click(within(mobileNav()).getByRole('button', { name: /menu/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each(['/catalogo', '/musica', '/musica/ta-chovendo-de-novo', '/categoria/politica', '/arquivo/2025'])(
    'lights the Catálogo tab on %s',
    (path) => {
      renderAt(path);
      const active = within(mobileNav())
        .getAllByRole('link')
        .filter((a) => a.getAttribute('aria-current') === 'page');
      expect(active.map((a) => a.getAttribute('aria-label'))).toEqual(['Catálogo']);
      // Pastille active : léger contour blanc.
      expect(active[0].querySelector('span').className).toMatch(/ring-white/);
    }
  );

  it.each(['/blog', '/sobre', '/festa', '/apprendre'])(
    'lights the Menu tab (no other tab) on %s',
    (path) => {
      renderAt(path);
      const nav = mobileNav();
      expect(within(nav).queryAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page')).toHaveLength(0);
      const menu = within(nav).getByRole('button', { name: /menu/i });
      expect(menu).toHaveAttribute('data-active', 'true');
      expect(within(menu).getByText('Menu')).toHaveClass('font-bold', 'text-white');
    }
  );

  it('uses a pure black bar with a very discreet top rule (no translucency, no blur, no shadow)', () => {
    renderAt('/');
    const nav = mobileNav();
    expect(nav).toHaveClass('bg-black', 'border-t', 'border-white/10');
    expect(nav.className).not.toMatch(/backdrop-blur|bg-app-surface|shadow/);
  });

  it.each(['/', '/karaoke', '/catalogo', '/blog'])(
    'has no « i » button in the mobile header on %s (the Menu tab replaces it)',
    (path) => {
      renderAt(path);
      const header = mobileShell().querySelector('header');
      expect(within(header).queryByRole('link', { name: 'Sobre o projeto' })).toBeNull();
      expect(header.querySelector('img')).not.toBeNull(); // Caipivara conservée
      expect(within(header).getByText('A Música da Segunda')).toBeInTheDocument();
    }
  );

  it.each([
    ['/', 'overlay'],
    ['/karaoke', 'solid'],
    ['/search', 'solid'],
    ['/sobre', 'hidden'],
  ])('header on %s is « %s »', (path, mode) => {
    renderAt(path);
    expect(mobileShell().querySelector('header')).toHaveAttribute('data-mobile-header', mode);
  });

  it('shows the fixed 3D Caipivara (not the old mic logo) in the mobile header', () => {
    renderAt('/');
    const img = mobileShell().querySelector('header img');
    expect(img.getAttribute('src')).toBe('/images/caipivara-3d-head-128.webp');
    expect(img.tagName).toBe('IMG');
  });

  it('makes the header transparent only on Início', () => {
    renderAt('/');
    const header = mobileShell().querySelector('header');
    expect(header.className).toMatch(/pointer-events-none/);
    expect(header.className).not.toMatch(/bg-black|backdrop-blur|border-b/);
  });
});

// Layout rend ses enfants deux fois ; chaque copie doit savoir où elle vit, pour que
// ce qui coûte (iframe YouTube du feed) ne soit monté que dans la coquille mobile.
describe('Layout — ShellContext', () => {
  function WhereAmI() {
    return <span data-testid="shell">{useShell()}</span>;
  }

  it('tells each copy of the page which shell it is in', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Layout>
          <WhereAmI />
        </Layout>
      </MemoryRouter>
    );
    const shells = screen.getAllByTestId('shell').map((el) => el.textContent).sort();
    expect(shells).toEqual(['desktop', 'mobile']);
    expect(document.querySelector('#main-mobile [data-testid="shell"]').textContent).toBe('mobile');
    expect(document.querySelector('#main-desktop [data-testid="shell"]').textContent).toBe('desktop');
  });
});
