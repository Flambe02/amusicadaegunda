import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import TvSongGridCard from './TvSongGridCard';

/**
 * Grille de cartes de chansons (4 colonnes à 1080p, 2 rangées pleines + un aperçu
 * de la 3ᵉ pour signaler le défilement vertical). Groupe de focus propre
 * (`CAT_GRID`) qui mémorise sa dernière carte → restauration au retour d'une fiche.
 * La liste virtualisée n'est pas nécessaire à cette échelle (catalogue ~56 titres) ;
 * les images sont lazy-load (cf. TvSongGridCard).
 */
export default function TvSongGrid({ items, getArtwork, focusKeyFor, onSelect, onFocusSong, gridRef }) {
  const { ref, focusKey } = useFocusable({
    focusKey: 'CAT_GRID', trackChildren: true, saveLastFocusedChild: true,
  });

  const setRefs = (el) => {
    ref.current = el;
    if (gridRef) gridRef.current = el;
  };

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={setRefs} className="tvc-grid tvc-grid-scroll">
        {items.map((vm) => (
          <TvSongGridCard
            key={vm.id}
            vm={vm}
            focusKey={focusKeyFor(vm)}
            artSrc={getArtwork(vm)}
            onSelect={onSelect}
            onFocusSong={onFocusSong}
          />
        ))}
      </div>
    </FocusContext.Provider>
  );
}
