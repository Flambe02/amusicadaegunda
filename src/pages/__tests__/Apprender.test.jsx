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

describe('Apprender — landing simplifiée (« chanson + karaokê + 3 découvertes »)', () => {
  it('affiche le titre et la phrase de promesse en une ligne', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/aprenda português com as músicas/i);
    expect(screen.getByText(/escute\. entenda\. jogue com as expressões/i)).toBeInTheDocument();
  });

  it('met en avant Eu Sou um Ovo comme « música da semana » avec un lien direct vers la leçon', async () => {
    renderPage();
    const featuredHeading = await screen.findByRole('heading', { name: /música da semana/i });
    const featuredSection = featuredHeading.closest('section');
    const featuredLink = within(featuredSection).getByRole('link', { name: /eu sou um ovo/i });
    expect(featuredLink).toHaveAttribute('href', '/apprendre/eu-sou-um-ovo');
    // 3 découvertes par niveau × 3 niveaux (beginner/intermediate/advanced).
    expect(within(featuredLink).getByText(/9 coisas para descobrir/i)).toBeInTheDocument();
  });

  it('liste les deux chansons pilotes, chacune avec un lien direct vers la leçon et le total de découvertes (tous niveaux)', async () => {
    renderPage();

    const songsHeading = await screen.findByRole('heading', { name: /escolha uma música/i });
    const songsSection = songsHeading.closest('section');

    // Camarada Quer CPF : 3 (beginner) + 3 (intermediate) + 2 (advanced, contenu
    // insuffisant pour un 3ᵉ de qualité — assumé plutôt qu'inventé) = 8.
    const camarada = within(songsSection).getByRole('link', { name: /camarada quer cpf/i });
    expect(camarada).toHaveAttribute('href', '/apprendre/camarada-quer-cpf');
    expect(within(camarada).getByText(/8 coisas para descobrir/i)).toBeInTheDocument();

    // Eu Sou um Ovo : 3 par niveau × 3 niveaux = 9.
    const ovo = within(songsSection).getByRole('link', { name: /eu sou um ovo/i });
    expect(ovo).toHaveAttribute('href', '/apprendre/eu-sou-um-ovo');
    expect(within(ovo).getByText(/9 coisas para descobrir/i)).toBeInTheDocument();
  });

  it('n\'affiche ni niveau, ni durée, ni état de progression (MVP simplifié)', async () => {
    renderPage();
    await screen.findByRole('heading', { name: /escolha uma música/i });
    expect(screen.queryByText(/a1-a2/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/continuar/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/concluída/i)).not.toBeInTheDocument();
  });

  it('affiche la section de capture email', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /entra na beta/i })).toBeInTheDocument();
  });
});
