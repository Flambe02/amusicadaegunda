import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LearningMomentSheet from '@/components/learn/LearningMomentSheet';

vi.mock('@capacitor/app', () => ({ App: { addListener: () => Promise.reject(new Error('no native')) } }));

const BASE_MOMENT = {
  id: 'eu-sou',
  term: 'eu sou',
  meaningFr: 'je suis',
  momentType: 'base',
  examples: ['Eu sou francês 🇫🇷', 'Eu sou feliz 😁'],
  note: null,
  miniInteraction: { prompt: 'Eu sou _______', options: ['francês 🇫🇷', 'feliz 😁', 'um ovo 🥚'] },
};

const VIVO_MOMENT = {
  id: 'cade',
  term: 'cadê',
  meaningFr: 'Contraction familière de « que é de »…',
  momentType: 'vivo',
  examples: ['Cadê você? → T\'es où ?'],
  note: 'À l\'oral au Brésil, tu l\'entendras partout.',
  miniInteraction: null,
};

describe('LearningMomentSheet', () => {
  it('affiche EU SOU = JE SUIS et les exemples pour une découverte base', () => {
    render(<LearningMomentSheet moment={BASE_MOMENT} onClose={() => {}} onInteractionComplete={() => {}} />);
    expect(screen.getByText(/eu sou = je suis/i)).toBeInTheDocument();
    expect(screen.getByText('Eu sou francês 🇫🇷')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /🟢 base/i })).toBeInTheDocument();
  });

  it('la mini-interaction accepte n\'importe quel choix et affiche « Muito bem! », jamais une erreur', async () => {
    const onInteractionComplete = vi.fn();
    const user = userEvent.setup();
    render(<LearningMomentSheet moment={BASE_MOMENT} onClose={() => {}} onInteractionComplete={onInteractionComplete} />);

    await user.click(screen.getByRole('button', { name: /um ovo/i }));

    expect(screen.getByText(/muito bem!/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /francês/i })).not.toBeInTheDocument();
    expect(onInteractionComplete).toHaveBeenCalledTimes(1);
  });

  it('affiche une découverte "vivo" sans mini-interaction, avec sa note d\'usage', () => {
    render(<LearningMomentSheet moment={VIVO_MOMENT} onClose={() => {}} onInteractionComplete={() => {}} />);
    expect(screen.getByRole('heading', { name: /🇧🇷 português ao vivo/i })).toBeInTheDocument();
    expect(screen.getByText(/à l'oral au brésil/i)).toBeInTheDocument();
    expect(screen.queryByText('À toi :')).not.toBeInTheDocument();
  });

  it('ferme au clic sur le bouton fermer', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<LearningMomentSheet moment={BASE_MOMENT} onClose={onClose} onInteractionComplete={() => {}} />);
    await user.click(screen.getByRole('button', { name: /fechar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ferme sur Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<LearningMomentSheet moment={BASE_MOMENT} onClose={onClose} onInteractionComplete={() => {}} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ne rend rien sans moment', () => {
    const { container } = render(<LearningMomentSheet moment={null} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
