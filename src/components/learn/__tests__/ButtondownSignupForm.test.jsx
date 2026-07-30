import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Capture email Buttondown (§6.5). L'endpoint Buttondown n'accepte pas fetch/AJAX
 * cross-origin (confirmé par sa documentation officielle) : c'est un <form> HTML
 * classique, ciblant une fenêtre nommée pour ne pas recharger /apprendre/.
 */

describe('ButtondownSignupForm — configuré (état actuel du repo, amusicadasegunda)', () => {
  it('soumet vers l\'endpoint embed-subscribe, cible une popup, et affiche une confirmation inline', async () => {
    const { default: ButtondownSignupForm } = await import('@/components/learn/ButtondownSignupForm');

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const user = userEvent.setup();
    render(<ButtondownSignupForm />);

    const form = document.querySelector('form');
    expect(form).toHaveAttribute('action', 'https://buttondown.com/api/emails/embed-subscribe/amusicadasegunda');
    expect(form).toHaveAttribute('method', 'post');
    expect(form).toHaveAttribute('target', 'popupwindow');
    expect(form.querySelector('input[name="embed"]')).toHaveValue('1');

    const emailInput = screen.getByLabelText(/endereço de email/i);
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toBeRequired();

    await user.type(emailInput, 'leitor@example.com');
    // jsdom ne sait pas naviguer un vrai <form> (c'est voulu — la soumission native
    // n'est jamais empêchée, exactement le comportement recherché en production) ;
    // seul le comportement onSubmit nous intéresse ici.
    await user.click(screen.getByRole('button', { name: /quero entrar na beta/i })).catch(() => {});

    expect(openSpy).toHaveBeenCalledWith('https://buttondown.com/amusicadasegunda', 'popupwindow');
    expect(await screen.findByRole('status')).toHaveTextContent(/confirme no email/i);

    openSpy.mockRestore();
  });
});

describe('ButtondownSignupForm — non configuré (garde-fou, mocké)', () => {
  afterEach(() => {
    vi.doUnmock('@/lib/buttondown');
    vi.resetModules();
  });

  it('affiche un repli explicite plutôt qu\'un formulaire pointant vers un compte inexistant', async () => {
    // Le premier test a déjà chargé (et mis en cache) la version RÉELLE, configurée,
    // du module — resetModules() force un graphe frais pour que doMock() s'applique.
    vi.resetModules();
    vi.doMock('@/lib/buttondown', () => ({
      BUTTONDOWN_CONFIGURED: false,
      BUTTONDOWN_FORM_ACTION: 'https://buttondown.com/api/emails/embed-subscribe/REMPLACER_PAR_IDENTIFIANT_BUTTONDOWN',
      BUTTONDOWN_CONFIRMATION_URL: 'https://buttondown.com/REMPLACER_PAR_IDENTIFIANT_BUTTONDOWN',
    }));
    const { default: ButtondownSignupForm } = await import('@/components/learn/ButtondownSignupForm');
    render(<ButtondownSignupForm />);

    expect(screen.getByText(/inscrição em breve/i)).toBeInTheDocument();
    expect(document.querySelector('form')).toBeNull();
  });
});
