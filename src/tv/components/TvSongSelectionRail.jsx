import { useEffect } from 'react';
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { ListMusic, ChevronRight } from 'lucide-react';
import TvSongCard from './TvSongCard';

/** Flèche circulaire en bout de rangée — focusable, fait défiler d'une « page ». */
function RailArrow({ onPress }) {
  const { ref, focused } = useFocusable({
    focusKey: 'HOME_RAIL_ARROW',
    onEnterPress: onPress,
    onFocus: () => ref.current?.scrollIntoView({ behavior: 'smooth', inline: 'end', block: 'nearest' }),
  });
  return (
    <button
      ref={ref}
      type="button"
      onClick={onPress}
      aria-label="Ver mais músicas"
      className={`tvh-rail-arrow ${focused ? 'is-focused' : ''}`}
    >
      <ChevronRight size={28} />
    </button>
  );
}

/**
 * Rangée horizontale principale de l'accueil : « ESCOLHA SUA PRÓXIMA MÚSICA ».
 * Affiche ~5 cartes pleines + un bout de la 6ᵉ (invite au défilement) + une flèche
 * focusable en bout de rangée. `onFocusSong` est relayé au parent (préchargement
 * du hero + analytics de dwell) ; `focusKeyFor(song)` produit une clé stable par
 * chanson pour permettre au parent de restaurer le focus exact au retour d'une
 * fiche.
 */
export default function TvSongSelectionRail({
  title = 'Escolha sua próxima música', songs, getArtwork, focusKeyFor, onSelect, onFocusSong,
}) {
  const { ref, focusKey: rowKey } = useFocusable({
    focusKey: 'HOME_RAIL', trackChildren: true, saveLastFocusedChild: true,
  });

  const scrollForward = () => {
    ref.current?.scrollBy({ left: ref.current.clientWidth * 0.85, behavior: 'smooth' });
  };

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
          {songs.length > 5 && <RailArrow onPress={scrollForward} />}
        </div>
      </section>
    </FocusContext.Provider>
  );
}
