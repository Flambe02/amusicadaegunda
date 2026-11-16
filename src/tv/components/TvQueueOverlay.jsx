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

function QueueSection({ title, items, onRemove }) {
  return (
    <div className="tvc-queue-next">
      <span className="tvc-queue-section-h">{title}</span>
      <ul className="tvc-queue-ul">
        {items.map((item, i) => (
          <QueueRow key={item.qid} item={item} index={i + 1} onRemove={onRemove} />
        ))}
      </ul>
    </div>
  );
}

/**
 * Overlay de fila — liste EXACTEMENT ce que compte « Fila · N » (audit 2026-11-16, B3) :
 *   - hors Festa : la fila de la TV, numérotée à partir de 1 ;
 *   - en Festa : « Cantando agora » (si une música passe), puis « Próximas na Festa »
 *     (téléphones + ajouts faits sur la TV, avec le prénom), puis, s'il en reste, la
 *     fila locale d'avant la Festa.
 * « Começar a cantar » n'apparaît que s'il y a quelque chose à chanter ; « Limpar »
 * ne vide que la fila de la TV, jamais les choix des convidados.
 */
export default function TvQueueOverlay({
  queue, festaActive = false, festaQueue = [], festaNow = null,
  onRemove, onRemoveFesta, onClear, onStart, onClose, backInterceptorRef,
}) {
  const [confirmClear, setConfirmClear] = useState(false);
  const { ref, focusKey } = useFocusable({
    focusKey: 'CAT_QUEUE', trackChildren: true, saveLastFocusedChild: true,
  });
  const canStart = queue.length > 0 || festaQueue.length > 0;

  useEffect(() => {
    const t = setTimeout(() => {
      try { SpatialNavigation.setFocus(canStart ? 'CAT_QUEUE_START' : 'CAT_QUEUE_CLOSE'); } catch { /* ignore */ }
    }, 0);
    return () => clearTimeout(t);
  }, [canStart]);

  useEffect(() => {
    if (!backInterceptorRef) return undefined;
    backInterceptorRef.current = () => { onClose(); return true; };
    return () => { if (backInterceptorRef) backInterceptorRef.current = null; };
  }, [backInterceptorRef, onClose]);

  const nothing = !festaNow && !canStart;

  return (
    <div className="tvc-overlay tvc-queue-overlay">
      <FocusContext.Provider value={focusKey}>
        <div ref={ref} className="tvc-queue-box">
          <div className="tvc-queue-head">
            <h2 className="tvc-queue-title">Fila de músicas</h2>
            {festaActive && <span className="tvc-queue-festa-badge">Festa ativa</span>}
          </div>

          {nothing ? (
            <p className="tvc-queue-empty">
              {festaActive
                ? 'A fila está vazia. Os convidados escolhem pelo celular; aqui, use « Adicionar à fila » no painel do catálogo.'
                : 'A fila está vazia. No catálogo, escolha uma música e use « Adicionar à fila » no painel.'}
            </p>
          ) : (
            <div className="tvc-queue-lists">
              {festaNow && (
                <div className="tvc-queue-now">
                  <span className="tvc-queue-section-h">Cantando agora</span>
                  <div className="tvc-qrow tvc-qrow-now">
                    <Play size={18} className="tvc-qrow-nowicon" />
                    <span className="tvc-qrow-info">
                      <span className="tvc-qrow-title">{festaNow.title}</span>
                      {festaNow.singer && <span className="tvc-qrow-singer">{festaNow.singer}</span>}
                    </span>
                  </div>
                </div>
              )}
              {festaQueue.length > 0 && (
                <QueueSection title="Próximas na Festa" items={festaQueue} onRemove={onRemoveFesta} />
              )}
              {queue.length > 0 && (
                <QueueSection title={festaActive ? 'Fila desta TV (antes da Festa)' : 'Na fila'} items={queue} onRemove={onRemove} />
              )}
            </div>
          )}

          <div className="tvc-queue-actions">
            {canStart && (
              <FocusableButton
                focusKey="CAT_QUEUE_START"
                className="tvc-queue-btn is-primary"
                ariaLabel="Começar a cantar a fila"
                onPress={onStart}
              >
                <Mic size={19} /> Começar a cantar
              </FocusableButton>
            )}
            {queue.length > 0 && (
              <FocusableButton
                focusKey="CAT_QUEUE_CLEAR"
                className="tvc-queue-btn is-danger"
                ariaLabel={confirmClear ? 'Confirmar limpar fila' : 'Limpar fila'}
                onPress={() => { if (confirmClear) { onClear(); setConfirmClear(false); } else setConfirmClear(true); }}
              >
                {confirmClear ? 'Confirmar?' : festaActive ? 'Limpar fila da TV' : 'Limpar fila'}
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
