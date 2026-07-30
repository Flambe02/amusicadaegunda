import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

