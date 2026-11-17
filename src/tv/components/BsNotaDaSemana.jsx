import { NOTA_OPTIONS } from '@/lib/reactionDevice';
import { useNotaDaSemana, votesLabel } from '@/hooks/useNotaDaSemana';
import FocusRow from './FocusRow';
import FocusableButton from './FocusableButton';

/**
 * « Nota da semana » sur le grand écran (audit grand écran, étape 6) : trois gros
 * boutons 🔥 😂 😐 AVEC leur nom (lisibles à 3 m), pilotables à la télécommande.
 * Même vote que le mobile (src/hooks/useNotaDaSemana.js) : un par appareil, la TV
 * compte comme un appareil ; pourcentages après le vote. Panne : rien ne s'affiche.
 * À ne monter que sur la chanson de la semaine.
 */
export default function BsNotaDaSemana({ song, focusKey = 'BS_NOTA', className = '' }) {
  const { status, own, pending, vote, total, share, visible, showResults } = useNotaDaSemana(song, { analyticsMethod: 'nota_da_semana_bigscreen' });
  if (!visible) return null;

  return (
    <section className={`bs-nota ${className}`} aria-label="Nota da semana" data-nota-semana={status}>
      <div className="bs-nota-head">
        <span className="bs-nota-kicker">Nota da semana</span>
        <span className="bs-nota-sub">
          {showResults ? `${votesLabel(total)} · escolha outra para mudar` : 'O que achou da música da semana?'}
        </span>
      </div>
      <FocusRow className="bs-nota-buttons" focusKey={focusKey}>
        {NOTA_OPTIONS.map((option) => {
          const chosen = own === option.key;
          return (
            <FocusableButton
              key={option.key}
              focusKey={`${focusKey}_${option.key.toUpperCase()}`}
              className={`bs-btn bs-nota-btn bs-focus ${chosen ? 'is-chosen' : ''}`}
              ariaLabel={showResults ? `${option.label}: ${share[option.key]}%` : option.label}
              ariaPressed={chosen}
              onPress={() => { if (!pending) vote(option.key); }}
            >
              <span className="bs-nota-emoji" aria-hidden="true">{option.emoji}</span>
              <span>{option.label}</span>
              {showResults && <span className="bs-nota-pct" aria-hidden="true">{share[option.key]}%</span>}
            </FocusableButton>
          );
        })}
      </FocusRow>
      <p className="bs-visually-hidden" aria-live="polite">{showResults ? `Voto registrado. ${votesLabel(total)}.` : ''}</p>
    </section>
  );
}
