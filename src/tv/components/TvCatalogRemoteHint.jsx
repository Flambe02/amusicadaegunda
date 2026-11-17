import { useEffect, useState } from 'react';
import { getInterface } from '@/lib/interface';
import { catalogOpenCount, HINT_HIDE_AFTER } from '../lib/catalogHintPref';

/**
 * Indice des touches en bas du catálogo (non focusable). Masqué une fois que
 * l'utilisateur a ouvert le catálogo plusieurs fois (cf. catalogHintPref).
 *
 * Adapté à l'appareil (audit grand écran B11/D4, 2026-11-16) : touches de la
 * télécommande sur la TV, souris et clavier sur ordinateur (« OK » et « Voltar »
 * n'y existent pas).
 */
export default function TvCatalogRemoteHint() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(catalogOpenCount() <= HINT_HIDE_AFTER); }, []);
  if (!visible) return null;

  if (!getInterface().tv) {
    return (
      <div className="tvc-hint" aria-hidden="true">
        <span>Clique numa música para abrir a ficha</span>
        <span className="tvc-hint-sep">·</span>
        <span><span className="tvc-hint-key">← → ↑ ↓</span> e <span className="tvc-hint-key">Enter</span> também funcionam</span>
        <span className="tvc-hint-sep">·</span>
        <span><span className="tvc-hint-key">Esc</span> Voltar</span>
      </div>
    );
  }

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
