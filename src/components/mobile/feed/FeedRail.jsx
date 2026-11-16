import { Link } from 'react-router-dom';
import { ICON_SHADOW, TEXT_SHADOW } from './feedStyles';
import { favoriteKey } from '@/hooks/useFavorites';
import { HeartFilled } from '@/components/mobile/icons/FilledIcons';

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

/**
 * Conteneur de la colonne ; la position est donnée par l'appelant. Fond toujours
 * transparent : le verre dépoli essayé le 2026-11-15 a été retiré à la demande.
 */
export function Rail({ className = '', children }) {
  return (
    <div data-rail className={`z-30 flex flex-col items-stretch gap-3 ${className}`}>
      {children}
    </div>
  );
}

/**
 * `pressed` (facultatif) : bouton bascule (Favoritar) → `aria-pressed`. `iconClassName`
 * colore l'icône (cœur rouge une fois favorite).
 */
export function RailButton({ label, icon: Icon, onClick, ariaLabel, buttonRef, pressed, iconClassName = '' }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={typeof pressed === 'boolean' ? pressed : undefined}
      className={railClass}
    >
      <Icon className={iconClassName ? `${railIconClass} ${iconClassName}` : railIconClass} />
      <span aria-hidden="true" className={railLabelClass}>{label}</span>
    </button>
  );
}

/** Favoritar / Favorita : premier élément de la colonne (feed et Catálogo), façon TikTok. */
export function RailFavoriteButton({ song, isFavorite, onToggle }) {
  if (!favoriteKey(song)) return null;
  const title = song?.title || 'esta música';
  return (
    <RailButton
      label={isFavorite ? 'Favorita' : 'Favoritar'}
      icon={HeartFilled}
      pressed={isFavorite}
      iconClassName={isFavorite ? 'text-red-500' : 'text-white'}
      onClick={() => onToggle?.(song)}
      ariaLabel={isFavorite ? `Remover ${title} das favoritas` : `Adicionar ${title} às favoritas`}
    />
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
