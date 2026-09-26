import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import MobileRedirect from '../MobileRedirect';
import { ShellContext } from '../ShellContext';

let mobile = true;
beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes('max-width: 767px') ? mobile : false,
    media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
});

function Where() {
  const location = useLocation();
  return <span data-testid="where">{location.pathname}</span>;
}

// L'élément testé est monté sur `path` ; les destinations ont leur propre contenu.
function renderRoute(path, element, shell = null) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellContext.Provider value={shell}>
        <Routes>
          <Route path={path} element={element} />
          <Route path="/catalogo" element={<p>Destino catálogo</p>} />
          <Route path="/musica" element={<p>Destino música</p>} />
          <Route path="*" element={null} />
        </Routes>
        <Where />
      </ShellContext.Provider>
    </MemoryRouter>
  );
}

describe('MobileRedirect (addendum catálogo §G.1–G.2)', () => {
  it.each(['/search', '/roda'])('below 768 px, %s leads to /catalogo without rendering the old page', (path) => {
    mobile = true;
    renderRoute(path, <MobileRedirect to="/catalogo"><p>Página antiga</p></MobileRedirect>);
    expect(screen.getByTestId('where')).toHaveTextContent('/catalogo');
    expect(screen.queryByText('Página antiga')).toBeNull();
  });

  it.each(['/search', '/roda'])('from 768 px, %s stays on the desktop page', (path) => {
    mobile = false;
    renderRoute(path, <MobileRedirect to="/catalogo"><p>Página desktop</p></MobileRedirect>);
    expect(screen.getByTestId('where')).toHaveTextContent(path);
    expect(screen.getByText('Página desktop')).toBeInTheDocument();
  });

  it('/catalogo goes to /musica on desktop, and stays on mobile', () => {
    mobile = false;
    const { unmount } = renderRoute('/catalogo', <MobileRedirect to="/musica" when="desktop"><p>Catálogo</p></MobileRedirect>);
    expect(screen.getByTestId('where')).toHaveTextContent('/musica');
    unmount();
    mobile = true;
    renderRoute('/catalogo', <MobileRedirect to="/musica" when="desktop"><p>Catálogo</p></MobileRedirect>);
    expect(screen.getByTestId('where')).toHaveTextContent('/catalogo');
    expect(screen.getByText('Catálogo')).toBeInTheDocument();
  });

  it('only the copy matching the viewport navigates (Layout renders pages twice)', () => {
    mobile = true;
    renderRoute('/search', <MobileRedirect to="/catalogo"><p>x</p></MobileRedirect>, 'desktop');
    expect(screen.getByTestId('where')).toHaveTextContent('/search'); // la copie desktop ne bouge pas
  });
});
