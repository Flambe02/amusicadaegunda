import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
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

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
});

