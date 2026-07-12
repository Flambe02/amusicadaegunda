import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { getTheme, getDifficultyMeta } from '../lib/songMeta';

/** Icône « 3 barres » de difficulté (jamais la seule couleur qui porte l'info). */
function DifficultyBars({ level }) {
  return (
    <span className="tvh-diff-bars" aria-hidden="true">
      <i className={level >= 1 ? 'is-on' : ''} style={{ height: '45%' }} />
      <i className={level >= 2 ? 'is-on' : ''} style={{ height: '72%' }} />
      <i className={level >= 3 ? 'is-on' : ''} style={{ height: '100%' }} />
    </span>
  );
}

/**
 * Carte chanson d'une rangée « song-first » — style affiche : titre + pastille de
 * difficulté intégrés DANS l'image (scrim + overlay), jamais du texte séparé sous
 * la vignette (cf. cahier des charges : « ne jamais placer le titre comme un
 * caption de site web sous la carte »).
 *
 * Zoom au focus appliqué à l'IMAGE SEULE (`.tvh-card-img`), jamais au conteneur ni
 * au texte de l'overlay : la bordure/halo jaune se posent sur `.tvh-card-media`
 * (taille fixe, non transformé). Ce découplage évite le bug Chromium documenté où
 * un texte à l'intérieur d'un élément `transform:scale()` se retrouve rogné à
 * gauche sur la 1ère carte d'une rangée imbriquée dans un conteneur qui scrolle
 * verticalement (notre rail est dans .tvh-scroll) — ici le texte de l'overlay
 * n'est JAMAIS transformé, donc jamais concerné.
 */
export default function TvSongCard({ song, focusKey, artSrc, onSelect, onFocusSong }) {
  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: () => onSelect(song),
    onFocus: () => {
      ref.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      onFocusSong?.(song);
    },
  });

  const { label: difficulty, level, key: diffKey } = getDifficultyMeta(song);
  const theme = getTheme(song);

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSelect(song)}
      aria-label={`Abrir a ficha de ${song.title}`}
      className={`tvh-card ${focused ? 'is-focused' : ''}`}
    >
      <div className="tvh-card-media">
        {artSrc
          ? <img src={artSrc} alt="" loading="lazy" decoding="async" className="tvh-card-img" />
          : <div className="tvh-card-img tvh-card-img-fallback" aria-hidden="true" />}
        <div className="tvh-card-scrim" aria-hidden="true" />
        <div className="tvh-card-overlay">
          {theme && <span className="tvh-card-theme">{theme}</span>}
          <span className="tvh-card-title">{song.title}</span>
          <span className={`tvh-diff-pill tvh-diff-${diffKey}`}>
            <DifficultyBars level={level} /> {difficulty}
          </span>
        </div>
      </div>
    </button>
  );
}
