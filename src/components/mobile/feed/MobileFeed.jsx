import FeedSlide from './FeedSlide';
import { CAIPIVARA_STAGE_IMAGE } from './feedMedia';

/**
 * Feed plein écran de l'Início mobile (< 768 px).
 *
 * Reçoit une LISTE de chansons, la plus récente en premier. Seule la première est
 * affichée aujourd'hui : le glissement vers les semaines précédentes est une décision
 * en attente (spec §4.1), et l'accepter plus tard ne demandera pas de refonte.
 *
 * Sans aucune chanson (Supabase ET repli statique indisponibles), la scène Caipivara
 * s'affiche : jamais d'écran vide ni de message « nenhuma música ».
 */
export default function MobileFeed({ songs = [], buildArtwork = null, renderOverlay }) {
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
      <FeedSlide song={first} buildArtwork={buildArtwork} renderOverlay={renderOverlay} />
    </div>
  );
}
