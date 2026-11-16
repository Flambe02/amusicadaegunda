import { favoriteKey, useFavorites } from '@/hooks/useFavorites';
import { HeartFilled, HeartOutline } from '@/components/mobile/icons/FilledIcons';

/**
 * Cœur « Minhas favoritas » (favoris gardés sur l'appareil, sans compte).
 *
 * `variant` :
 *   - `icon` (défaut) : rond sombre posé sur une image (cartes du karaokê desktop) ;
 *   - `pill` : bouton à libellé « Favoritar » / « Favorita » (fiche desktop) ;
 *   - `round` : rond de 40 px de la barre du haut de la fiche mobile (comme Voltar).
 * Toujours un <button> autonome : jamais imbriqué dans un autre bouton ou lien.
 */
export default function FavoriteHeartButton({ song, variant = 'icon', className = '' }) {
  const { isFavorite, toggle } = useFavorites();
  if (!favoriteKey(song)) return null;
  const on = isFavorite(song);
  const title = song.title || 'esta música';
  const ariaLabel = on ? `Remover ${title} das favoritas` : `Adicionar ${title} às favoritas`;
  const Icon = on ? HeartFilled : HeartOutline;

  if (variant === 'round') {
    return (
      <button
        type="button"
        onClick={() => toggle(song)}
        aria-pressed={on}
        aria-label={ariaLabel}
        data-favorite={on ? 'true' : 'false'}
        className={`flex h-10 w-10 items-center justify-center rounded-full bg-black/45 ${on ? 'text-red-500' : 'text-white/78'} ${className}`}
      >
        <Icon className="h-5 w-5" />
      </button>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={() => toggle(song)}
        aria-pressed={on}
        aria-label={ariaLabel}
        data-favorite={on ? 'true' : 'false'}
        className={`inline-flex items-center justify-center gap-2 rounded-full border text-sm font-black transition active:scale-[0.98] ${
          on ? 'border-red-500/40 bg-red-500/12 text-red-400' : 'border-white/15 bg-white/6 text-white/80 hover:bg-white/10'
        } ${className}`}
      >
        <Icon className={`h-5 w-5 ${on ? 'text-red-500' : ''}`} />
        <span aria-hidden="true">{on ? 'Favorita' : 'Favoritar'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toggle(song)}
      aria-pressed={on}
      aria-label={ariaLabel}
      data-favorite={on ? 'true' : 'false'}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white shadow-md transition hover:bg-black/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDE047] ${className}`}
    >
      <Icon className={`h-5 w-5 ${on ? 'text-red-500' : ''}`} />
    </button>
  );
}
