import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import TvCard from './TvCard';

/**
 * Rangée horizontale défilante façon Netflix. Chaque rangée est un contexte de
 * focus norigin (mémorise la dernière carte focalisée quand on revient).
 */
export default function TvRow({
  title, songs, getThumb, getCat, getHasKaraoke, onSelect, accent = false, focusKey, cardVariant = 'default',
}) {
  const { ref, focusKey: rowKey } = useFocusable({
    focusKey,
    trackChildren: true,
    saveLastFocusedChild: true,
  });

  if (!songs?.length) return null;

  return (
    <FocusContext.Provider value={rowKey}>
      <section className={`tv-row ${accent ? 'is-accent' : ''}`}>
        <h2 className="tv-row-title">{title}</h2>
        <div ref={ref} className="tv-row-scroll">
          {songs.map((song) => (
            <TvCard
              key={song.id}
              song={song}
              thumb={getThumb(song)}
              categoryLabel={getCat(song)}
              hasKaraoke={getHasKaraoke(song)}
              onSelect={onSelect}
              variant={cardVariant}
            />
          ))}
        </div>
      </section>
    </FocusContext.Provider>
  );
}
