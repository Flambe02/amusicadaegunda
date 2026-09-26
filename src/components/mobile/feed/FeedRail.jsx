import { Link } from 'react-router-dom';
import { ICON_SHADOW, TEXT_SHADOW } from './feedStyles';

/**
 * Colonne d'icônes façon TikTok (addendum H.5.1), partagée par le feed de l'Início et
 * la scène du Catálogo : icônes pleines de 32 px sans rond, ombre portée douce,
 * libellés de 12 px.
 */

// Zone tactile ≥ 44 × 44 px (≥ 56 × 52) ; icône pleine de 32 px, ombre portée douce.
// Largeur = le plus long libellé (« Compartilhar »), sinon il déborde de l'écran.
const railClass =
  'flex min-h-[44px] min-w-[56px] touch-manipulation select-none flex-col items-center gap-1 py-0.5 text-white active:opacity-70';
const railIconClass = `h-8 w-8 ${ICON_SHADOW}`;
const railLabelClass = `whitespace-nowrap text-xs font-semibold leading-none ${TEXT_SHADOW}`;

/** Conteneur de la colonne ; la position est donnée par l'appelant. */
export function Rail({ className = '', children }) {
  return (
    <div data-rail className={`z-30 flex flex-col items-stretch gap-3 ${className}`}>
      {children}
    </div>
  );
}

export function RailButton({ label, icon: Icon, onClick, ariaLabel, buttonRef }) {
  return (
    <button ref={buttonRef} type="button" onClick={onClick} aria-label={ariaLabel} className={railClass}>
      <Icon className={railIconClass} />
      <span aria-hidden="true" className={railLabelClass}>{label}</span>
    </button>
  );
}

export function RailLink({ label, icon: Icon, to, ariaLabel }) {
  return (
    <Link to={to} aria-label={ariaLabel} className={railClass}>
      <Icon className={railIconClass} />
      <span aria-hidden="true" className={railLabelClass}>{label}</span>
    </Link>
  );
}
