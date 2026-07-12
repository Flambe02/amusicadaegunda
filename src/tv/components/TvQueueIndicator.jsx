import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { ListMusic } from 'lucide-react';

/**
 * Indicateur de fila compact (coin droit de l'entête du catálogo) — focusable, OK
 * ouvre l'overlay de fila. Ne s'affiche que lorsqu'il est utile : une fila locale
 * non vide OU une session Festa active (cf. cahier des charges — jamais la fila
 * complète en permanence hors Festa).
 */
export default function TvQueueIndicator({ queueCount = 0, festaPeople = null, onOpen }) {
  const { ref, focused } = useFocusable({ focusKey: 'CAT_QUEUE_INDICATOR', onEnterPress: onOpen });
  const hasFesta = typeof festaPeople === 'number';
  if (!hasFesta && queueCount <= 0) return <div className="tvc-queue-indicator-spacer" />;

  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      aria-label="Abrir a fila de músicas"
      className={`tvc-queue-indicator ${focused ? 'is-focused' : ''}`}
    >
      {hasFesta && (
        <span className="tvc-queue-festa">Festa ativa · {festaPeople} {festaPeople === 1 ? 'pessoa' : 'pessoas'}</span>
      )}
      <span className="tvc-queue-count">
        <ListMusic size={17} /> Fila · {queueCount} {queueCount === 1 ? 'música' : 'músicas'}
      </span>
    </button>
  );
}
