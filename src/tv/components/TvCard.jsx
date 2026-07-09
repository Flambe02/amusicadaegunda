import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { Mic } from 'lucide-react';

/**
 * Carte de chanson navigable au D-pad. Titre en overlay (bas). Variante « karaokê »
 * (accent jaune, badge micro, sans titre). Au focus : se recentre dans la rangée.
 */
export default function TvCard({ song, thumb, categoryLabel, hasKaraoke, onSelect, variant = 'default' }) {
  const { ref, focused } = useFocusable({
    onEnterPress: () => onSelect(song),
    onFocus: () => {
      ref.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    },
  });
  const isKaraoke = variant === 'karaoke';

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSelect(song)}
      className={`tv-card ${focused ? 'is-focused' : ''} ${isKaraoke ? 'accent-yellow' : ''}`}
    >
      <div className="tv-card-thumb">
        {thumb
          ? <img src={thumb} alt="" loading="lazy" decoding="async" />
          : <div className="tv-card-thumb-fallback" aria-hidden="true" />}

        {!isKaraoke && (
          <span className="tv-card-overlay">
            <span className="tv-card-otitle">{song.title}</span>
            {categoryLabel && <span className="tv-card-ocat">{categoryLabel}</span>}
          </span>
        )}

        {hasKaraoke && (
          <span className="tv-card-badge" title="Karaokê disponível"><Mic size={15} /></span>
        )}
      </div>
    </button>
  );
}
