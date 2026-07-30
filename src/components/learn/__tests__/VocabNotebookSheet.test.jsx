import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VocabNotebookSheet from '@/components/learn/VocabNotebookSheet';
import { addEntry, readEntries } from '@/lib/vocabNotebook';

vi.mock('@capacitor/app', () => ({ App: { addListener: () => Promise.reject(new Error('no native')) } }));

const CPF = {
  expressionId: 'cpf', term: 'CPF',
  meaningFr: 'Numéro fiscal brésilien, indispensable pour tout.',
  register: 'courant', songSlug: 'camarada-quer-cpf', songTitle: 'Camarada Quer CPF',
};
const JEITINHO = {
  expressionId: 'jeitinho', term: 'jeitinho brasileiro',
  meaningFr: "L'art de contourner une règle avec charme et débrouille.",
  register: 'courant', songSlug: 'camarada-quer-cpf', songTitle: 'Camarada Quer CPF',
};
const CADE = {
  expressionId: 'cade', term: 'cadê',
  meaningFr: "Contraction familière de « que é de », l'équivalent de « où est passé ».",
  register: 'familier', songSlug: 'eu-sou-um-ovo', songTitle: 'Eu Sou um Ovo',
};

beforeEach(() => {
  localStorage.clear();
});

describe('VocabNotebookSheet — onglet Lista', () => {
  it('affiche un état vide quand le carnet ne contient rien', () => {
    render(<VocabNotebookSheet onClose={() => {}} />);
    expect(screen.getByText(/caderno está vazio/i)).toBeInTheDocument();
  });

  it('liste les entrées avec terme, sens et chanson source, les plus récentes en premier', () => {
    addEntry(CPF);
    addEntry(CADE);
    render(<VocabNotebookSheet onClose={() => {}} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText('cadê')).toBeInTheDocument();
    expect(within(items[0]).getByText('Eu Sou um Ovo')).toBeInTheDocument();
    expect(within(items[1]).getByText('CPF')).toBeInTheDocument();
    expect(within(items[1]).getByText(/Numéro fiscal brésilien/)).toBeInTheDocument();
  });
});

describe('VocabNotebookSheet — onglet Revisão', () => {
  it("affiche un état vide s'il n'y a rien à revoir", async () => {
    const user = userEvent.setup();
    render(<VocabNotebookSheet onClose={() => {}} />);
    await user.click(screen.getByRole('tab', { name: /revisão/i }));
    expect(screen.getByText(/nada para rever/i)).toBeInTheDocument();
  });

  it('révèle le sens au tap, puis classe la carte et avance à la suivante', async () => {
    const user = userEvent.setup();
    addEntry(CPF);
    addEntry(JEITINHO);
    render(<VocabNotebookSheet onClose={() => {}} />);
    await user.click(screen.getByRole('tab', { name: /revisão/i }));

    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    // La toute dernière ajoutée (jeitinho) apparaît en premier — même ordre que la liste.
    expect(screen.getByText('jeitinho brasileiro')).toBeInTheDocument();
    expect(screen.queryByText(/L'art de contourner/)).not.toBeInTheDocument();

    await user.click(screen.getByText('jeitinho brasileiro'));
    expect(screen.getByText(/L'art de contourner/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /já sei/i }));
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(screen.getByText('CPF')).toBeInTheDocument();
    // La carte suivante repart non révélée.
    expect(screen.queryByText(/Numéro fiscal brésilien/)).not.toBeInTheDocument();
  });

  it('« Já sei » classe l\'entrée dans le carnet ; « A revisar » la laisse en attente', async () => {
    const user = userEvent.setup();
    addEntry(CPF);
    addEntry(JEITINHO);
    render(<VocabNotebookSheet onClose={() => {}} />);
    await user.click(screen.getByRole('tab', { name: /revisão/i }));

    await user.click(screen.getByRole('button', { name: /já sei/i })); // jeitinho
    await user.click(screen.getByRole('button', { name: /a revisar/i })); // cpf

    const entries = readEntries();
    expect(entries.find((e) => e.expressionId === 'jeitinho').review).toBe('known');
    expect(entries.find((e) => e.expressionId === 'cpf').review).toBe('to_review');
  });

  it('affiche un message de fin après la dernière carte', async () => {
    const user = userEvent.setup();
    addEntry(CPF);
    render(<VocabNotebookSheet onClose={() => {}} />);
    await user.click(screen.getByRole('tab', { name: /revisão/i }));

    await user.click(screen.getByRole('button', { name: /já sei/i }));
    expect(screen.getByText(/revisão concluída/i)).toBeInTheDocument();
  });

  it('la liste reflète immédiatement un classement fait pendant la révision', async () => {
    const user = userEvent.setup();
    addEntry(CPF);
    render(<VocabNotebookSheet onClose={() => {}} />);
    await user.click(screen.getByRole('tab', { name: /revisão/i }));
    await user.click(screen.getByRole('button', { name: /já sei/i }));

    await user.click(screen.getByRole('tab', { name: /lista/i }));
    const item = screen.getByRole('listitem');
    expect(within(item).getByLabelText(/já sabe/i)).toBeInTheDocument();
  });
});

describe('VocabNotebookSheet — fermeture', () => {
  it('ferme via Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<VocabNotebookSheet onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('ferme via le bouton dédié', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<VocabNotebookSheet onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /fechar caderno/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
