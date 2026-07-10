import KaraokePlayer from '@/components/karaoke/KaraokePlayer';

/**
 * Écran karaoké TV — habillage mince : RÉUTILISE le lecteur karaoké existant
 * (sync LRC + YouTube IFrame, prompteur 3 lignes, balayage) via son mode `tvMode`
 * (←/→ = ±10 s, pas de gestion Escape interne — le Retour est géré par TvApp).
 *
 * `queueInfo`/`onNext`/`onEnded`/`handoff` : plomberie de fila DÉJÀ existante dans
 * KaraokePlayer (utilisée jusqu'ici seulement côté mobile), simplement transmise ici
 * pour le Modo Festa TV — aucune logique de fila dupliquée dans ce composant.
 */
export default function TvKaraokeScreen({
  song, onClose, backInterceptorRef, queueInfo, onNext, onEnded, handoff,
  applauseScore, tomatoScore, initialSessionOptions,
}) {
  return (
    <KaraokePlayer
      song={song}
      tvMode
      onClose={onClose}
      backInterceptorRef={backInterceptorRef}
      queueInfo={queueInfo}
      onNext={onNext}
      onEnded={onEnded}
      handoff={handoff}
      applauseScore={applauseScore}
      tomatoScore={tomatoScore}
      initialSessionOptions={initialSessionOptions}
    />
  );
}
