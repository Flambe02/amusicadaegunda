import FeedSlide from './FeedSlide';
import FeedOverlay from './FeedOverlay';
import { CAIPIVARA_STAGE_IMAGE } from './feedMedia';

/**
 * Feed plein écran de l'Início mobile (< 768 px).
 *
 * Reçoit une LISTE de chansons, la plus récente en premier. Seule la première est
 * affichée aujourd'hui ; le glissement vertical vers les semaines précédentes arrive à
 * l'étape 4b (spec §4.1).
 *
 * Sans aucune chanson (Supabase ET repli statique indisponibles), la scène Caipivara
 * s'affiche : jamais d'écran vide ni de message « nenhuma música ».
 */
export default function MobileFeed({ songs = [], buildArtwork = null, onShowLyrics }) {
  const [first] = songs;

  if (!first) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-app-black" data-feed-phase="stage">
        <img
          src={CAIPIVARA_STAGE_IMAGE}
          alt="A Caipivara, mascote da Música da Segunda"
          className="absolute inset-0 h-full w-full object-contain object-bottom p-8"
        />
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <FeedSlide
        song={first}
        buildArtwork={buildArtwork}
        renderOverlay={(player) => (
          <FeedOverlay song={first} player={player} isFirst onShowLyrics={() => onShowLyrics?.(first)} />
        )}
      />
    </div>
  );
}
