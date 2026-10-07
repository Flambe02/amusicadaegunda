import { lazy, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Song } from '@/api/entities';
import { useFullSong } from '@/hooks/useFullSong';

// Le lecteur karaokê (≈ 27 Ko compressés avec la détection de hauteur et ses styles) ne
// sert pas au premier écran : chargé à la demande, et demandé d'avance par TvApp une
// fois l'accueil affiché. En attendant, le <Suspense> de TvApp montre l'indice d'attente.
const loadKaraokePlayer = () => import('@/components/karaoke/KaraokePlayer');
const KaraokePlayer = lazy(loadKaraokePlayer);
export const preloadKaraokePlayer = loadKaraokePlayer;

/**
 * Écran karaoké TV — habillage mince : RÉUTILISE le lecteur karaoké existant
 * (sync LRC + YouTube IFrame, prompteur 3 lignes, balayage) via son mode `tvMode`
 * (←/→ = ±10 s, pas de gestion Escape interne — le Retour est géré par TvApp).
 *
 * `queueInfo`/`onNext`/`onEnded`/`handoff` : plomberie de fila DÉJÀ existante dans
 * KaraokePlayer (utilisée jusqu'ici seulement côté mobile), simplement transmise ici
 * pour le Modo Festa TV — aucune logique de fila dupliquée dans ce composant.
 *
 * Les chansons de l'interface grand écran sont des RÉSUMÉS (sans LRC ni timing par
 * mot) : la chanson complète se charge ici, une fois par session (Song.getFull), et la
 * suivante de la fila est demandée d'avance. Le lecteur n'est monté qu'avec la chanson
 * complète ; un échec le dit et propose de réessayer (Voltar = Retour de TvApp).
 */
export default function TvKaraokeScreen({
  song, nextSong = null, onClose, backInterceptorRef, queueInfo, onNext, onEnded, handoff,
  applauseScore, tomatoScore, remoteEnergyLevel, remoteEnergyGrade, initialSessionOptions,
}) {
  const { song: fullSong, isLoading, error, retry } = useFullSong(song);
  const retryRef = useRef(null);

  useEffect(() => {
    if (nextSong) Song.getFull(nextSong).catch(() => { /* redemandée à son tour */ });
  }, [nextSong]);
  // La navigation spatiale est en pause sur cet écran : focus natif sur le seul bouton.
  useEffect(() => { if (error) retryRef.current?.focus?.({ preventScroll: true }); }, [error]);

  if (error) {
    return (
      <div className="tv-karaoke-wait" role="alert">
        <p className="tv-karaoke-wait-title">Não foi possível carregar o karaokê</p>
        <p>Verifique a conexão e tente de novo.</p>
        <button ref={retryRef} type="button" className="tv-karaoke-wait-retry" onClick={retry}>
          Tentar novamente
        </button>
      </div>
    );
  }
  if (isLoading) {
    // Rien pendant 400 ms (tv-wait) : la chanson complète arrive le plus souvent avant.
    return (
      <div className="tv-karaoke-wait tv-wait" role="status" aria-label="A preparar o palco…">
        <span><Loader2 className="tv-spin" size={44} /></span>
        <p>A preparar o palco…</p>
      </div>
    );
  }

  return (
    <KaraokePlayer
      song={fullSong}
      tvMode
      onClose={onClose}
      backInterceptorRef={backInterceptorRef}
      queueInfo={queueInfo}
      onNext={onNext}
      onEnded={onEnded}
      handoff={handoff}
      applauseScore={applauseScore}
      tomatoScore={tomatoScore}
      remoteEnergyLevel={remoteEnergyLevel}
      remoteEnergyGrade={remoteEnergyGrade}
      initialSessionOptions={initialSessionOptions}
    />
  );
}
