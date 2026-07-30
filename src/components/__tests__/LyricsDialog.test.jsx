import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LyricsDialog from '../LyricsDialog';

/**
 * Toggle Letra / Aprender / Ficha (§6.1 + brique Ficha de estudo). Vérifie le
 * câblage du 3e onglet sans re-tester le CONTENU de LearnPanel/StudySheetPanel
 * (déjà couverts par leurs propres suites) — juste que le bon panneau se monte.
 */

const PILOT_SONG = {
  title: 'Camarada Quer CPF',
  lyrics: 'Victor chegou no Brasil\nCom jeitinho ensaiado',
};

const NON_PILOT_SONG = {
  title: 'Banco Master',
  lyrics: 'Era pra ser um conto de fadas',
};

describe('LyricsDialog — toggle à 3 états sur une chanson pilote', () => {
  it('affiche Letra par défaut, et les trois onglets', () => {
    render(<LyricsDialog open onOpenChange={() => {}} song={PILOT_SONG} />);
    expect(screen.getByText(/victor chegou no brasil/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Letra' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Aprender' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ficha' })).toBeInTheDocument();
  });

  it('bascule vers Ficha et monte StudySheetPanel', async () => {
    const user = userEvent.setup();
    render(<LyricsDialog open onOpenChange={() => {}} song={PILOT_SONG} />);

    await user.click(screen.getByRole('button', { name: 'Ficha' }));
    expect(screen.getByRole('button', { name: 'Ficha' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText(/apprendre à utiliser le verbe virar/i)).toBeInTheDocument();
    // Les paroles brutes ne sont plus affichées en mode Ficha.
    expect(screen.queryByText('Victor chegou no Brasil')).not.toBeInTheDocument();
  });

  it('revenir à Letra après Ficha restaure les paroles brutes', async () => {
    const user = userEvent.setup();
    render(<LyricsDialog open onOpenChange={() => {}} song={PILOT_SONG} />);

    await user.click(screen.getByRole('button', { name: 'Ficha' }));
    await screen.findByText(/apprendre à utiliser le verbe virar/i);
    await user.click(screen.getByRole('button', { name: 'Letra' }));

    expect(screen.getByText(/victor chegou no brasil/i)).toBeInTheDocument();
  });
});

describe('LyricsDialog — chanson sans fiche', () => {
  it('n\'affiche aucun toggle, seulement les paroles', () => {
    render(<LyricsDialog open onOpenChange={() => {}} song={NON_PILOT_SONG} />);
    expect(screen.getByText('Era pra ser um conto de fadas')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aprender' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ficha' })).not.toBeInTheDocument();
  });
});
