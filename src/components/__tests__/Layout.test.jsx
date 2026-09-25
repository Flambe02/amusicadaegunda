import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import Layout from '../../pages/Layout';

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

  it('shows Início, Karaokê, Pesquisa, Roda, Menu — and no Catálogo tab', () => {
    renderAt('/');
    const nav = mobileNav();
    const links = within(nav).getAllByRole('link');
    expect(links.map((a) => a.textContent)).toEqual(['Início', 'Karaokê', 'Pesquisa', 'Roda']);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/', '/karaoke', '/search', '/roda']);
    expect(within(nav).getByRole('button', { name: /menu/i })).toBeInTheDocument();
    expect(within(nav).queryByText(/catálogo/i)).toBeNull();
  });

  it('keeps /musica reachable from the Menu sheet as « Todas as músicas »', () => {
    renderAt('/');
    fireEvent.click(within(mobileNav()).getByRole('button', { name: /menu/i }));
    const dialog = screen.getByRole('dialog');
    const row = within(dialog).getByRole('link', { name: /todas as músicas/i });
    expect(row).toHaveAttribute('href', '/musica');
    expect(within(row).getByText('O arquivo completo, semana a semana')).toBeInTheDocument();
  });

  it('closes the Menu sheet with Escape', () => {
    renderAt('/');
    fireEvent.click(within(mobileNav()).getByRole('button', { name: /menu/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each([
    ['/search', 'Pesquisa'],
    ['/roda', 'Roda'],
  ])('marks %s active in the bottom nav', (path, label) => {
    renderAt(path);
    const active = within(mobileNav())
      .getAllByRole('link')
      .filter((a) => a.getAttribute('aria-current') === 'page');
    expect(active.map((a) => a.textContent)).toEqual([label]);
  });

  it.each(['/musica', '/musica/ta-chovendo-de-novo', '/blog', '/sobre'])(
    'lights the Menu tab (no other tab) on %s',
    (path) => {
      renderAt(path);
      const nav = mobileNav();
      expect(within(nav).queryAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page')).toHaveLength(0);
      expect(within(within(nav).getByRole('button', { name: /menu/i })).getByText('Menu')).toHaveClass('text-app-yellow');
    }
  );

  it('uses an opaque #050505 bar (no translucency, no blur)', () => {
    renderAt('/');
    const nav = mobileNav();
    expect(nav).toHaveClass('bg-app-black');
    expect(nav.className).not.toMatch(/backdrop-blur|bg-app-surface/);
  });

  it.each([
    ['/', 'overlay'],
    ['/karaoke', 'solid'],
    ['/search', 'solid'],
    ['/sobre', 'hidden'],
  ])('header on %s is « %s »', (path, mode) => {
    renderAt(path);
    expect(mobileShell().querySelector('header')).toHaveAttribute('data-mobile-header', mode);
  });

  it('makes the header transparent only on Início', () => {
    renderAt('/');
    const header = mobileShell().querySelector('header');
    expect(header.className).toMatch(/pointer-events-none/);
    expect(header.className).not.toMatch(/bg-black|backdrop-blur|border-b/);
  });
});
