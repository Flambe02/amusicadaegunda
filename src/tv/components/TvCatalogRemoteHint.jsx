import { useEffect, useState } from 'react';
import { catalogOpenCount, HINT_HIDE_AFTER } from '../lib/catalogHintPref';

/**
 * Indice télécommande minimal en bas d'écran (non focusable). Masqué une fois que
 * l'utilisateur a ouvert le catálogo plusieurs fois (cf. catalogHintPref).
 */
export default function TvCatalogRemoteHint() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(catalogOpenCount() <= HINT_HIDE_AFTER); }, []);
  if (!visible) return null;

  return (
    <div className="tvc-hint" aria-hidden="true">
      <span><span className="tvc-hint-key">OK</span> Abrir ficha</span>
      <span className="tvc-hint-sep">·</span>
      {/* ▶ déplace la sélection ; depuis la dernière colonne, il atteint le panneau
          (Cantar agora, Adicionar à fila). Avant : « ▶ Adicionar à fila », faux (B2). */}
      <span><span className="tvc-hint-key">▶</span> Até o painel: cantar ou pôr na fila</span>
      <span className="tvc-hint-sep">·</span>
      <span><span className="tvc-hint-key">Voltar</span> Sair</span>
    </div>
  );
}
