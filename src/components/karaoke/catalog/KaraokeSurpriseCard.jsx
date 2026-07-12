import { forwardRef } from 'react';
import { Sparkles, ChevronRight, Wand2, X } from 'lucide-react';

/**
 * Carte « Me surpreenda » : action de découverte aléatoire, pleine largeur.
 * Pas de roue qui tourne — l'effet vient d'un léger glow + de la révélation du résultat.
 *
 * `hint` (optionnel) affiche l'astuce de première visite, avec bouton « Sortear agora ».
 */
const KaraokeSurpriseCard = forwardRef(function KaraokeSurpriseCard(
  { onSurprise, disabled = false, hint = false, onDismissHint },
  ref,
) {
  return (
    <div className="karaoke-surprise-wrap">
      <button
        ref={ref}
        type="button"
        className="karaoke-surprise"
        onClick={onSurprise}
        disabled={disabled}
        aria-label="Me surpreenda — sortear uma música para cantar"
      >
        <span className="karaoke-surprise-icon" aria-hidden="true">
          <Sparkles className="h-7 w-7" />
        </span>
        <span className="karaoke-surprise-text">
          <span className="karaoke-surprise-title">ME SURPREENDA</span>
          <span className="karaoke-surprise-subtitle">
            {disabled ? 'Nenhuma música elegível agora' : 'Uma música escolhida na hora'}
          </span>
        </span>
        <span className="karaoke-surprise-chevron" aria-hidden="true">
          <ChevronRight className="h-5 w-5" />
        </span>
      </button>

      {hint && !disabled && (
        <div className="karaoke-hint" role="note">
          <button
            type="button"
            className="karaoke-hint-close"
            onClick={onDismissHint}
            aria-label="Fechar dica"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <p className="karaoke-hint-title">Deixe a sorte escolher!</p>
          <p className="karaoke-hint-body">Vamos sortear uma música para você cantar.</p>
          <button
            type="button"
            className="karaoke-hint-cta"
            onClick={() => { onDismissHint?.(); onSurprise(); }}
          >
            <Wand2 className="h-3.5 w-3.5" aria-hidden="true" /> Sortear agora
          </button>
        </div>
      )}
    </div>
  );
});

export default KaraokeSurpriseCard;
