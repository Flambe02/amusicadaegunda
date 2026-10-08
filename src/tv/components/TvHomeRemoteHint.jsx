import { useEffect, useState } from 'react';
import { shouldShowHomeHint } from '../lib/homeHintPref';

// Une fois que la télécommande a servi quelques fois, l'indice a fait son travail.
const HIDE_AFTER_KEYS = 5;
let decided = null; // une décision par lancement de l'app, pas par retour à l'accueil

/**
 * Indice télécommande de l'accueil, sur la TV seulement et aux premiers lancements
 * (non focusable). Il s'efface dès que la télécommande a été utilisée.
 */
export default function TvHomeRemoteHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (decided === null) decided = shouldShowHomeHint();
    if (!decided) return undefined;
    setVisible(true);
    let keys = 0;
    const onKey = () => {
      keys += 1;
      if (keys < HIDE_AFTER_KEYS) return;
      decided = false;
      setVisible(false);
      window.removeEventListener('keydown', onKey);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!visible) return null;
  return (
    <div className="bs-home-hint" aria-hidden="true">
      <span>Navegue com <span className="bs-home-hint-key">▲</span><span className="bs-home-hint-key">▼</span><span className="bs-home-hint-key">◀</span><span className="bs-home-hint-key">▶</span></span>
      <span className="bs-home-hint-sep">·</span>
      <span>Pressione <span className="bs-home-hint-key">OK</span></span>
    </div>
  );
}
