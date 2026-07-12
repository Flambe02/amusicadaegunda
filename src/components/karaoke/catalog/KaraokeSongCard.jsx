import { Mic, CalendarDays } from 'lucide-react';
import { themeLabel, formatShortDate, getSongCover, shortSummary } from '@/lib/karaokeCatalog';
import { BRAND_SQUARE_MEDIUM } from '@/lib/imageAssets';

/**
 * Carte chanson compacte et visuelle (cover + thème + data + titre + résumé + Cantar).
 * Toute la carte est cliquable → ouvre le lecteur (même chemin que « Cantar agora »).
 * Layout horizontal partagé mobile + desktop.
 */
export default function KaraokeSongCard({ song, onSelect }) {
  const theme = themeLabel(song.category);
  const date = formatShortDate(song.release_date);
  const summary = shortSummary(song);
  const cover = getSongCover(song);

  return (
    <button
      type="button"
      className="karaoke-song-card karaoke-card"
      onClick={() => onSelect(song)}
      aria-label={`Cantar ${song.title}`}
    >
      <span className="karaoke-song-cover">
        <img
          src={cover}
          alt={`Capa de ${song.title}`}
          loading="lazy"
          decoding="async"
          width="112"
          height="112"
          onError={(e) => {
            if (e.currentTarget.src !== window.location.origin + BRAND_SQUARE_MEDIUM) {
              e.currentTarget.src = BRAND_SQUARE_MEDIUM;
            }
          }}
        />
      </span>

      <span className="karaoke-song-body">
        {(theme || date) && (
          <span className="karaoke-song-meta">
            {theme && <span className="karaoke-song-theme">{theme}</span>}
            {date && (
              <span className="karaoke-song-date">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> {date}
              </span>
            )}
          </span>
        )}
        <span className="karaoke-song-title">{song.title}</span>
        {summary && <span className="karaoke-song-summary">{summary}</span>}
      </span>

      <span className="karaoke-song-cta" aria-hidden="true">
        <Mic className="h-4 w-4" /> Cantar
      </span>
    </button>
  );
}
