/**
 * Skeleton de chargement — mêmes dimensions que les vraies cartes (jamais un spinner
 * plein écran, cf. cahier des charges). 8 cartes = 2 rangées de 4.
 */
export default function TvCatalogSkeleton({ count = 8 }) {
  return (
    <div className="tvc-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="tvc-card tvc-card-skeleton">
          <div className="tvc-card-media tvc-skeleton-shimmer" />
          <div className="tvc-card-body">
            <span className="tvc-skeleton-line tvc-skeleton-shimmer" style={{ width: '85%' }} />
            <span className="tvc-skeleton-line tvc-skeleton-shimmer" style={{ width: '55%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
