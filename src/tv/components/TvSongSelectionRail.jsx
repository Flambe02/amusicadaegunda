import { useEffect } from 'react';
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { ListMusic, LayoutGrid } from 'lucide-react';
import TvSongCard from './TvSongCard';

/**
 * Carte finale « Ver outras músicas » — même gabarit qu'une carte chanson, mais
 * ouvre directement le Catálogo (au lieu de faire défiler la rangée). Remplace la
 * 5ᵉ chanson pour garder 4 titres + 1 case sur une TV 1080p, sans débordement.
 */
function RailSeeAllCard({ onPress, remainingCount }) {
  const { ref, focused } = useFocusable({
    focusKey: 'HOME_RAIL_SEEALL',
    onEnterPress: onPress,
    onFocus: () => ref.current?.scrollIntoView({ behavior: 'smooth', inline: 'end', block: 'nearest' }),
  });
  return (
    <button
      ref={ref}
      type="button"
      onClick={onPress}
      aria-label="Ver outras músicas no catálogo"
      className={`tvh-card tvh-rail-seeall ${focused ? 'is-focused' : ''}`}
    >
      <div className="tvh-card-media tvh-rail-seeall-media">
        <span className="tvh-rail-seeall-icon" aria-hidden="true"><LayoutGrid size={40} /></span>
        <span className="tvh-rail-seeall-title">Ver outras músicas</span>
        {remainingCount > 0 && (
          <span className="tvh-rail-seeall-sub">+{remainingCount} no catálogo</span>
        )}
      </div>
    </button>
  );
}

/**
 * Rangée horizontale principale de l'accueil : « ESCOLHA SUA PRÓXIMA MÚSICA ».
 * Affiche 4 cartes chanson + une carte finale « Ver outras músicas » qui ouvre le
 * Catálogo (`onSeeAll`) — dimensionnée pour tenir sur une TV 1080p sans défilement.
 * `onFocusSong` est relayé au parent (préchargement du hero + analytics de dwell) ;
 * `focusKeyFor(song)` produit une clé stable par chanson pour restaurer le focus
 * exact au retour d'une fiche.
 */
export default function TvSongSelectionRail({
  title = 'Escolha sua próxima música', songs, getArtwork, focusKeyFor, onSelect, onFocusSong,
  onSeeAll, remainingCount = 0,
}) {
  const { ref, focusKey: rowKey } = useFocusable({
    focusKey: 'HOME_RAIL', trackChildren: true, saveLastFocusedChild: true,
  });

  // Molette souris → défilement horizontal (confort desktop, comme Netflix web).
  // Le D-pad reste géré par scrollIntoView au focus des cartes.
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [ref]);

  if (!songs?.length) return null;

  return (
    <FocusContext.Provider value={rowKey}>
      <section className="tvh-rail">
        <h2 className="tvh-rail-heading"><ListMusic size={20} /> {title}</h2>
        <div ref={ref} className="tvh-rail-scroll">
          {songs.map((song) => (
            <TvSongCard
              key={song.id}
              song={song}
              focusKey={focusKeyFor(song)}
              artSrc={getArtwork(song)}
              onSelect={onSelect}
              onFocusSong={onFocusSong}
            />
          ))}
          {onSeeAll && <RailSeeAllCard onPress={onSeeAll} remainingCount={remainingCount} />}
        </div>
      </section>
    </FocusContext.Provider>
  );
}
