import { Mic, Shuffle, X, Sparkles, CalendarDays } from 'lucide-react';
import KaraokeModal from './KaraokeModal';
import { themeLabel, formatShortDate, getSongCover, shortSummary } from '@/lib/karaokeCatalog';
import { BRAND_SQUARE_MEDIUM } from '@/lib/imageAssets';

/**
 * Résultat du tirage « Me surpreenda » : bottom-sheet mobile / carte centrée desktop.
 * Ne démarre JAMAIS la lecture automatiquement — l'utilisateur choisit « Cantar agora ».
 */
export default function KaraokeSurpriseResult({ song, onSing, onReroll, onClose }) {
  const theme = themeLabel(song?.category);
  const date = formatShortDate(song?.release_date);
  const summary = shortSummary(song, 180);

  return (
    <KaraokeModal open={!!song} onClose={onClose} labelledBy="karaoke-surprise-title" className="karaoke-surprise-modal">
      <button type="button" className="karaoke-modal-close" onClick={onClose} aria-label="Fechar">
        <X className="h-5 w-5" aria-hidden="true" />
      </button>

      <p className="karaoke-surprise-eyebrow">
        <Sparkles className="h-4 w-4" aria-hidden="true" /> Sua surpresa
      </p>

      <div className="karaoke-surprise-result-cover">
        <img
          src={getSongCover(song)}
          alt={`Capa de ${song?.title || ''}`}
          decoding="async"
          onError={(e) => {
            if (e.currentTarget.src !== window.location.origin + BRAND_SQUARE_MEDIUM) {
              e.currentTarget.src = BRAND_SQUARE_MEDIUM;
            }
          }}
        />
      </div>

      <h2 id="karaoke-surprise-title" className="karaoke-surprise-result-title">{song?.title}</h2>

      <div className="karaoke-surprise-result-meta">
        {theme && <span className="karaoke-song-theme">{theme}</span>}
        {date && (
          <span className="karaoke-song-date">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> {date}
          </span>
        )}
      </div>

      {summary && <p className="karaoke-surprise-result-summary">{summary}</p>}

      <div className="karaoke-surprise-result-actions">
        <button type="button" className="karaoke-btn-primary" onClick={() => onSing(song)}>
          <Mic className="h-5 w-5" aria-hidden="true" /> Cantar agora
        </button>
        <button type="button" className="karaoke-btn-ghost" onClick={onReroll}>
          <Shuffle className="h-4 w-4" aria-hidden="true" /> Sortear outra
        </button>
      </div>
    </KaraokeModal>
  );
}
