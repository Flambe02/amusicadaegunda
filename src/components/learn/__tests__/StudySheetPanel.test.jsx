import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudySheetPanel from '@/components/learn/StudySheetPanel';

/**
 * Ficha de estudo — testée sur les VRAIES fiches des deux chansons pilotes (import
 * dynamique réel via loadLearnContent), pas des données inventées.
 */

describe('StudySheetPanel — Camarada Quer CPF', () => {
  it('affiche l\'objectif, la tournure du jour et les trois exercices', async () => {
    render(<StudySheetPanel slug="camarada-quer-cpf" />);

    expect(await screen.findByText(/apprendre à utiliser le verbe virar/i)).toBeInTheDocument();
    expect(screen.getByText('virar + nome')).toBeInTheDocument();
    expect(screen.getByText('virar brasileiro')).toBeInTheDocument();
    expect(screen.getByText('virar cria')).toBeInTheDocument();

    expect(screen.getByText('Ele quis ____ brasileiro.')).toBeInTheDocument();
    expect(screen.getByText('Sem ____, você não abre conta no banco.')).toBeInTheDocument();
    expect(screen.getByText('jeitinho brasileiro quer dizer:')).toBeInTheDocument();

    // Rien n'est coloré avant la correction.
    expect(screen.queryByText('Certo!')).not.toBeInTheDocument();
    expect(screen.queryByText('Errado.')).not.toBeInTheDocument();
  });

  it('rend l\'exercice AVEC distractors en choix à puces (réponse + distracteurs)', async () => {
    render(<StudySheetPanel slug="camarada-quer-cpf" />);
    await screen.findByText(/apprendre à utiliser le verbe virar/i);

    const group = screen.getByRole('group', { name: 'Ele quis ____ brasileiro.' });
    expect(within(group).getByRole('button', { name: 'virar' })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: 'ser' })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: 'estar' })).toBeInTheDocument();
  });

  it('rend l\'exercice SANS distractors en champ libre', async () => {
    render(<StudySheetPanel slug="camarada-quer-cpf" />);
    const input = await screen.findByLabelText('Sem ____, você não abre conta no banco.');
    expect(input.tagName).toBe('INPUT');
    expect(input).toHaveAttribute('type', 'text');
  });

  it('corrige les trois exercices d\'un seul tap, colore juste/faux, révèle la bonne réponse', async () => {
    const user = userEvent.setup();
    render(<StudySheetPanel slug="camarada-quer-cpf" />);
    await screen.findByText(/apprendre à utiliser le verbe virar/i);

    // Ex1 (choix) : bonne réponse. Ex2 (texte libre) : mauvaise réponse.
    // Ex3 (multiple_choice) : mauvaise réponse.
    await user.click(screen.getByRole('button', { name: 'virar' }));
    await user.type(screen.getByLabelText('Sem ____, você não abre conta no banco.'), 'RG');
    await user.click(screen.getByRole('button', { name: 'um documento oficial' }));

    await user.click(screen.getByRole('button', { name: 'Corrigir' }));

    // Ex1 : correct.
    expect(screen.getAllByText('Certo!')).toHaveLength(1);
    // Ex2 (champ libre) faux : la bonne réponse est révélée en toutes lettres au lieu
    // d'un simple « Errado. ». Ex3 (choix) faux : « Errado. » classique.
    expect(screen.getByText(/resposta certa: cpf/i)).toBeInTheDocument();
    expect(screen.getAllByText('Errado.')).toHaveLength(1);
    // La bonne option de l'exercice 3 est révélée en vert même si non sélectionnée.
    const ex3Group = screen.getByRole('group', { name: 'jeitinho brasileiro quer dizer:' });
    const correctOpt = within(ex3Group).getByRole('button', { name: 'a arte de contornar regras com charme' });
    expect(correctOpt.className).toMatch(/emerald/);
  });

  it('le résumé reste visible après correction, quel que soit le score', async () => {
    const user = userEvent.setup();
    render(<StudySheetPanel slug="camarada-quer-cpf" />);
    await screen.findByText(/apprendre à utiliser le verbe virar/i);

    // Aucune réponse donnée du tout — score nul.
    await user.click(screen.getByRole('button', { name: 'Corrigir' }));

    expect(screen.getByText('Resumo')).toBeInTheDocument();
    expect(screen.getByText('CPF', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('jeitinho', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('malandro', { selector: 'span' })).toBeInTheDocument();
  });

  it('modifier une réponse après correction efface les couleurs (obsolètes) jusqu\'au prochain « Corrigir »', async () => {
    const user = userEvent.setup();
    render(<StudySheetPanel slug="camarada-quer-cpf" />);
    await screen.findByText(/apprendre à utiliser le verbe virar/i);

    await user.click(screen.getByRole('button', { name: 'virar' }));
    await user.click(screen.getByRole('button', { name: 'Corrigir' }));
    expect(screen.getAllByText('Certo!').length).toBeGreaterThan(0);

    // Changer la réponse : les couleurs disparaissent (résumé aussi, car `corrected` retombe).
    await user.click(screen.getByRole('button', { name: 'ser' }));
    expect(screen.queryByText('Certo!')).not.toBeInTheDocument();
    expect(screen.queryByText('Errado.')).not.toBeInTheDocument();
    expect(screen.queryByText('Resumo')).not.toBeInTheDocument();

    // Aucune limite : on recorrige autant de fois qu'on veut.
    await user.click(screen.getByRole('button', { name: 'Corrigir' }));
    expect(screen.getAllByText('Errado.').length).toBeGreaterThan(0);
  });
});

describe('StudySheetPanel — Eu Sou um Ovo (deux fill_blank sans distractors)', () => {
  it('rend les deux fill_blank en champ libre et accepte une réponse sans accent/casse', async () => {
    const user = userEvent.setup();
    render(<StudySheetPanel slug="eu-sou-um-ovo" />);
    await screen.findByText(/construction cadê/i);

    const ex1 = await screen.findByLabelText('____ minhas chaves?');
    expect(ex1.tagName).toBe('INPUT');
    await user.type(ex1, '  cade  '); // sans accent, casse basse, espaces superflus

    const ex3 = screen.getByLabelText('Ele só fica na ____, todo mundo olha mas ninguém compra.');
    await user.type(ex3, 'VITRINE');

    await user.click(screen.getByRole('button', { name: 'Corrigir' }));

    expect(screen.getAllByText('Certo!')).toHaveLength(2);
  });
});

describe('StudySheetPanel — indisponibilité (fail-closed)', () => {
  it('affiche un message d\'indisponibilité pour une chanson sans fiche', async () => {
    render(<StudySheetPanel slug="banco-master" />);
    expect(await screen.findByText(/ficha de estudo indisponível/i)).toBeInTheDocument();
  });
});
