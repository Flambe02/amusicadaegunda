import { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { BUTTONDOWN_CONFIGURED, BUTTONDOWN_CONFIRMATION_URL, BUTTONDOWN_FORM_ACTION } from '@/lib/buttondown';

/**
 * Capture email Buttondown — page /apprendre/ (§6.5 de la spec).
 *
 * L'endpoint Buttondown n'accepte pas fetch/AJAX cross-origin (voir buttondown.js) :
 * c'est un <form> HTML classique qui soumet. Pour ne PAS recharger/rediriger cette
 * page (contrainte explicite de la spec), le form cible une fenêtre nommée
 * `popupwindow` — ouverte préventivement par `onSubmit` — plutôt que la page elle-même.
 * Dégradation gracieuse : même si le JS de `onSubmit` échoue, l'attribut natif
 * `target="popupwindow"` du <form> suffit à lui seul à empêcher la navigation de cette
 * page (le navigateur ouvre un nouvel onglet plutôt que de remplacer celui-ci).
 *
 * En complément de la popup (dont la confirmation vient de Buttondown, hors de notre
 * contrôle), un message de confirmation INLINE s'affiche immédiatement ici — c'est lui
 * que §6.5 vise par « soumission en arrière-plan avec message de confirmation inline ».
 */
/**
 * `submitLabel` / `inputId` : réutilisation hors d'Aprender (Newsletter du Menu mobile) ;
 * les valeurs par défaut sont celles de /apprendre, inchangées.
 */
export default function ButtondownSignupForm({ submitLabel = 'Quero entrar na beta', inputId = 'apprender-email' } = {}) {
  const [submitted, setSubmitted] = useState(false);

  if (!BUTTONDOWN_CONFIGURED) {
    // Garde-fou de déploiement : si l'identifiant Buttondown n'a jamais été renseigné,
    // on le dit plutôt que de soumettre silencieusement vers un compte inexistant.
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
        <p className="text-sm font-semibold text-white/70">Inscrição em breve</p>
        <p className="mt-1 text-xs text-white/40">A captura de email está a ser configurada.</p>
      </div>
    );
  }

  return (
    <div>
      <form
        action={BUTTONDOWN_FORM_ACTION}
        method="post"
        target="popupwindow"
        onSubmit={() => {
          window.open(BUTTONDOWN_CONFIRMATION_URL, 'popupwindow');
          setSubmitted(true);
        }}
        className="flex flex-col gap-2.5 sm:flex-row"
      >
        <label htmlFor={inputId} className="sr-only">Endereço de email</label>
        <div className="relative flex-1">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" aria-hidden="true" />
          <input
            id={inputId}
            type="email"
            name="email"
            required
            placeholder="seu@email.com"
            autoComplete="email"
            className="h-12 w-full rounded-full border border-white/15 bg-white/[0.04] pl-10 pr-4 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[#FDE047]/50"
          />
        </div>
        <input type="hidden" name="embed" value="1" />
        <button
          type="submit"
          className="h-12 shrink-0 rounded-full bg-[#FDE047] px-6 text-sm font-black text-black transition hover:brightness-95 active:scale-[0.98]"
        >
          {submitLabel}
        </button>
      </form>

      {submitted && (
        <p className="mt-3 flex items-center gap-2 text-sm text-[#FDE047]" role="status" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Quase lá — confirme no email que acabou de abrir numa nova janela.
        </p>
      )}
    </div>
  );
}
