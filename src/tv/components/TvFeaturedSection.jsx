import TvFeaturedHero from './TvFeaturedHero';
import TvWhySingPanel from './TvWhySingPanel';

/**
 * Zone vedette en 2 colonnes (~79% hero / ~21% panneau éditorial), cf. cahier des
 * charges. Le panneau « Por que cantar? » n'est JAMAIS focusable — il ne doit
 * jamais interrompre le flux D-pad hero→rangée. Sur écrans étroits (1280px), le
 * panneau disparaît entièrement (cf. .tvh-featured en CSS) sans réduire l'espace
 * texte du hero.
 */
export default function TvFeaturedSection({ song, heroSrc, hasKaraoke, dots, onConhecer, onCantar }) {
  if (!song) return null;
  return (
    <div className="tvh-featured">
      <TvFeaturedHero
        song={song}
        heroSrc={heroSrc}
        hasKaraoke={hasKaraoke}
        dots={dots}
        onConhecer={onConhecer}
        onCantar={onCantar}
      />
      <TvWhySingPanel song={song} />
    </div>
  );
}
