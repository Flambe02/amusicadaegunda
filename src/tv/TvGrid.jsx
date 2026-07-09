import { useEffect } from 'react';
import { FocusContext, useFocusable, SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import TvCard from './components/TvCard';

/**
 * Écran « résultats » — grille de chansons filtrées (catégorie, mês, catálogo).
 * Le Retour est géré par TvApp. Focus initial sur la 1ère carte.
 */
export default function TvGrid({ title, songs, getThumb, getCat, getHasKaraoke, onSelect }) {
  const { ref, focusKey } = useFocusable({ focusKey: 'GRID', trackChildren: true, saveLastFocusedChild: true });

  useEffect(() => {
    const t = setTimeout(() => { try { SpatialNavigation.setFocus('GRID'); } catch { /* ignore */ } }, 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <FocusContext.Provider value={focusKey}>
      <div className="tv-grid-screen">
        <h1 className="tv-grid-title">{title}</h1>
        {songs.length === 0 ? (
          <p className="tv-grid-empty">Nenhuma paródia aqui ainda.</p>
        ) : (
          <div ref={ref} className="tv-grid">
            {songs.map((song) => (
              <TvCard
                key={song.id}
                song={song}
                thumb={getThumb(song)}
                categoryLabel={getCat(song)}
                hasKaraoke={getHasKaraoke(song)}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </FocusContext.Provider>
  );
}
