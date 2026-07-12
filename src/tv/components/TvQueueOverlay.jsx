import { useEffect, useState } from 'react';
import { FocusContext, useFocusable, SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { X, Mic, Play } from 'lucide-react';
import FocusableButton from './FocusableButton';

function QueueRow({ item, index, onRemove }) {
  const { ref, focused } = useFocusable({
    focusKey: `CAT_QROW_${item.qid}`,
    onEnterPress: () => onRemove(item.qid),
    onFocus: () => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
  });
  return (
    <li className={`tvc-qrow ${focused ? 'is-focused' : ''}`}>
      <span className="tvc-qrow-pos">{index}</span>
      <span className="tvc-qrow-info">
        <span className="tvc-qrow-title">{item.title}</span>
        {item.singer && <span className="tvc-qrow-singer">{item.singer}</span>}
      </span>
      <button ref={ref} type="button" onClick={() => onRemove(item.qid)} aria-label={`Remover ${item.title} da fila`} className="tvc-qrow-remove">
        <X size={18} /> Remover
      </button>
    </li>
  );
}

/**
 * Overlay de fila : TOCANDO AGORA (1ère entrée) + PRÓXIMAS, retrait par entrée,
 * « Limpar fila » (confirmation en 2 temps), « Começar a cantar ». En session Festa,
 * la fila reflète les ajouts des téléphones via Supabase Realtime (géré en amont
 * par TvApp) et affiche le prénom du chanteur.
 */
export default function TvQueueOverlay({ queue, festaActive = false, onRemove, onClear, onStart, onClose, backInterceptorRef }) {
  const [confirmClear, setConfirmClear] = useState(false);
  const { ref, focusKey } = useFocusable({
    focusKey: 'CAT_QUEUE', trackChildren: true, saveLastFocusedChild: true,
  });

  useEffect(() => {
    const t = setTimeout(() => {
      try { SpatialNavigation.setFocus(queue.length ? 'CAT_QUEUE_START' : 'CAT_QUEUE_CLOSE'); } catch { /* ignore */ }
    }, 0);
    return () => clearTimeout(t);
  }, [queue.length]);

  useEffect(() => {
    if (!backInterceptorRef) return undefined;
    backInterceptorRef.current = () => { onClose(); return true; };
    return () => { if (backInterceptorRef) backInterceptorRef.current = null; };
  }, [backInterceptorRef, onClose]);

  const current = queue[0];
  const upcoming = queue.slice(1);

  return (
    <div className="tvc-overlay tvc-queue-overlay">
      <FocusContext.Provider value={focusKey}>
        <div ref={ref} className="tvc-queue-box">
          <div className="tvc-queue-head">
            <h2 className="tvc-queue-title">Fila de músicas</h2>
            {festaActive && <span className="tvc-queue-festa-badge">Festa ativa</span>}
          </div>

          {queue.length === 0 ? (
            <p className="tvc-queue-empty">A fila está vazia. Adicione músicas pelo catálogo.</p>
          ) : (
            <div className="tvc-queue-lists">
              <div className="tvc-queue-now">
                <span className="tvc-queue-section-h">Tocando agora</span>
                <div className="tvc-qrow tvc-qrow-now">
                  <Play size={18} className="tvc-qrow-nowicon" />
                  <span className="tvc-qrow-info">
                    <span className="tvc-qrow-title">{current.title}</span>
                    {current.singer && <span className="tvc-qrow-singer">{current.singer}</span>}
                  </span>
                </div>
              </div>
              {upcoming.length > 0 && (
                <div className="tvc-queue-next">
                  <span className="tvc-queue-section-h">Próximas</span>
                  <ul className="tvc-queue-ul">
                    {upcoming.map((item, i) => (
                      <QueueRow key={item.qid} item={item} index={i + 2} onRemove={onRemove} />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="tvc-queue-actions">
            <FocusableButton
              focusKey="CAT_QUEUE_START"
              className="tvc-queue-btn is-primary"
              ariaLabel="Começar a cantar a fila"
              onPress={onStart}
            >
              <Mic size={19} /> Começar a cantar
            </FocusableButton>
            {queue.length > 0 && (
              <FocusableButton
                focusKey="CAT_QUEUE_CLEAR"
                className="tvc-queue-btn is-danger"
                ariaLabel={confirmClear ? 'Confirmar limpar fila' : 'Limpar fila'}
                onPress={() => { if (confirmClear) { onClear(); setConfirmClear(false); } else setConfirmClear(true); }}
              >
                {confirmClear ? 'Confirmar?' : 'Limpar fila'}
              </FocusableButton>
            )}
            <FocusableButton
              focusKey="CAT_QUEUE_CLOSE"
              className="tvc-queue-btn"
              ariaLabel="Fechar a fila"
              onPress={onClose}
            >
              Fechar
            </FocusableButton>
          </div>
        </div>
      </FocusContext.Provider>
    </div>
  );
}
