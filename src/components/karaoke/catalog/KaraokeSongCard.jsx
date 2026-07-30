import { Mic } from 'lucide-react';
import { themeLabel, getSongCover } from '@/lib/karaokeCatalog';
import { BRAND_SQUARE_MEDIUM } from '@/lib/imageAssets';
import KaraokeDifficultyBadge from './KaraokeDifficultyBadge';

/**
 * Carta vertical do redesign 2026-07-30 : capa grande, tema + duração (se existir)
 * numa linha, título, artista (se existir), dificuldade + « Cantar » na base.
 *
 * Sem descrição, sem data de lançamento, sem múltiplos botões — só o essencial para
 * decidir e cantar. A carta INTEIRA é um único <button> (não um botão aninhado
 * noutro botão) : « Cantar » é um <span> visual, não um elemento interativo próprio.
 */
export default function KaraokeSongCard({ song, onSelect }) {
  const theme = themeLabel(song.category);
  const cover = getSongCover(song);
  // `duration_seconds` n'existe pas encore dans le schéma : la carte reste correcte
  // sans l'inventer (voir le rapport final — limitation réelle, pas un bug).
  const durationLabel = typeof song.duration_seconds === 'number'
    ? `${Math.floor(song.duration_seconds / 60)}:${String(Math.round(song.duration_seconds % 60)).padStart(2, '0')}`
    : null;

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
          width="200"
          height="200"
          onError={(e) => {
            if (e.currentTarget.src !== window.location.origin + BRAND_SQUARE_MEDIUM) {
              e.currentTarget.src = BRAND_SQUARE_MEDIUM;
            }
          }}
        />
      </span>

      <span className="karaoke-song-body">
        {(theme || durationLabel) && (
          <span className="karaoke-song-meta">
            {theme && <span className="karaoke-song-theme">{theme}</span>}
            {durationLabel && <span className="karaoke-song-duration">{durationLabel}</span>}
          </span>
        )}

        <span className="karaoke-song-title">{song.title}</span>
        {song.artist && <span className="karaoke-song-artist">{song.artist}</span>}

        <span className="karaoke-song-footer">
          <KaraokeDifficultyBadge song={song} />
          <span className="karaoke-song-cta" aria-hidden="true">
            <Mic className="h-3.5 w-3.5" /> Cantar
          </span>
        </span>
      </span>
    </button>
  );
}
