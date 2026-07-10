import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { BRAND_SQUARE_LARGE } from '@/lib/imageAssets';

/**
 * Cadre de téléphone stylisé pour la vidéo verticale (9:16) de la fiche chanson TV.
 * Composant purement PRÉSENTATIONNEL : il ne déclenche jamais lui-même la lecture
 * (le focus/l'action restent sur le bouton « Assistir ao clipe » de TvSongDetail — pas
 * d'icône play redondante ici, un seul call-to-action clair) et ne possède aucune
 * logique de contrôle du lecteur — il reçoit `hostRef` (div de montage du YT.Player,
 * créé/détruit par le parent) et `progressRef` (span de progression, mis à jour par
 * mutation directe du parent, sans re-render).
 *
 * Avant lecture : simple miniature. Pendant lecture : le parent monte l'iframe
 * YouTube dans `hostRef`. Si la vidéo est bloquée (embedding désactivé, API en échec…),
 * on retombe sur la miniature + un message discret plutôt qu'un spinner infini.
 */
export default function TvPhoneFrame({ thumb, playing, loading, error, hostRef, progressRef }) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const showThumbFallback = !playing || (playing && error);

  return (
    <div className="tv-phoneframe-wrap">
      <div className="tv-phoneframe-glow" aria-hidden="true" />
      <div className="tv-phoneframe">
        <div className="tv-phoneframe-notch" aria-hidden="true" />
        <div className="tv-phoneframe-screen">
          {showThumbFallback ? (
            <>
              {thumb && !thumbFailed ? (
                <img
                  src={thumb}
                  alt=""
                  className="tv-phoneframe-thumb"
                  onError={() => setThumbFailed(true)}
                />
              ) : (
                <div className="tv-phoneframe-fallback">
                  <img src={BRAND_SQUARE_LARGE} alt="" />
                </div>
              )}
              {error && playing && (
                <p className="tv-phoneframe-error">Vídeo indisponível para reprodução aqui.</p>
              )}
            </>
          ) : (
            <>
              <div ref={hostRef} className="tv-phoneframe-player" />
              {loading && (
                <span className="tv-phoneframe-loading"><Loader2 size={34} className="tv-spin" /></span>
              )}
              <div className="tv-phoneframe-progress"><span ref={progressRef} /></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
