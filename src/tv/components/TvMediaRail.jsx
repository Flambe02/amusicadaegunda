import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { Mic, LayoutGrid } from 'lucide-react';

/**
 * Carte 16:9 d'une rangée de l'accueil v2 (affiche TV générée/generic — jamais la
 * vidéo verticale 9:16 réelle, cf. tvArtwork.js). Le focus déclenche `onFocusSong`
 * (débounce du hero, géré par TvHome) EN PLUS du recentrage dans la rangée ; OK
 * déclenche `onSelect` (comportement différent selon la rangée : ouvrir le
 * karaokê directement, ou ouvrir la fiche/lecture).
 */
function RailCard({ song, artSrc, showKaraokeBadge, badgeLabel, meta, onSelect, onFocusSong }) {
  const { ref, focused } = useFocusable({
    onEnterPress: () => onSelect(song),
    onFocus: () => {
      ref.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      onFocusSong?.(song);
    },
  });

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSelect(song)}
      aria-label={showKaraokeBadge ? `Cantar ${song.title} no karaokê` : `Assistir ao clipe de ${song.title}`}
      className={`tv2-rail-card ${focused ? 'is-focused' : ''}`}
    >
      <div className="tv2-rail-thumb">
        {artSrc
          ? <img src={artSrc} alt="" loading="lazy" decoding="async" />
          : <div className="tv2-rail-thumb-fallback" aria-hidden="true" />}
        {showKaraokeBadge && (
          <span className="tv2-rail-badge"><Mic size={13} /> KARAOKÊ</span>
        )}
        {!showKaraokeBadge && badgeLabel && (
          <span className="tv2-rail-badge tv2-rail-badge-nova">{badgeLabel}</span>
        )}
      </div>
      <span className="tv2-rail-title">{song.title}</span>
      {meta && <span className="tv2-rail-meta">{meta}</span>}
    </button>
  );
}

// Carte d'action de fin de rangée (ex. « Ver todos os karaokês ») — mêmes dimensions
// que les cartes chanson, focusable, jamais un simple élément décoratif.
function RailActionCard({ label, ariaLabel, icon: Icon = LayoutGrid, focusKey, onPress }) {
  const { ref, focused } = useFocusable({ focusKey, onEnterPress: onPress });
  return (
    <button
      ref={ref}
      type="button"
      onClick={onPress}
      aria-label={ariaLabel || label}
      className={`tv2-rail-action ${focused ? 'is-focused' : ''}`}
    >
      <Icon size={26} />
      <span>{label}</span>
    </button>
  );
}

export default function TvMediaRail({
  focusKey, title, subtitle, songs, getArtwork, getMeta, getBadge, variant = 'default', onSelect, onFocusSong, trailingAction,
}) {
  const { ref, focusKey: rowKey } = useFocusable({
    focusKey, trackChildren: true, saveLastFocusedChild: true,
  });

  if (!songs?.length && !trailingAction) return null;
  const isKaraoke = variant === 'karaoke';

  return (
    <FocusContext.Provider value={rowKey}>
      <section className="tv2-rail">
        <h2 className="tv2-rail-title-h">
          {title}
          {subtitle && <span className="tv2-rail-title-sub"> · {subtitle}</span>}
        </h2>
        <div ref={ref} className="tv2-rail-scroll">
          {songs.map((song) => (
            <RailCard
              key={song.id}
              song={song}
              artSrc={getArtwork(song)}
              showKaraokeBadge={isKaraoke}
              badgeLabel={getBadge ? getBadge(song) : null}
              meta={getMeta ? getMeta(song) : null}
              onSelect={onSelect}
              onFocusSong={onFocusSong}
            />
          ))}
          {trailingAction && (
            <RailActionCard
              focusKey={trailingAction.focusKey}
              label={trailingAction.label}
              ariaLabel={trailingAction.ariaLabel}
              icon={trailingAction.icon}
              onPress={trailingAction.onPress}
            />
          )}
        </div>
      </section>
    </FocusContext.Provider>
  );
}
