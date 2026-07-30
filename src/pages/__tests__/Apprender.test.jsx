import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Apprender from '@/pages/Apprender';

const renderPage = () => render(
  <HelmetProvider>
    <MemoryRouter>
      <Apprender />
    </MemoryRouter>
  </HelmetProvider>,
);

describe('Apprender — landing bêta du Modo Aprender', () => {
  it('affiche le titre, la mention beta et la phrase de promesse', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/aprenda português brasileiro/i);
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText(/tradução linha a linha, karaokê/i)).toBeInTheDocument();
  });

  it('liste les deux chansons pilotes avec un lien vers leur page et leurs expressions', async () => {
    renderPage();

    const camarada = await screen.findByRole('link', { name: /camarada quer cpf/i });
    expect(camarada).toHaveAttribute('href', '/musica/camarada-quer-cpf');
    expect(within(camarada).getByText('CPF')).toBeInTheDocument();
    expect(within(camarada).getByText('jeitinho brasileiro')).toBeInTheDocument();
    expect(within(camarada).getByText('malandro')).toBeInTheDocument();

    const ovo = await screen.findByRole('link', { name: /eu sou um ovo/i });
    expect(ovo).toHaveAttribute('href', '/musica/eu-sou-um-ovo');
    expect(within(ovo).getByText('cadê')).toBeInTheDocument();
  });

  it('affiche la section de capture email', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /entra na beta/i })).toBeInTheDocument();
  });
});
