import KaraokePlayer from '@/components/karaoke/KaraokePlayer';

/**
 * Écran karaoké TV — habillage mince : RÉUTILISE le lecteur karaoké existant
 * (sync LRC + YouTube IFrame, prompteur 3 lignes, balayage) via son mode `tvMode`
 * (←/→ = ±10 s, pas de gestion Escape interne — le Retour est géré par TvApp).
 */
export default function TvKaraokeScreen({ song, onClose, backInterceptorRef }) {
  return <KaraokePlayer song={song} tvMode onClose={onClose} backInterceptorRef={backInterceptorRef} />;
}
